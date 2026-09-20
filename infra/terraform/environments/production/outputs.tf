output "api_uri" {
  description = "run.app address of the API, the one the health probes of the pipeline call after promotion."
  value       = module.api.uri
}

output "api_images_registry" {
  description = "Prefix of the API images, the pipeline pushes api:<sha> under it."
  value       = module.api_images.registry_uri
}

output "web_dns" {
  description = "State of each custom domain of the web app and the DNS records Hosting still asks for."
  value       = module.web.required_dns_updates
}

output "web_default_url" {
  description = "Address of the web app on Firebase Hosting before the custom domain, where the parallel publication is verified."
  value       = module.web.default_url
}

output "ci_service_account_email" {
  description = "Identity the deployment workflows assume, the GCP_SERVICE_ACCOUNT secret of the production environment."
  value       = module.ci.email
}

output "terraform_service_account_email" {
  description = "Identity the Terraform workflow assumes on master, the GCP_TERRAFORM_SERVICE_ACCOUNT secret of the production environment."
  value       = module.terraform.email
}

output "terraform_plan_service_account_email" {
  description = "Identity the Terraform workflow assumes on a pull request, the GCP_SERVICE_ACCOUNT secret of the infra-plan environment."
  value       = module.terraform_plan.email
}

output "workload_identity_provider" {
  description = "Provider the workflows exchange their OIDC token with, the GCP_WORKLOAD_IDENTITY_PROVIDER secret of both GitHub environments."
  value       = module.github.provider_name
}

output "github_federation" {
  description = "Pool, provider and trusted subjects of the GitHub federation: the staging root module binds its identities to them through the remote state."
  value       = module.github
}

output "api_images_repository_id" {
  description = "Artifact Registry repository of the API images, shared with the staging: the image promoted to production is the one the staging ran."
  value       = module.api_images.repository_id
}
