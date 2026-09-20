variable "project_id" {
  description = "GCP project that hosts the production API, its container images and its secrets."
  type        = string
}

variable "region" {
  description = "Region of the Cloud Run service and of the Artifact Registry repository."
  type        = string
  default     = "europe-west1"
}

variable "api_runtime_service_account_name" {
  description = "Account id of the identity the API revisions run under, the same value as API_RUNTIME_SERVICE_ACCOUNT_NAME in deploy.yml."
  type        = string
  default     = "movie-picker-api"
}

variable "backup_bucket" {
  description = "Bucket the MongoDB backups are written to, the same value as BACKUP_BUCKET in backup-mongo.yml. Its lifecycle is not described here."
  type        = string
  default     = "movie-picker-backups"
}
