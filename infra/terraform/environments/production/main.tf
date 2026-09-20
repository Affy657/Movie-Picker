locals {
  api_runtime_service_account_email = google_service_account.api_runtime.email

  api_secret_names = toset([
    "AUTH_DATAPROTECTION_KEYRING",
    "GITHUB_TOKEN",
    "KOFI_WEBHOOK_TOKEN",
    "MONGODB_URI",
    "OAUTH_GITHUB_CLIENT_ID",
    "OAUTH_GITHUB_CLIENT_SECRET",
    "OAUTH_GOOGLE_CLIENT_ID",
    "OAUTH_GOOGLE_CLIENT_SECRET",
    "RESEND_API_KEY",
    "SCHEDULER_TOKEN",
    "SENTRY_DSN",
    "TMDB_API_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_PUBLIC_KEY",
  ])
}

resource "google_project_service" "platform" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudscheduler.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = var.api_runtime_service_account_name
  display_name = "Movie Picker API runtime"
  description  = "Runtime identity of the Cloud Run revisions: reads the secrets mounted by deploy.yml, nothing else"
}

module "ci" {
  source = "../../modules/ci-identity"

  project_id         = var.project_id
  github_repository  = "Affy657/Movie-Picker"
  github_environment = "production"

  project_roles = [
    "roles/run.developer",
    "roles/cloudscheduler.admin",
    "roles/firebasehosting.admin",
    "roles/secretmanager.viewer",
    "roles/serviceusage.serviceUsageConsumer",
  ]
  acts_as_service_accounts = [google_service_account.api_runtime.name]
  image_repositories = {
    api = { location = var.region, repository_id = module.api_images.repository_id }
  }
  readable_secrets     = ["SCHEDULER_TOKEN", "MONGODB_URI"]
  object_admin_buckets = [var.backup_bucket]

  depends_on = [google_project_service.platform, module.api_secrets]
}

module "api_images" {
  source = "../../modules/artifact-registry"

  project_id    = var.project_id
  location      = var.region
  repository_id = "movie-picker"
}

module "api_secrets" {
  source = "../../modules/secrets"

  project_id      = var.project_id
  names           = local.api_secret_names
  accessor_member = "serviceAccount:${local.api_runtime_service_account_email}"
}

module "api" {
  source = "../../modules/cloud-run-api"

  project_id            = var.project_id
  location              = var.region
  name                  = "movie-picker-api"
  service_account_email = local.api_runtime_service_account_email
  domain                = "api.movie-picker.fr"
  secret_env            = local.api_secret_names

  plain_env = {
    SENTRY_ENVIRONMENT = "production"
    EMAIL_PROVIDER     = "resend"
  }
}

resource "google_project_service" "firebase" {
  for_each = toset(["firebase.googleapis.com", "firebasehosting.googleapis.com"])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_firebase_project" "this" {
  provider = google-beta

  project    = var.project_id
  depends_on = [google_project_service.firebase]
}

module "web" {
  source = "../../modules/web-hosting"

  project_id       = google_firebase_project.this.project
  site_id          = "movie-picker-web"
  custom_domain    = "www.movie-picker.fr"
  redirect_domains = ["web.movie-picker.fr", "movie-picker.fr"]
}
