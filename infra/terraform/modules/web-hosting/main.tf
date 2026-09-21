resource "google_firebase_hosting_site" "this" {
  provider = google-beta

  project = var.project_id
  site_id = var.site_id
}

resource "google_firebase_hosting_custom_domain" "this" {
  provider = google-beta
  count    = var.custom_domain == null ? 0 : 1

  project       = var.project_id
  site_id       = google_firebase_hosting_site.this.site_id
  custom_domain = var.custom_domain

  wait_dns_verification = false
}

resource "google_firebase_hosting_custom_domain" "redirect" {
  provider = google-beta
  for_each = var.custom_domain == null ? toset([]) : var.redirect_domains

  project         = var.project_id
  site_id         = google_firebase_hosting_site.this.site_id
  custom_domain   = each.value
  redirect_target = var.custom_domain

  wait_dns_verification = false
}
