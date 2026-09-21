output "pool_name" {
  description = "Full name of the pool, the prefix of every principal it issues."
  value       = google_iam_workload_identity_pool.this.name
}

output "provider_name" {
  description = "Full name of the provider, the GCP_WORKLOAD_IDENTITY_PROVIDER secret of every GitHub environment."
  value       = google_iam_workload_identity_pool_provider.this.name
}

output "subjects" {
  description = "Subject of a job of each trusted environment, keyed by environment."
  value       = local.subjects
}
