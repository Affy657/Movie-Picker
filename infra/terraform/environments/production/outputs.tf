output "api_uri" {
  description = "run.app address of the API, the one the health probes of the pipeline call after promotion."
  value       = module.api.uri
}

output "api_images_registry" {
  description = "Prefix of the API images, the pipeline pushes api:<sha> under it."
  value       = module.api_images.registry_uri
}
