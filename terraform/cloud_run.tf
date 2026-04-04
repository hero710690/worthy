# Cloud Run service for Worthy backend API

resource "google_cloud_run_v2_service" "worthy_backend" {
  name     = "worthy-backend-${var.environment}"
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 4
    }

    vpc_access {
      connector = google_vpc_access_connector.worthy.id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/worthy-${var.environment}/worthy-backend:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        tcp_socket {
          port = 8080
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 5
        timeout_seconds       = 3
      }

      # Environment variable: ENVIRONMENT
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      # Secret Manager references
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "ALPHA_VANTAGE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.alpha_vantage_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "EXCHANGE_RATE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.exchange_rate_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REACT_APP_FINNHUB_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.finnhub_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REACT_APP_POLYGON_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.polygon_api_key.secret_id
            version = "latest"
          }
        }
      }
    }

    timeout = "30s"
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.jwt_secret,
    google_secret_manager_secret_version.alpha_vantage_api_key,
    google_secret_manager_secret_version.exchange_rate_api_key,
    google_secret_manager_secret_version.finnhub_api_key,
    google_secret_manager_secret_version.polygon_api_key,
  ]
}

# Note: allUsers IAM binding is blocked by org policy.
# Use Cloud Run ingress setting instead, or set up a load balancer with IAP.
# The service URL will require authentication via Google Identity by default.
