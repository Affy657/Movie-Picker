terraform {
  backend "gcs" {
    prefix = "environments/staging"
  }
}
