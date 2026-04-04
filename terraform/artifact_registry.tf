# Artifact Registry for Docker images (replaces AWS ECR)
resource "google_artifact_registry_repository" "worthy" {
  location      = var.region
  repository_id = "worthy-${var.environment}"
  format        = "DOCKER"
  description   = "Docker images for Worthy backend"

  depends_on = [google_project_service.apis]
}
