import {
  to = module.monitoring.google_monitoring_notification_channel.email
  id = "projects/${var.project_id}/notificationChannels/3201861381286310625"
}

import {
  to = module.monitoring.google_monitoring_uptime_check_config.api_health
  id = "projects/${var.project_id}/uptimeCheckConfigs/api-disponibilite-health-_msdAJoNS9o"
}

import {
  to = module.monitoring.google_monitoring_uptime_check_config.api_readiness
  id = "projects/${var.project_id}/uptimeCheckConfigs/api-readiness-health-ready-mongodb-j2ERORatoGU"
}

import {
  to = module.monitoring.google_monitoring_uptime_check_config.web
  id = "projects/${var.project_id}/uptimeCheckConfigs/front-disponibilite-www-movie-picker-fr-EaS6GNDVHtY"
}

import {
  to = module.monitoring.google_monitoring_alert_policy.web_down
  id = "projects/${var.project_id}/alertPolicies/10047501065547874437"
}

import {
  to = module.monitoring.google_monitoring_alert_policy.api_5xx
  id = "projects/${var.project_id}/alertPolicies/10047501065547875888"
}

import {
  to = module.monitoring.google_monitoring_alert_policy.database_down
  id = "projects/${var.project_id}/alertPolicies/11916497112941930196"
}

import {
  to = module.monitoring.google_monitoring_alert_policy.new_user
  id = "projects/${var.project_id}/alertPolicies/17679872286081650707"
}

import {
  to = module.monitoring.google_monitoring_alert_policy.api_down
  id = "projects/${var.project_id}/alertPolicies/5410785560439310460"
}

import {
  to = module.monitoring.google_monitoring_alert_policy.api_latency
  id = "projects/${var.project_id}/alertPolicies/7389674810134336974"
}

import {
  to = module.monitoring.google_monitoring_dashboard.mco
  id = "projects/${var.project_id}/dashboards/a2953b36-41dc-4387-a897-a45e30221a97"
}
