output "registry_uri" {
  description = "Prefix of every image pushed to the repository, without the image name."
  value       = "${google_artifact_registry_repository.this.location}-docker.pkg.dev/${google_artifact_registry_repository.this.project}/${google_artifact_registry_repository.this.repository_id}"
}

output "repository_id" {
  description = "Name of the repository, for the IAM bindings that target it."
  value       = google_artifact_registry_repository.this.repository_id
}
