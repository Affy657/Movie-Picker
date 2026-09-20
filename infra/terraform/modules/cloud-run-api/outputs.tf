output "uri" {
  description = "run.app address of the service."
  value       = google_cloud_run_v2_service.this.uri
}

output "name" {
  description = "Name of the service, as the deployment pipeline targets it."
  value       = google_cloud_run_v2_service.this.name
}

output "dns_records" {
  description = "DNS records the domain mapping asks for at the registrar (a CNAME for a subdomain), empty without a domain."
  value       = try(google_cloud_run_domain_mapping.this[0].status[0].resource_records, [])
}
