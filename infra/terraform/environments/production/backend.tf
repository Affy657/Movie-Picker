terraform {
  backend "gcs" {
    prefix = "environments/production"
  }
}
