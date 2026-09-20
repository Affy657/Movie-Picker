output "site_id" {
  description = "Site id, the one the publication script targets."
  value       = google_firebase_hosting_site.this.site_id
}

output "default_url" {
  description = "Address Hosting serves the site at without any custom domain."
  value       = google_firebase_hosting_site.this.default_url
}

output "required_dns_updates" {
  description = "DNS records Hosting asks for, per domain, until each one is verified and certified: what to set at the registrar."
  value = {
    for domain, resource in merge(
      { for r in google_firebase_hosting_custom_domain.this : r.custom_domain => r },
      { for r in google_firebase_hosting_custom_domain.redirect : r.custom_domain => r },
    ) :
    domain => {
      host_state      = resource.host_state
      ownership_state = resource.ownership_state
      cert_state      = try(resource.cert[0].state, null)
      updates         = resource.required_dns_updates
    }
  }
}
