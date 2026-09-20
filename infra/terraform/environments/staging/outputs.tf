output "api_uri" {
  description = "run.app address of the staging API, the one the pipeline probes after promotion."
  value       = module.api.uri
}

output "api_dns" {
  description = "DNS record the API domain mapping asks for at the registrar, until the domain is verified and certified."
  value       = module.api.dns_records
}

output "web_dns" {
  description = "State of the staging web domain and the DNS records Hosting still asks for."
  value       = module.web.required_dns_updates
}

output "web_default_url" {
  description = "Address of the staging web app on Firebase Hosting before the custom domain, where the publication is verified."
  value       = module.web.default_url
}

output "ci_service_account_email" {
  description = "Identity the deployment workflow assumes from the staging environment, its GCP_SERVICE_ACCOUNT secret."
  value       = module.ci.email
}
