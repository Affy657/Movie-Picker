output "uptime_check_ids" {
  description = "Id of each uptime check, what the check_id label of the metrics and the alert conditions carry."
  value = {
    api_health    = google_monitoring_uptime_check_config.api_health.uptime_check_id
    api_readiness = google_monitoring_uptime_check_config.api_readiness.uptime_check_id
    web           = google_monitoring_uptime_check_config.web.uptime_check_id
    staging_api   = google_monitoring_uptime_check_config.staging_api_health.uptime_check_id
    search        = google_monitoring_uptime_check_config.journey_search.uptime_check_id
    showcase      = google_monitoring_uptime_check_config.journey_showcase.uptime_check_id
    movie_page    = google_monitoring_uptime_check_config.journey_movie_page.uptime_check_id
  }
}

output "notification_channel" {
  description = "Full name of the e-mail channel every policy notifies."
  value       = google_monitoring_notification_channel.email.name
}
