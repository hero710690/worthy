# Cloud Storage bucket for frontend static files
resource "google_storage_bucket" "frontend" {
  name     = "${var.project_id}-worthy-frontend-${var.environment}"
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html" # SPA routing
  }

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis]
}

# Grant Cloud CDN service account access to read objects
# (allUsers blocked by org policy, so we use the LB service account instead)
resource "google_storage_bucket_iam_member" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Backend bucket for Cloud CDN
resource "google_compute_backend_bucket" "frontend" {
  name        = "worthy-frontend-backend-${var.environment}"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    max_ttl                      = 86400
    serve_while_stale            = 86400
    signed_url_cache_max_age_sec = 0
  }
}

# URL map for the load balancer
resource "google_compute_url_map" "frontend" {
  name            = "worthy-frontend-urlmap-${var.environment}"
  default_service = google_compute_backend_bucket.frontend.id
}

# HTTPS proxy (using HTTP for now; add SSL cert for production)
resource "google_compute_target_http_proxy" "frontend" {
  name    = "worthy-frontend-proxy-${var.environment}"
  url_map = google_compute_url_map.frontend.id
}

# Global forwarding rule
resource "google_compute_global_forwarding_rule" "frontend" {
  name       = "worthy-frontend-rule-${var.environment}"
  target     = google_compute_target_http_proxy.frontend.id
  port_range = "80"
  ip_address = google_compute_global_address.frontend.address
}
