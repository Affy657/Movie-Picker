variable "project_id" {
  description = "Project that owns the secrets."
  type        = string
}

variable "names" {
  description = "Secret names. Only the containers are described: every version is added by hand, so that no secret value ever reaches the Terraform state."
  type        = set(string)
}

variable "accessor_member" {
  description = "IAM member allowed to read the latest version of every secret, the runtime identity of the service that mounts them (serviceAccount:...)."
  type        = string
}
