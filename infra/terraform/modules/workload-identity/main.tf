resource "google_service_account" "this" {
  project      = var.project_id
  account_id   = var.service_account_id
  display_name = var.display_name
  description  = var.description
}

resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.this.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${var.pool_name}/subject/${var.subject}"
}

resource "google_project_iam_member" "this" {
  for_each = var.project_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.this.email}"
}

resource "google_service_account_iam_member" "acts_as" {
  for_each = var.acts_as_service_accounts

  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.this.email}"
}

moved {
  from = google_artifact_registry_repository_iam_member.writer
  to   = google_artifact_registry_repository_iam_member.images
}

resource "google_artifact_registry_repository_iam_member" "images" {
  for_each = var.image_repositories

  project    = var.project_id
  location   = each.value.location
  repository = each.value.repository_id
  role       = each.value.role
  member     = "serviceAccount:${google_service_account.this.email}"
}

resource "google_cloud_run_v2_service_iam_member" "services" {
  for_each = var.run_services

  project  = var.project_id
  location = each.value.location
  name     = each.value.name
  role     = each.value.role
  member   = "serviceAccount:${google_service_account.this.email}"
}

resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = var.readable_secrets

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.this.email}"
}

resource "google_storage_bucket_iam_member" "bucket" {
  for_each = var.bucket_roles

  bucket = each.value.bucket
  role   = each.value.role
  member = "serviceAccount:${google_service_account.this.email}"
}
