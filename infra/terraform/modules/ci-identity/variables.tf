variable "project_id" {
  description = "Project the workflows deploy to."
  type        = string
}

variable "service_account_id" {
  description = "Account id of the identity the workflows assume."
  type        = string
  default     = "movie-picker-ci"
}

variable "pool_id" {
  description = "Id of the workload identity pool that trusts GitHub."
  type        = string
  default     = "github"
}

variable "provider_id" {
  description = "Id of the OIDC provider of the pool."
  type        = string
  default     = "github-actions"
}

variable "github_repository" {
  description = "Repository whose workflows may assume the identity, as owner/name."
  type        = string
}

variable "github_environment" {
  description = "GitHub environment a job must run in to be trusted: the only subject the provider accepts."
  type        = string
  default     = "production"
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
  description = "Artifact Registry repositories the identity pushes images to."
  type        = map(object({ location = string, repository_id = string }))
  default     = {}
}

variable "readable_secrets" {
  description = "Secrets whose latest version the workflows read themselves, the only payloads the identity can access."
  type        = set(string)
  default     = []
}

variable "object_admin_buckets" {
  description = "Buckets the workflows write objects to."
  type        = set(string)
  default     = []
}
