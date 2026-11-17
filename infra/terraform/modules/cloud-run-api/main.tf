resource "google_cloud_run_v2_service" "this" {
  project             = var.project_id
  location            = var.location
  name                = var.name
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true

  template {
    service_account                  = var.service_account_email
    max_instance_request_concurrency = 80
    timeout                          = "300s"

    scaling {
      max_instance_count = var.max_instance_count
    }

    containers {
      image = var.bootstrap_image

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = var.plain_env

        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env

        content {
          name = env.value

          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].revision,
      template[0].containers[0].image,
      template[0].containers[0].env,
      traffic,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.location
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_logging_project_exclusion" "secret_urls" {
  project     = var.project_id
  name        = "${var.name}-secret-urls"
  description = "Keeps out of the _Default bucket the request log entries Cloud Run itself writes for ${var.name} with a secret in the URL: a list invitation token in /lists/join/, in a returnTo of the OAuth start, or an event host token. The API masks them in its own logs, Cloud Run logs the URL as it came."
  filter = join(" AND ", [
    "log_id(\"run.googleapis.com/requests\")",
    "resource.type=\"cloud_run_revision\"",
    "resource.labels.service_name=\"${google_cloud_run_v2_service.this.name}\"",
    "(httpRequest.requestUrl:\"/lists/join/\" OR httpRequest.requestUrl:\"returnTo=%2Fl%2F\" OR httpRequest.requestUrl:\"host=\" OR httpRequest.requestUrl:\"host%3D\")",
  ])
}

resource "google_cloud_run_domain_mapping" "this" {
  count = var.domain == null ? 0 : 1

  project  = var.project_id
  location = var.location
  name     = var.domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.this.name
  }
}
