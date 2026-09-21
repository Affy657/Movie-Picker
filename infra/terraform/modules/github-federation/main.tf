locals {
  subjects = { for environment in keys(var.github_environments) : environment => "repo:${var.github_repository}:environment:${environment}" }
  subject_conditions = [
    for environment in sort(keys(var.github_environments)) :
    var.github_environments[environment] == ""
    ? "assertion.sub == '${local.subjects[environment]}'"
    : "(assertion.sub == '${local.subjects[environment]}' && assertion.ref == '${var.github_environments[environment]}')"
  ]
}

resource "google_iam_workload_identity_pool" "this" {
  project                   = var.project_id
  workload_identity_pool_id = var.pool_id
  display_name              = "GitHub Actions"
  description               = "OIDC federation for the repository workflows, DEBT-002"
}

resource "google_iam_workload_identity_pool_provider" "this" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.this.workload_identity_pool_id
  workload_identity_pool_provider_id = var.provider_id
  display_name                       = "GitHub Actions OIDC"
  attribute_condition                = "assertion.repository_id == '${var.github_repository_id}' && assertion.repository == '${var.github_repository}' && (${join(" || ", local.subject_conditions)})"

  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.environment" = "assertion.environment"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
