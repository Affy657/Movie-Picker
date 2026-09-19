variable "project_id" {
  description = "Firebase project (the GCP project once Firebase is enabled on it) that owns the site."
  type        = string
}

variable "site_id" {
  description = "Hosting site id, globally unique: the site answers at https://<site_id>.web.app before any custom domain."
  type        = string
}
