variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1" # Tokyo, matching the original AWS ap-northeast-1
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Cloud SQL database password"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "Cloud SQL database username"
  type        = string
  default     = "worthy_admin"
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "alpha_vantage_api_key" {
  description = "Alpha Vantage API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "exchange_rate_api_key" {
  description = "Exchange Rate API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "finnhub_api_key" {
  description = "Finnhub API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "polygon_api_key" {
  description = "Polygon API key"
  type        = string
  sensitive   = true
  default     = ""
}
