# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "worthy" {
  name             = "worthy-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-f1-micro" # Equivalent to db.t3.micro
    availability_type = "ZONAL"       # Single zone (matching Multi-AZ: false)
    disk_size         = 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false # No public IP
      private_network = google_compute_network.worthy.id
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00" # Matching AWS backup window
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4 # 04:00 UTC
      update_track = "stable"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
  }

  deletion_protection = true

  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_vpc,
  ]
}

# Private services access for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "worthy-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.worthy.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.worthy.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Database
resource "google_sql_database" "worthy" {
  name     = "worthy"
  instance = google_sql_database_instance.worthy.name
}

# Database user
resource "google_sql_user" "worthy_admin" {
  name     = var.db_username
  instance = google_sql_database_instance.worthy.name
  password = var.db_password
}
