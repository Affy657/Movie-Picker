output "service_account_email" {
  description = "Value of the GCP_SERVICE_ACCOUNT secret of the GitHub environment."
  value       = google_service_account.this.email
}

output "workload_identity_provider" {
  description = "Value of the GCP_WORKLOAD_IDENTITY_PROVIDER secret of the GitHub environment."
  value       = google_iam_workload_identity_pool_provider.github_actions.name
}
