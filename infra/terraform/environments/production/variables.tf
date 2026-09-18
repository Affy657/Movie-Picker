variable "project_id" {
  description = "GCP project that hosts the production API, its container images and its secrets."
  type        = string
}

variable "region" {
  description = "Region of the Cloud Run service and of the Artifact Registry repository."
  type        = string
  default     = "europe-west1"
}
