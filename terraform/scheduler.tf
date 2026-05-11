# Cloud Scheduler job for recurring investments batch processing
# Replaces AWS EventBridge rule that triggered Lambda daily at 9:30 AM EST (weekdays)

resource "google_cloud_scheduler_job" "recurring_investments" {
  name        = "worthy-recurring-investments-${var.environment}"
  description = "Trigger recurring investments batch processing (weekdays at 9:30 AM EST)"
  region      = var.region
  schedule    = "30 14 * * 1-5" # 14:30 UTC = 9:30 AM EST, Monday-Friday
  time_zone   = "America/New_York"

  attempt_deadline = "60s"

  retry_config {
    retry_count = 3
  }

  http_target {
    uri         = "${google_cloud_run_v2_service.worthy_backend.uri}/batch/recurring-investments"
    http_method = "POST"

    oidc_token {
      service_account_email = google_service_account.cloud_run.email
      audience              = google_cloud_run_v2_service.worthy_backend.uri
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloud_scheduler_job" "portfolio_snapshot" {
  name        = "worthy-portfolio-snapshot-${var.environment}"
  description = "Take daily portfolio snapshots for all users (every day at 9 PM JST)"
  region      = var.region
  schedule    = "0 12 * * *"
  time_zone   = "UTC"

  attempt_deadline = "300s"

  retry_config {
    retry_count = 3
  }

  http_target {
    uri         = "${google_cloud_run_v2_service.worthy_backend.uri}/batch/portfolio-snapshot"
    http_method = "POST"
    body        = base64encode("{}")

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.cloud_run.email
      audience              = google_cloud_run_v2_service.worthy_backend.uri
    }
  }

  depends_on = [google_project_service.apis]
}

# Grant the Cloud Run service account permission to invoke the Cloud Run service
# Required for Cloud Scheduler OIDC authentication to work
resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  name     = google_cloud_run_v2_service.worthy_backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_run.email}"
}
