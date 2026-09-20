output "email" {
  description = "Email of the service account, the value a GitHub environment names in GCP_SERVICE_ACCOUNT or GCP_TERRAFORM_SERVICE_ACCOUNT."
  value       = google_service_account.this.email
}
