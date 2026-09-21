variable "project_id" {
  description = "Firebase project (the GCP project once Firebase is enabled on it) that owns the site."
  type        = string
}

variable "site_id" {
  description = "Hosting site id, globally unique: the site answers at https://<site_id>.web.app before any custom domain."
  type        = string
}

variable "custom_domain" {
  description = "Domain the site is served on once its DNS points to Hosting, null to stay on web.app only."
  type        = string
  default     = null
}

variable "redirect_domains" {
  description = "Domains that answer with a permanent redirect to custom_domain (www and the apex, for instance)."
  type        = set(string)
  default     = []
}
