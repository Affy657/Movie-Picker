output "site_id" {
  description = "Site id, the one the publication script targets."
  value       = google_firebase_hosting_site.this.site_id
}

output "default_url" {
  description = "Address Hosting serves the site at without any custom domain."
  value       = google_firebase_hosting_site.this.default_url
}
