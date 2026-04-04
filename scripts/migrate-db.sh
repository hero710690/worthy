#!/usr/bin/env bash
###############################################################################
# migrate-db.sh - Migrate data from AWS RDS PostgreSQL to GCP Cloud SQL
###############################################################################
#
# USAGE:
#   1. Fill in the SOURCE_* variables below with your AWS RDS connection details.
#   2. Ensure you have the following tools installed:
#      - pg_dump and pg_restore (PostgreSQL client tools)
#      - gcloud CLI (at /home/participant/google-cloud-sdk/bin/gcloud)
#      - cloud-sql-proxy (installed or downloadable)
#   3. Authenticate with GCP:
#        CLOUDSDK_PYTHON=/usr/bin/python3.11 gcloud auth login
#   4. Run the script:
#        chmod +x migrate-db.sh
#        ./migrate-db.sh
#
# WHAT THIS SCRIPT DOES:
#   a. Starts Cloud SQL Proxy in the background (the DB has no public IP)
#   b. Runs pg_dump against the source AWS RDS database (schema + data)
#   c. Runs pg_restore into the Cloud SQL target via the proxy
#   d. Verifies row counts match between source and target
#
# TABLES MIGRATED:
#   users, assets, transactions, recurring_investments, fire_profile,
#   dividends, password_reset_tokens
#
###############################################################################

set -euo pipefail

# ---------------------------------------------------------------------------
# SOURCE DATABASE (AWS RDS) - FILL THESE IN
# ---------------------------------------------------------------------------
SOURCE_HOST="your-rds-endpoint.region.rds.amazonaws.com"
SOURCE_PORT="5432"
SOURCE_DB="worthy"
SOURCE_USER="your_rds_username"
SOURCE_PASSWORD="your_rds_password"   # or use PGPASSWORD / .pgpass

# ---------------------------------------------------------------------------
# TARGET DATABASE (GCP Cloud SQL)
# ---------------------------------------------------------------------------
TARGET_HOST="127.0.0.1"              # Cloud SQL Proxy listens on localhost
TARGET_PORT="5432"
TARGET_DB="worthy"
TARGET_USER="worthy_admin"
TARGET_PASSWORD=""                    # Set this or use .pgpass / IAM auth

CLOUD_SQL_INSTANCE="jean-project-492204:asia-northeast1:worthy-db-production"

# ---------------------------------------------------------------------------
# PATHS & CONFIG
# ---------------------------------------------------------------------------
GCLOUD="/home/participant/google-cloud-sdk/bin/gcloud"
export CLOUDSDK_PYTHON=/usr/bin/python3.11
DUMP_FILE="/tmp/worthy_migration_$(date +%Y%m%d_%H%M%S).dump"
PROXY_PID=""

TABLES=(
  "users"
  "assets"
  "transactions"
  "recurring_investments"
  "fire_profile"
  "dividends"
  "password_reset_tokens"
)

# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
  log "Cleaning up..."
  if [[ -n "${PROXY_PID}" ]] && kill -0 "${PROXY_PID}" 2>/dev/null; then
    log "Stopping Cloud SQL Proxy (PID ${PROXY_PID})..."
    kill "${PROXY_PID}" 2>/dev/null || true
    wait "${PROXY_PID}" 2>/dev/null || true
  fi
  if [[ -f "${DUMP_FILE}" ]]; then
    log "Removing dump file: ${DUMP_FILE}"
    rm -f "${DUMP_FILE}"
  fi
}

trap cleanup EXIT

# ---------------------------------------------------------------------------
# STEP 1: Start Cloud SQL Proxy
# ---------------------------------------------------------------------------
start_proxy() {
  log "=== STEP 1: Starting Cloud SQL Proxy ==="

  # Check if cloud-sql-proxy binary exists; fall back to gcloud
  if command -v cloud-sql-proxy &>/dev/null; then
    log "Using cloud-sql-proxy binary..."
    cloud-sql-proxy "${CLOUD_SQL_INSTANCE}" \
      --port="${TARGET_PORT}" &
    PROXY_PID=$!
  elif command -v cloud_sql_proxy &>/dev/null; then
    log "Using cloud_sql_proxy binary..."
    cloud_sql_proxy -instances="${CLOUD_SQL_INSTANCE}=tcp:${TARGET_PORT}" &
    PROXY_PID=$!
  else
    log "No cloud-sql-proxy binary found. Attempting download..."
    curl -o /tmp/cloud-sql-proxy \
      "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.1/cloud-sql-proxy.linux.amd64"
    chmod +x /tmp/cloud-sql-proxy
    /tmp/cloud-sql-proxy "${CLOUD_SQL_INSTANCE}" \
      --port="${TARGET_PORT}" &
    PROXY_PID=$!
  fi

  # Wait for proxy to become ready
  log "Waiting for Cloud SQL Proxy to start (PID ${PROXY_PID})..."
  for i in $(seq 1 15); do
    if pg_isready -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" &>/dev/null; then
      log "Cloud SQL Proxy is ready."
      return 0
    fi
    sleep 1
  done

  log "ERROR: Cloud SQL Proxy did not become ready within 15 seconds."
  exit 1
}

# ---------------------------------------------------------------------------
# STEP 2: pg_dump from source RDS
# ---------------------------------------------------------------------------
dump_source() {
  log "=== STEP 2: Dumping source database from AWS RDS ==="

  local table_args=""
  for table in "${TABLES[@]}"; do
    table_args="${table_args} -t ${table}"
  done

  export PGPASSWORD="${SOURCE_PASSWORD}"
  # shellcheck disable=SC2086
  pg_dump \
    -h "${SOURCE_HOST}" \
    -p "${SOURCE_PORT}" \
    -U "${SOURCE_USER}" \
    -d "${SOURCE_DB}" \
    -Fc \
    --no-owner \
    --no-privileges \
    ${table_args} \
    -f "${DUMP_FILE}"
  unset PGPASSWORD

  local dump_size
  dump_size=$(du -h "${DUMP_FILE}" | cut -f1)
  log "Dump complete: ${DUMP_FILE} (${dump_size})"
}

# ---------------------------------------------------------------------------
# STEP 3: pg_restore into Cloud SQL
# ---------------------------------------------------------------------------
restore_target() {
  log "=== STEP 3: Restoring into Cloud SQL ==="

  export PGPASSWORD="${TARGET_PASSWORD}"
  pg_restore \
    -h "${TARGET_HOST}" \
    -p "${TARGET_PORT}" \
    -U "${TARGET_USER}" \
    -d "${TARGET_DB}" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    "${DUMP_FILE}" || {
      # pg_restore returns non-zero on warnings (e.g., "table does not exist" during --clean)
      log "WARNING: pg_restore returned non-zero exit code. This may be normal if some tables did not previously exist."
    }
  unset PGPASSWORD

  log "Restore complete."
}

# ---------------------------------------------------------------------------
# STEP 4: Verify row counts
# ---------------------------------------------------------------------------
verify_counts() {
  log "=== STEP 4: Verifying row counts ==="

  local all_match=true

  printf "%-30s %10s %10s %s\n" "TABLE" "SOURCE" "TARGET" "STATUS"
  printf "%-30s %10s %10s %s\n" "-----" "------" "------" "------"

  for table in "${TABLES[@]}"; do
    # Source count
    export PGPASSWORD="${SOURCE_PASSWORD}"
    source_count=$(psql \
      -h "${SOURCE_HOST}" \
      -p "${SOURCE_PORT}" \
      -U "${SOURCE_USER}" \
      -d "${SOURCE_DB}" \
      -tAc "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "N/A")
    unset PGPASSWORD

    # Target count
    export PGPASSWORD="${TARGET_PASSWORD}"
    target_count=$(psql \
      -h "${TARGET_HOST}" \
      -p "${TARGET_PORT}" \
      -U "${TARGET_USER}" \
      -d "${TARGET_DB}" \
      -tAc "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "N/A")
    unset PGPASSWORD

    if [[ "${source_count}" == "${target_count}" ]]; then
      status="OK"
    else
      status="MISMATCH"
      all_match=false
    fi

    printf "%-30s %10s %10s %s\n" "${table}" "${source_count}" "${target_count}" "${status}"
  done

  echo ""
  if [[ "${all_match}" == true ]]; then
    log "All row counts match. Migration verified successfully."
  else
    log "WARNING: Some row counts do not match. Please investigate."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
main() {
  log "Starting Worthy database migration: AWS RDS -> GCP Cloud SQL"
  log "Instance: ${CLOUD_SQL_INSTANCE}"
  echo ""

  # Validate that source credentials have been set
  if [[ "${SOURCE_HOST}" == "your-rds-endpoint.region.rds.amazonaws.com" ]]; then
    log "ERROR: Please fill in the SOURCE_* variables at the top of this script."
    exit 1
  fi

  start_proxy
  dump_source
  restore_target
  verify_counts

  log "Migration complete."
}

main "$@"
