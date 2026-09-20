variable "project_id" {
  description = "Project that owns the pool."
  type        = string
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
  description = "Repository whose workflows may exchange their token, as owner/name."
  type        = string
}

variable "github_repository_id" {
  description = "Numeric id of that repository (gh api repos/<owner>/<name> --jq .id). A name is freed by a rename or a transfer and can be claimed again; the id never changes, so the provider checks both."
  type        = string
}

variable "github_environments" {
  description = "GitHub environments a job must run in to be trusted: the only subjects the provider accepts. Which identity each subject may assume is bound on the identity itself."
  type        = set(string)
}
