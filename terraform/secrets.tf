# Secret Manager secrets for application credentials

# Database URL
resource "google_secret_manager_secret" "database_url" {
  secret_id = "worthy-database-url-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${var.db_username}:${var.db_password}@${google_sql_database_instance.worthy.private_ip_address}:5432/worthy"
}

# JWT Secret
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "worthy-jwt-secret-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# Alpha Vantage API Key
resource "google_secret_manager_secret" "alpha_vantage_api_key" {
  secret_id = "worthy-alpha-vantage-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "alpha_vantage_api_key" {
  secret      = google_secret_manager_secret.alpha_vantage_api_key.id
  secret_data = var.alpha_vantage_api_key
}

# Exchange Rate API Key
resource "google_secret_manager_secret" "exchange_rate_api_key" {
  secret_id = "worthy-exchange-rate-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "exchange_rate_api_key" {
  secret      = google_secret_manager_secret.exchange_rate_api_key.id
  secret_data = var.exchange_rate_api_key
}

# Finnhub API Key
resource "google_secret_manager_secret" "finnhub_api_key" {
  secret_id = "worthy-finnhub-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "finnhub_api_key" {
  secret      = google_secret_manager_secret.finnhub_api_key.id
  secret_data = var.finnhub_api_key
}

# Polygon API Key
resource "google_secret_manager_secret" "polygon_api_key" {
  secret_id = "worthy-polygon-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "polygon_api_key" {
  secret      = google_secret_manager_secret.polygon_api_key.id
  secret_data = var.polygon_api_key
}

# IAM: Allow Cloud Run service account to access secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each = toset([
    google_secret_manager_secret.database_url.secret_id,
    google_secret_manager_secret.jwt_secret.secret_id,
    google_secret_manager_secret.alpha_vantage_api_key.secret_id,
    google_secret_manager_secret.exchange_rate_api_key.secret_id,
    google_secret_manager_secret.finnhub_api_key.secret_id,
    google_secret_manager_secret.polygon_api_key.secret_id,
  ])

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Service account for Cloud Run (created here, used in Phase 2)
resource "google_service_account" "cloud_run" {
  account_id   = "worthy-cloud-run-${var.environment}"
  display_name = "Worthy Cloud Run Service Account"
}
