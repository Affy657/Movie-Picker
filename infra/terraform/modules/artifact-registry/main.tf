resource "google_artifact_registry_repository" "this" {
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_id
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-30-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 30
    }
  }

  cleanup_policies {
    id     = "delete-older-than-30d"
    action = "DELETE"

    condition {
      older_than = "2592000s"
      tag_state  = "ANY"
    }
  }
}
