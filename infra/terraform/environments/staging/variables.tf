variable "project_id" {
  description = "GCP project that hosts the staging next to the production: same project, resources suffixed -staging."
  type        = string
}

variable "region" {
  description = "Region of the Cloud Run service, the one of the shared Artifact Registry repository."
  type        = string
  default     = "europe-west1"
}

variable "state_bucket" {
  description = "Bucket that holds the states, TF_STATE_BUCKET: the production state is read from it for the federation and the image repository the staging shares."
  type        = string
}
