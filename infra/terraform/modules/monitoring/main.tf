locals {
  api_filter        = "resource.type = \"cloud_run_revision\" AND resource.label.service_name = \"${var.api_service_name}\""
  api_requests      = "${local.api_filter} AND metric.type = \"run.googleapis.com/request_count\""
  api_5xx           = "${local.api_requests} AND metric.label.response_code_class = \"5xx\""
  api_latencies     = "${local.api_filter} AND metric.type = \"run.googleapis.com/request_latencies\""
  api_instances     = "${local.api_filter} AND metric.type = \"run.googleapis.com/container/instance_count\""
  uptime_passed     = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\""
  api_health_passed = "${local.uptime_passed} AND metric.label.check_id = \"${google_monitoring_uptime_check_config.api_health.uptime_check_id}\""
  api_ready_passed  = "${local.uptime_passed} AND metric.label.check_id = \"${google_monitoring_uptime_check_config.api_readiness.uptime_check_id}\""
  web_passed        = "${local.uptime_passed} AND metric.label.check_id = \"${google_monitoring_uptime_check_config.web.uptime_check_id}\""
}

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  type         = "email"
  display_name = "Alertes Movie Picker (e-mail)"
  description  = "Canal de signalement des alertes de supervision Movie Picker"

  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_uptime_check_config" "api_health" {
  project          = var.project_id
  display_name     = "API - disponibilite (/health)"
  period           = "60s"
  timeout          = "10s"
  selected_regions = var.regions

  monitored_resource {
    type = "uptime_url"
    labels = {
      host       = var.api_host
      project_id = var.project_id
    }
  }

  http_check {
    path           = "/health"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = true

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  content_matchers {
    content = "\"ok\""
    matcher = "MATCHES_JSON_PATH"

    json_path_matcher {
      json_path    = "$.status"
      json_matcher = "EXACT_MATCH"
    }
  }
}

resource "google_monitoring_uptime_check_config" "api_readiness" {
  project          = var.project_id
  display_name     = "API - readiness (/health/ready, MongoDB)"
  period           = "900s"
  timeout          = "15s"
  selected_regions = var.regions

  monitored_resource {
    type = "uptime_url"
    labels = {
      host       = var.api_host
      project_id = var.project_id
    }
  }

  http_check {
    path           = "/health/ready"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = true

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  content_matchers {
    content = "\"ok\""
    matcher = "MATCHES_JSON_PATH"

    json_path_matcher {
      json_path    = "$.dependencies[0].status"
      json_matcher = "EXACT_MATCH"
    }
  }
}

resource "google_monitoring_uptime_check_config" "web" {
  project          = var.project_id
  display_name     = "Front - disponibilite (${var.web_host})"
  period           = "300s"
  timeout          = "10s"
  selected_regions = var.regions

  monitored_resource {
    type = "uptime_url"
    labels = {
      host       = var.web_host
      project_id = var.project_id
    }
  }

  http_check {
    path           = "/"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = true

    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }
}

resource "google_monitoring_alert_policy" "api_down" {
  project               = var.project_id
  display_name          = "API indisponible (sonde /health)"
  combiner              = "OR"
  severity              = "CRITICAL"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  conditions {
    display_name = "Sonde /health en échec sur au moins 2 points de contrôle"

    condition_threshold {
      filter          = local.api_health_passed
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "60s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Sonde** : uptime check `API - disponibilite (/health)`, toutes les 60 s depuis l'Europe, les USA et l'Asie-Pacifique.

      **Déclenchement** : au moins 2 points de contrôle en échec sur une fenêtre de 5 minutes (un seul checker en échec est ignoré pour éviter les faux positifs réseau).

      **Conduite à tenir** :
      1. Vérifier `https://${var.api_host}/health` et `https://${var.api_host}/health/ready`.
      2. Consulter les logs Cloud Run du service `${var.api_service_name}` (révision active).
      3. Vérifier Sentry (projet `${var.api_service_name}`) pour une exception de démarrage.
      4. Si l'incident suit un déploiement, déclencher le workflow `rollback.yml`.
    EOT
    )
  }
}

resource "google_monitoring_alert_policy" "database_down" {
  project               = var.project_id
  display_name          = "Base de donnees injoignable (readiness API)"
  combiner              = "OR"
  severity              = "CRITICAL"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  conditions {
    display_name = "Readiness en echec sur au moins 2 points de controle"

    condition_threshold {
      filter          = local.api_ready_passed
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "60s"

      aggregations {
        alignment_period     = "1800s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Sonde** : uptime check `API - readiness (/health/ready)`, toutes les 15 minutes. L'endpoint exécute un ping MongoDB (délai maximal 3 s) et renvoie 503 si la base est injoignable.

      **Déclenchement** : au moins 2 points de contrôle en échec sur 30 minutes.

      **Conduite à tenir** :
      1. Vérifier l'état du cluster MongoDB Atlas (disponibilité, quota, liste d'IP autorisées).
      2. Vérifier le secret MONGODB_URI dans Secret Manager et la révision Cloud Run active.
      3. L'API répond encore sur /health : le service est vivant mais ne peut servir aucune donnée, l'impact utilisateur est total.
    EOT
    )
  }
}

resource "google_monitoring_alert_policy" "web_down" {
  project               = var.project_id
  display_name          = "Front indisponible (${var.web_host})"
  combiner              = "OR"
  severity              = "CRITICAL"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  conditions {
    display_name = "Sonde front en échec sur au moins 2 points de contrôle"

    condition_threshold {
      filter          = local.web_passed
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "60s"

      aggregations {
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Sonde** : uptime check `Front - disponibilite (${var.web_host})`, toutes les 5 minutes, vérifie un code 2xx sur la page servie par Firebase Hosting. Une redirection (301) compte comme un échec : la sonde vise le domaine canonique, pas un alias.

      **Déclenchement** : au moins 2 points de contrôle en échec sur une fenêtre de 10 minutes.

      **Conduite à tenir** :
      1. Vérifier le site Hosting sur son adresse `web.app`, puis le domaine et son certificat (`pnpm run terraform -- output web_dns`).
      2. Vérifier le dernier déploiement front (`deploy-front` dans `deploy.yml`) ; `rollback-front.yml` remet la version précédente en service.
      3. Vérifier les enregistrements DNS du domaine chez OVH.
    EOT
    )
  }
}

resource "google_monitoring_alert_policy" "api_5xx" {
  project               = var.project_id
  display_name          = "API - erreurs serveur (5xx) anormales"
  combiner              = "OR"
  severity              = "ERROR"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  conditions {
    display_name = "Plus de 20 % de reponses 5xx pendant 10 minutes"

    condition_threshold {
      filter             = local.api_5xx
      denominator_filter = local.api_requests
      comparison         = "COMPARISON_GT"
      threshold_value    = 0.2
      duration           = "600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  conditions {
    display_name = "Plus de 2 reponses 5xx sur 30 minutes"

    condition_threshold {
      filter          = local.api_5xx
      comparison      = "COMPARISON_GT"
      threshold_value = 2
      duration        = "0s"

      aggregations {
        alignment_period     = "1800s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Indicateur** : réponses 5xx du service Cloud Run `${var.api_service_name}`, en part du trafic et en volume absolu.

      **Seuils** : deux conditions complémentaires, combinées en OU.

      1. *Part du trafic* : plus de 20 % des requêtes en 5xx, pendant 10 minutes consécutives. Ce déclencheur est indépendant du volume, ce qui est indispensable ici : le service reçoit environ 15 000 requêtes utilisateur par mois, soit moins de 2 par fenêtre de 5 minutes, de sorte qu'un seuil exprimé en nombre absolu d'erreurs ne serait jamais franchi par une panne totale. La durée de 10 minutes évite qu'une erreur isolée, qui représente mécaniquement une part élevée d'un trafic aussi faible, ne déclenche l'alerte.
      2. *Volume absolu* : plus de 2 réponses 5xx sur 30 minutes. Ce déclencheur capte la dégradation lente que la part du trafic peut manquer lorsque le volume remonte. Référence mesurée sur 30 jours : 4 réponses 5xx pour 15 161 requêtes, soit 0,026 %, ce qui place le seuil très au-dessus du bruit constaté.

      **Conduite à tenir** :
      1. Ouvrir Sentry (projet `${var.api_service_name}`) : l'exception est regroupée en issue avec sa release (SHA du commit déployé).
      2. Vérifier `https://${var.api_host}/health/ready` : une base injoignable produit des 5xx en rafale.
      3. Consigner l'anomalie en issue GitHub via le gabarit `bug_report.yml`, puis corriger via le pipeline CI/CD.
    EOT
    )
  }
}

resource "google_monitoring_alert_policy" "api_latency" {
  project               = var.project_id
  display_name          = "API - latence p95 dégradée"
  combiner              = "OR"
  severity              = "WARNING"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  conditions {
    display_name = "p95 supérieur à 800 ms pendant 10 minutes"

    condition_threshold {
      filter          = local.api_latencies
      comparison      = "COMPARISON_GT"
      threshold_value = 800
      duration        = "600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Indicateur** : 95e centile de la latence des requêtes du service Cloud Run `${var.api_service_name}`.

      **Seuil** : p95 supérieur à 800 ms pendant 10 minutes consécutives. Référence mesurée sur 30 jours : p50 = 72 ms, p95 = 207 ms, p99 = 284 ms. Le seuil laisse la marge nécessaire aux démarrages à froid (service configuré en scale-to-zero, ~3,8 s au premier appel) sans masquer une dégradation réelle.

      **Conduite à tenir** :
      1. Vérifier la latence côté MongoDB Atlas (requêtes lentes, index manquant).
      2. Vérifier le nombre d'instances Cloud Run et le plafond `maxScale` (20).
      3. Vérifier la latence de l'API TMDB, appelée lors des recherches de films.
    EOT
    )
  }
}

resource "google_monitoring_alert_policy" "new_user" {
  project               = var.project_id
  display_name          = "Nouveau compte utilisateur"
  combiner              = "OR"
  severity              = "WARNING"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"

    notification_rate_limit {
      period = "300s"
    }
  }

  conditions {
    display_name = "Création de compte journalisée par l'API"

    condition_matched_log {
      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.api_service_name}\" AND (jsonPayload.State.\"{OriginalFormat}\"=\"User registered: {UserId}\" OR jsonPayload.State.\"{OriginalFormat}\"=\"OAuth login: created account via {Provider} (userId={UserId})\")"

      label_extractors = {
        handler = "EXTRACT(jsonPayload.Category)"
        user_id = "EXTRACT(jsonPayload.State.UserId)"
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Indicateur** : une ligne de journal structuré (`jsonPayload.State.{OriginalFormat}`) du service Cloud Run `${var.api_service_name}` signalant la création d'un compte, par mot de passe (`User registered: {UserId}`, `RegisterUserHandler`) ou par OAuth (`OAuth login: created account via {Provider} (userId={UserId})`, `OAuthLoginHandler`).

      **Déclencheur** : chaque ligne correspondante, avec au plus une notification toutes les 5 minutes (plusieurs inscriptions rapprochées donnent un seul e-mail) et fermeture automatique après 30 minutes. Ce n'est pas une alerte d'incident mais une notification d'activité : rien à corriger.

      **Contenu** : l'identifiant Mongo du compte et l'heure. Les journaux ne portent ni e-mail ni pseudo (zéro PII), le profil se lit dans la collection `users` du cluster Atlas.

      **Conduite à tenir** : aucune. Si l'e-mail devient trop fréquent, passer la période de `notificationRateLimit` à une heure ou remplacer cette politique par un résumé quotidien.
    EOT
    )
  }
}
