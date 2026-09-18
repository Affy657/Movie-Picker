output "uri" {
  description = "run.app address of the service."
  value       = google_cloud_run_v2_service.this.uri
}

output "name" {
  description = "Name of the service, as the deployment pipeline targets it."
  value       = google_cloud_run_v2_service.this.name
}
