output "api_uri" {
  description = "run.app address of the API, the one the health probes of the pipeline call after promotion."
  value       = module.api.uri
}

output "api_images_registry" {
  description = "Prefix of the API images, the pipeline pushes api:<sha> under it."
  value       = module.api_images.registry_uri
}

output "web_default_url" {
  description = "Address of the web app on Firebase Hosting before the custom domain, where the parallel publication is verified."
  value       = module.web.default_url
}
