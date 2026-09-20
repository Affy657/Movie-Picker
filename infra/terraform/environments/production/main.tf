locals {
  api_runtime_service_account_email = google_service_account.api_runtime.email
  github_repository                 = "Affy657/Movie-Picker"
  github_repository_id              = "1166675954"
  secrets_operator_role_id          = "secretsOperator"
  bucket_iam_editor_role_id         = "bucketIamEditor"

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

module "github" {
  source = "../../modules/github-federation"

  project_id           = var.project_id
  github_repository    = local.github_repository
  github_repository_id = local.github_repository_id
  github_environments  = ["production", "infra-plan", "staging"]
}

module "ci" {
  source = "../../modules/workload-identity"

  project_id         = var.project_id
  service_account_id = "movie-picker-ci"
  display_name       = "GitHub Actions deploy"
  description        = "Identity the deployment workflows assume through the GitHub OIDC federation. No key exists for it."
  pool_name          = module.github.pool_name
  subject            = module.github.subjects["production"]

  project_roles = [
    "roles/run.developer",
    "roles/cloudscheduler.admin",
    "roles/firebasehosting.admin",
    "roles/secretmanager.viewer",
    "roles/serviceusage.serviceUsageConsumer",
  ]
  acts_as_service_accounts = [google_service_account.api_runtime.name]
  image_repositories = {
    api = { location = var.region, repository_id = module.api_images.repository_id, role = "roles/artifactregistry.reader" }
  }
  readable_secrets = ["SCHEDULER_TOKEN", "MONGODB_URI"]
  bucket_roles = {
    backups = { bucket = var.backup_bucket, role = "roles/storage.objectAdmin" }
  }

  depends_on = [google_project_service.platform, module.api_secrets]
}

resource "google_project_iam_custom_role" "secrets_operator" {
  project     = var.project_id
  role_id     = local.secrets_operator_role_id
  title       = "Secret Manager operator, payloads excluded"
  description = "Creates, describes and shares secrets, never reads a version itself: what Terraform needs. Not a wall: sharing is setIamPolicy, by which a leaked identity would grant itself secretAccessor, an audit-logged call; the deny policy that would close it needs an organisation (infra/README.md)."
  permissions = [
    "secretmanager.locations.get",
    "secretmanager.locations.list",
    "secretmanager.secrets.create",
    "secretmanager.secrets.delete",
    "secretmanager.secrets.get",
    "secretmanager.secrets.getIamPolicy",
    "secretmanager.secrets.list",
    "secretmanager.secrets.setIamPolicy",
    "secretmanager.secrets.update",
    "secretmanager.versions.get",
    "secretmanager.versions.list",
  ]
}

resource "google_project_iam_custom_role" "bucket_iam_editor" {
  project     = var.project_id
  role_id     = local.bucket_iam_editor_role_id
  title       = "Bucket IAM editor, objects excluded"
  description = "Reads and writes the IAM policy of a bucket without access to its objects: how Terraform grants a bucket to an identity."
  permissions = [
    "storage.buckets.get",
    "storage.buckets.getIamPolicy",
    "storage.buckets.setIamPolicy",
  ]
}

module "terraform" {
  source = "../../modules/workload-identity"

  project_id         = var.project_id
  service_account_id = "movie-picker-terraform"
  display_name       = "Terraform apply (GitHub Actions)"
  description        = "Identity the Terraform workflow assumes on master to apply infra/terraform. It manages every resource described there, hence its reach; only a job of the production environment can assume it."
  pool_name          = module.github.pool_name
  subject            = module.github.subjects["production"]

  project_roles = [
    "roles/artifactregistry.admin",
    "roles/firebase.viewer",
    "roles/firebasehosting.admin",
    "roles/iam.roleAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/monitoring.editor",
    "roles/resourcemanager.projectIamAdmin",
    "roles/run.admin",
    "roles/serviceusage.serviceUsageAdmin",
    "projects/${var.project_id}/roles/${local.secrets_operator_role_id}",
  ]
  acts_as_service_accounts = [google_service_account.api_runtime.name]
  bucket_roles = {
    state          = { bucket = var.state_bucket, role = "roles/storage.objectAdmin" }
    state_policy   = { bucket = var.state_bucket, role = "projects/${var.project_id}/roles/${local.bucket_iam_editor_role_id}" }
    backups_policy = { bucket = var.backup_bucket, role = "projects/${var.project_id}/roles/${local.bucket_iam_editor_role_id}" }
  }

  depends_on = [
    google_project_service.platform,
    google_project_iam_custom_role.secrets_operator,
    google_project_iam_custom_role.bucket_iam_editor,
  ]
}

module "terraform_plan" {
  source = "../../modules/workload-identity"

  project_id         = var.project_id
  service_account_id = "movie-picker-terraform-plan"
  display_name       = "Terraform plan (GitHub Actions)"
  description        = "Read-only identity the Terraform workflow assumes on a pull request to plan infra/terraform against production, without the lock."
  pool_name          = module.github.pool_name
  subject            = module.github.subjects["infra-plan"]

  project_roles = [
    "roles/viewer",
    "roles/iam.securityReviewer",
    "roles/iam.workloadIdentityPoolViewer",
    "roles/secretmanager.viewer",
    "roles/firebase.viewer",
    "roles/serviceusage.serviceUsageConsumer",
  ]
  bucket_roles = {
    state = { bucket = var.state_bucket, role = "roles/storage.objectViewer" }
  }

  depends_on = [google_project_service.platform]
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

module "monitoring" {
  source = "../../modules/monitoring"

  project_id       = var.project_id
  alert_email      = var.alert_email
  api_host         = "api.movie-picker.fr"
  web_host         = "www.movie-picker.fr"
  api_service_name = module.api.name
}
