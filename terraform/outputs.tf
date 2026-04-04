output "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.worthy.name
}

output "cloud_sql_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.worthy.private_ip_address
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name (for Cloud SQL Proxy)"
  value       = google_sql_database_instance.worthy.connection_name
}

output "vpc_connector_name" {
  description = "Serverless VPC connector name"
  value       = google_vpc_access_connector.worthy.name
}

output "cloud_run_service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run.email
}

output "frontend_bucket_name" {
  description = "Frontend Cloud Storage bucket name"
  value       = google_storage_bucket.frontend.name
}

output "frontend_ip" {
  description = "Frontend load balancer IP"
  value       = google_compute_global_address.frontend.address
}

output "artifact_registry_url" {
  description = "Artifact Registry Docker URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.worthy.repository_id}"
}

output "database_url_secret_id" {
  description = "Secret Manager ID for DATABASE_URL"
  value       = google_secret_manager_secret.database_url.secret_id
}
