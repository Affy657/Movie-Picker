locals {
  api_runtime_service_account_email = "${var.api_runtime_service_account_name}@${var.project_id}.iam.gserviceaccount.com"

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
