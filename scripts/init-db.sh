#!/usr/bin/env bash
###############################################################################
# init-db.sh - Initialize the Worthy database schema on GCP Cloud SQL
###############################################################################
#
# USAGE:
#   1. Ensure you have authenticated with GCP:
#        CLOUDSDK_PYTHON=/usr/bin/python3.11 gcloud auth login
#   2. Set the TARGET_PASSWORD variable below (or use .pgpass / IAM auth).
#   3. Run the script:
#        chmod +x init-db.sh
#        ./init-db.sh
#
# WHAT THIS SCRIPT DOES:
#   - Starts Cloud SQL Proxy in the background (the DB has no public IP)
#   - Connects to the Cloud SQL PostgreSQL instance
#   - Creates all Worthy application tables from scratch
#   - Intended for fresh deployments with no existing data
#
# TABLES CREATED:
#   1. users             - User accounts and preferences
#   2. assets            - Investment holdings (stocks, ETFs, bonds, CDs, cash)
#   3. transactions      - Buy/sell/dividend transaction history
#   4. recurring_investments - Automated recurring investment plans
#   5. fire_profile      - FIRE (Financial Independence) goals and parameters
#   6. password_reset_tokens - Password reset flow tokens
#   7. dividends         - Dividend tracking and reinvestment
#
###############################################################################

set -euo pipefail

# ---------------------------------------------------------------------------
# TARGET DATABASE (GCP Cloud SQL)
# ---------------------------------------------------------------------------
TARGET_HOST="127.0.0.1"
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
PROXY_PID=""

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
}

trap cleanup EXIT

run_sql() {
  export PGPASSWORD="${TARGET_PASSWORD}"
  psql \
    -h "${TARGET_HOST}" \
    -p "${TARGET_PORT}" \
    -U "${TARGET_USER}" \
    -d "${TARGET_DB}" \
    -v ON_ERROR_STOP=1 \
    "$@"
  unset PGPASSWORD
}

# ---------------------------------------------------------------------------
# STEP 1: Start Cloud SQL Proxy
# ---------------------------------------------------------------------------
start_proxy() {
  log "=== Starting Cloud SQL Proxy ==="

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
# STEP 2: Create schema
# ---------------------------------------------------------------------------
create_schema() {
  log "=== Creating Worthy database schema ==="

  run_sql <<'SQL'
-- =========================================================================
-- 1. USERS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    birth_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 2. ASSETS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS assets (
    asset_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('Stock', 'ETF', 'Bond', 'Cash', 'Other')),
    total_shares DECIMAL(15,4) NOT NULL DEFAULT 0,
    average_cost_basis DECIMAL(10,4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    interest_rate DECIMAL(5,4),
    maturity_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 3. TRANSACTIONS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('LumpSum', 'Recurring', 'Initialization', 'Dividend')),
    transaction_date DATE NOT NULL,
    shares DECIMAL(15,4) NOT NULL,
    price_per_share DECIMAL(10,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 4. RECURRING INVESTMENTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS recurring_investments (
    recurring_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    start_date DATE NOT NULL,
    next_run_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique index to prevent duplicate active recurring investments
CREATE UNIQUE INDEX IF NOT EXISTS recurring_investments_unique_active
    ON recurring_investments (user_id, ticker_symbol, amount, currency, frequency, start_date)
    WHERE is_active = true;

-- =========================================================================
-- 5. FIRE PROFILE TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS fire_profile (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    annual_expenses DECIMAL(15,2),
    safe_withdrawal_rate DECIMAL(5,4) DEFAULT 0.04,
    expected_annual_return DECIMAL(5,4) DEFAULT 0.07,
    target_retirement_age INTEGER,
    barista_monthly_contribution DECIMAL(15,2) DEFAULT 0,
    barista_annual_income DECIMAL(15,2) DEFAULT 0,
    barista_income_currency VARCHAR(3) DEFAULT 'USD',
    annual_income DECIMAL(15,2) DEFAULT 1000000,
    annual_savings DECIMAL(15,2) DEFAULT 200000,
    expected_return_pre_retirement DECIMAL(5,4) DEFAULT 0.07,
    expected_return_post_retirement DECIMAL(5,4) DEFAULT 0.05,
    expected_inflation_rate DECIMAL(5,4) DEFAULT 0.025,
    other_passive_income DECIMAL(15,2) DEFAULT 0,
    effective_tax_rate DECIMAL(5,4) DEFAULT 0.15,
    inflation_rate DECIMAL(5,4) DEFAULT 0.025,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 6. PASSWORD RESET TOKENS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 7. DIVIDENDS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS dividends (
    dividend_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    ex_dividend_date DATE NOT NULL,
    payment_date DATE,
    dividend_per_share DECIMAL(10,4) NOT NULL,
    total_dividend_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    dividend_type VARCHAR(20) DEFAULT 'regular',
    is_reinvested BOOLEAN DEFAULT FALSE,
    reinvest_asset_id INTEGER REFERENCES assets(asset_id),
    cash_asset_id INTEGER REFERENCES assets(asset_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SQL

  log "Schema creation complete."
}

# ---------------------------------------------------------------------------
# STEP 3: Verify tables exist
# ---------------------------------------------------------------------------
verify_tables() {
  log "=== Verifying tables ==="

  local expected_tables=(
    "users"
    "assets"
    "transactions"
    "recurring_investments"
    "fire_profile"
    "password_reset_tokens"
    "dividends"
  )

  local all_ok=true

  printf "%-30s %s\n" "TABLE" "STATUS"
  printf "%-30s %s\n" "-----" "------"

  for table in "${expected_tables[@]}"; do
    exists=$(run_sql -tAc \
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}');" \
      2>/dev/null)
    if [[ "${exists}" == "t" ]]; then
      printf "%-30s %s\n" "${table}" "OK"
    else
      printf "%-30s %s\n" "${table}" "MISSING"
      all_ok=false
    fi
  done

  echo ""
  if [[ "${all_ok}" == true ]]; then
    log "All tables created successfully."
  else
    log "ERROR: Some tables are missing. Check the output above."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
main() {
  log "Initializing Worthy database schema on GCP Cloud SQL"
  log "Instance: ${CLOUD_SQL_INSTANCE}"
  log "Database: ${TARGET_DB}"
  echo ""

  start_proxy
  create_schema
  verify_tables

  log "Database initialization complete."
}

main "$@"
