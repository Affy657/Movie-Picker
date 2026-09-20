resource "google_service_account" "this" {
  project      = var.project_id
  account_id   = var.service_account_id
  display_name = "GitHub Actions deploy"
  description  = "Identity the deployment workflows assume through the GitHub OIDC federation. No key exists for it."
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = var.pool_id
  display_name              = "GitHub Actions"
  description               = "OIDC federation for the repository workflows, DEBT-002"
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = var.provider_id
  display_name                       = "GitHub Actions OIDC"
  attribute_condition                = "assertion.repository == '${var.github_repository}' && assertion.sub == 'repo:${var.github_repository}:environment:${var.github_environment}'"

  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.environment" = "assertion.environment"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.this.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
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

resource "google_artifact_registry_repository_iam_member" "writer" {
  for_each = var.image_repositories

  project    = var.project_id
  location   = each.value.location
  repository = each.value.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.this.email}"
}

resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = var.readable_secrets

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.this.email}"
}

resource "google_storage_bucket_iam_member" "object_admin" {
  for_each = var.object_admin_buckets

  bucket = each.value
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.this.email}"
}
