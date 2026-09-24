variable "project_id" {
  description = "Project the identity works in."
  type        = string
}

variable "service_account_id" {
  description = "Account id of the identity."
  type        = string
}

variable "display_name" {
  description = "Display name of the service account."
  type        = string
}

variable "description" {
  description = "What the identity is for, shown in the console next to the account."
  type        = string
}

variable "pool_name" {
  description = "Full name of the workload identity pool that trusts GitHub (module github-federation)."
  type        = string
}

variable "subject" {
  description = "The one GitHub subject allowed to assume the identity, repo:<owner/name>:environment:<environment>: a job of any other environment is refused, even if the provider accepts it."
  type        = string
}

variable "project_roles" {
  description = "Roles granted on the whole project, the ones that have no narrower resource to be bound to."
  type        = set(string)
  default     = []
}

variable "acts_as_service_accounts" {
  description = "Service accounts (projects/.../serviceAccounts/...) the identity may deploy a workload under."
  type        = set(string)
  default     = []
}

variable "image_repositories" {
  description = "Artifact Registry repositories the identity works with, keyed by a short name: writer for the identity that pushes the images, reader for the one that only resolves and scans them."
  type = map(object({
    location      = string
    repository_id = string
    role          = optional(string, "roles/artifactregistry.writer")
  }))
  default = {}
}

variable "run_services" {
  description = "Cloud Run services the identity is granted a role on, keyed by a short name: a deployer bound to its service cannot deploy another one of the project."
  type        = map(object({ location = string, name = string, role = string }))
  default     = {}
}

variable "readable_secrets" {
  description = "Secrets whose latest version the identity reads itself, the only payloads it can access."
  type        = set(string)
  default     = []
}

variable "bucket_roles" {
  description = "Roles granted on single buckets, keyed by a short name. With object_prefix, the role only applies to the objects under that prefix (IAM condition)."
  type        = map(object({ bucket = string, role = string, object_prefix = optional(string) }))
  default     = {}
}
