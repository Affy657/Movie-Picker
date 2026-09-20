locals {
  api_runtime_account_id            = "movie-picker-api-staging"
  api_runtime_service_account_email = "${local.api_runtime_account_id}@${var.project_id}.iam.gserviceaccount.com"
  api_runtime_service_account_name  = "projects/${var.project_id}/serviceAccounts/${local.api_runtime_service_account_email}"
  production                        = data.terraform_remote_state.production.outputs

  own_secret_names = toset([
    "MONGODB_URI",
    "OAUTH_GITHUB_CLIENT_ID",
    "OAUTH_GITHUB_CLIENT_SECRET",
    "OAUTH_GOOGLE_CLIENT_ID",
    "OAUTH_GOOGLE_CLIENT_SECRET",
  ])

  shared_secret_names = toset([
    "GITHUB_TOKEN",
    "RESEND_API_KEY",
    "SENTRY_DSN",
    "TMDB_API_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_PUBLIC_KEY",
  ])
}

data "terraform_remote_state" "production" {
  backend = "gcs"

  config = {
    bucket = var.state_bucket
    prefix = "environments/production"
  }
}

resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = local.api_runtime_account_id
  display_name = "Movie Picker API runtime (staging)"
  description  = "Runtime identity of the staging revisions: reads the staging secrets and the shared ones it mounts, never the production database"
}

module "ci" {
  source = "../../modules/workload-identity"

  project_id         = var.project_id
  service_account_id = "movie-picker-ci-staging"
  display_name       = "GitHub Actions deploy (staging)"
  description        = "Identity the deployment workflow assumes from the staging environment: pushes the API image, deploys the staging service and publishes the staging site. No key exists for it."
  pool_name          = local.production.github_federation.pool_name
  subject            = local.production.github_federation.subjects["staging"]

  project_roles = [
    "roles/firebasehosting.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ]
  acts_as_service_accounts = [local.api_runtime_service_account_name]
  image_repositories = {
    api = { location = var.region, repository_id = local.production.api_images_repository_id }
  }
  run_services = {
    api = { location = var.region, name = module.api.name, role = "roles/run.developer" }
  }

  depends_on = [google_service_account.api_runtime]
}

module "api_secrets" {
  source = "../../modules/secrets"

  project_id      = var.project_id
  names           = toset([for name in local.own_secret_names : "STAGING_${name}"])
  accessor_member = "serviceAccount:${local.api_runtime_service_account_email}"

  depends_on = [google_service_account.api_runtime]
}

resource "google_secret_manager_secret_iam_member" "shared" {
  for_each = local.shared_secret_names

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.api_runtime_service_account_email}"

  depends_on = [google_service_account.api_runtime]
}

module "api" {
  source = "../../modules/cloud-run-api"

  project_id            = var.project_id
  location              = var.region
  name                  = "movie-picker-api-staging"
  service_account_email = local.api_runtime_service_account_email
  domain                = "api.staging.movie-picker.fr"
  max_instance_count    = 2

  plain_env = {
    SENTRY_ENVIRONMENT = "staging"
    EMAIL_PROVIDER     = "resend"
  }

  depends_on = [google_service_account.api_runtime]
}

module "web" {
  source = "../../modules/web-hosting"

  project_id    = var.project_id
  site_id       = "movie-picker-web-staging"
  custom_domain = "staging.movie-picker.fr"
}
