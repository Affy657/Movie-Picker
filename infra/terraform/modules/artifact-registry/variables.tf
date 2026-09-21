variable "project_id" {
  description = "Project that owns the repository."
  type        = string
}

variable "location" {
  description = "Region of the repository, the same as the Cloud Run service that pulls from it."
  type        = string
}

variable "repository_id" {
  description = "Name of the Docker repository."
  type        = string
}
