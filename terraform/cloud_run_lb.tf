# Load Balancer in front of Cloud Run to bypass allUsers org policy restriction
# The LB accepts public traffic and forwards to Cloud Run via serverless NEG

# Serverless NEG pointing to Cloud Run
resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "worthy-backend-neg-${var.environment}"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.worthy_backend.name
  }
}

# Backend service
resource "google_compute_backend_service" "backend" {
  name                  = "worthy-backend-service-${var.environment}"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL"

  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }
}

# Reserve a global IP for the API load balancer
resource "google_compute_global_address" "backend_api" {
  name = "worthy-backend-ip-${var.environment}"
}

# URL map
resource "google_compute_url_map" "backend" {
  name            = "worthy-backend-urlmap-${var.environment}"
  default_service = google_compute_backend_service.backend.id
}

# HTTP proxy
resource "google_compute_target_http_proxy" "backend" {
  name    = "worthy-backend-proxy-${var.environment}"
  url_map = google_compute_url_map.backend.id
}

# Forwarding rule
resource "google_compute_global_forwarding_rule" "backend" {
  name       = "worthy-backend-rule-${var.environment}"
  target     = google_compute_target_http_proxy.backend.id
  port_range = "80"
  ip_address = google_compute_global_address.backend_api.address
}

output "backend_api_ip" {
  description = "Backend API load balancer IP (public, no auth required)"
  value       = google_compute_global_address.backend_api.address
}
