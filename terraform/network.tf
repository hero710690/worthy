# VPC Network
resource "google_compute_network" "worthy" {
  name                    = "worthy-vpc-${var.environment}"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

# Private subnet for Cloud SQL and Cloud Run (Direct VPC Egress)
resource "google_compute_subnetwork" "private" {
  name          = "worthy-private-${var.environment}"
  ip_cidr_range = "10.0.11.0/24"
  region        = var.region
  network       = google_compute_network.worthy.id

  private_ip_google_access = true
}

# Allow internal traffic within VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "worthy-allow-internal-${var.environment}"
  network = google_compute_network.worthy.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = ["10.0.0.0/16"]
}

# Cloud Router and NAT for outbound internet (external API calls)
resource "google_compute_router" "worthy" {
  name    = "worthy-router-${var.environment}"
  region  = var.region
  network = google_compute_network.worthy.id
}

resource "google_compute_router_nat" "worthy" {
  name                               = "worthy-nat-${var.environment}"
  router                             = google_compute_router.worthy.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
