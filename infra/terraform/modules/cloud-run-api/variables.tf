variable "project_id" {
  description = "Project that hosts the service."
  type        = string
}

variable "location" {
  description = "Region of the service."
  type        = string
}

variable "name" {
  description = "Name of the Cloud Run service."
  type        = string
}

variable "service_account_email" {
  description = "Runtime identity of the revisions: it reads the mounted secrets and nothing else."
  type        = string
}

variable "bootstrap_image" {
  description = "Image of the very first revision. The deployment pipeline replaces it at every deployment and Terraform ignores it afterwards."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "plain_env" {
  description = "Environment variables set in clear and known here. The pipeline owns the container environment at every deployment (ALLOWED_ORIGINS and SENTRY_RELEASE come from it), Terraform only writes these at creation."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Environment variables read from Secret Manager, the variable being named after its secret, latest version."
  type        = set(string)
  default     = []
}

variable "max_instance_count" {
  description = "Scaling ceiling of the service."
  type        = number
  default     = 20
}

variable "domain" {
  description = "Custom domain mapped to the service, null for the run.app address only."
  type        = string
  default     = null
}
