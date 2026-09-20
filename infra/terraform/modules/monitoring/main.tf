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
  channels          = concat([google_monitoring_notification_channel.email.name], google_monitoring_notification_channel.sms[*].name)
  backup_published  = "storage_googleapis_com:api_request_count{monitored_resource=\"gcs_bucket\", bucket_name=\"${var.backup_bucket}\", method=\"MoveObject\", response_code=\"OK\"}"
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

resource "google_monitoring_notification_channel" "sms" {
  count = var.alert_sms_number == "" ? 0 : 1

  project      = var.project_id
  type         = "sms"
  display_name = "Alertes Movie Picker (SMS)"
  description  = "Second canal des alertes de supervision Movie Picker, pour ne pas dependre de la lecture d'une boite mail"

  labels = {
    number = var.alert_sms_number
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
  notification_channels = local.channels

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
  notification_channels = local.channels

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
  notification_channels = local.channels

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
  notification_channels = local.channels

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
  notification_channels = local.channels

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
  notification_channels = local.channels

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

resource "google_monitoring_alert_policy" "backup_stale" {
  project               = var.project_id
  display_name          = "Sauvegarde MongoDB en retard"
  combiner              = "OR"
  severity              = "ERROR"
  notification_channels = local.channels

  alert_strategy {
    auto_close = "86400s"
  }

  conditions {
    display_name = "Aucune archive publiee dans le bucket de sauvegarde depuis 36 heures"

    condition_prometheus_query_language {
      query               = "absent_over_time(${local.backup_published}[36h])"
      duration            = "0s"
      evaluation_interval = "300s"
      alert_rule          = "MongoBackupStale"
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Indicateur** : requêtes `MoveObject` réussies sur le bucket de sauvegarde (`storage.googleapis.com/api/request_count`), la dernière étape de `backup-mongo.yml`, qui déplace l'archive de `pending/` vers `mongodb/` une fois sa restauration vérifiée. Une archive écrite puis refusée à la vérification ne produit pas ce mouvement.

      **Déclenchement** : aucun mouvement depuis 36 heures (`absent_over_time`, PromQL), évalué toutes les 5 minutes. La sauvegarde part tous les jours vers 07:30 à 08:05 UTC (cron GitHub à 02:31, retardé d'environ cinq heures par la plateforme) : 36 heures laissent passer ce retard et une journée de dérive, pas deux.

      **Pourquoi une alerte ici** : l'échec d'un run planifié n'est signalé que par un e-mail de GitHub, et un run qui ne part plus ne l'est par rien : GitHub désactive les workflows planifiés d'un dépôt public sans activité pendant 60 jours, et une identité fédérée révoquée ou un bucket renommé arrêtent la sauvegarde sans rougir nulle part.

      **Conduite à tenir** :
      1. Ouvrir les runs de `backup-mongo.yml` (onglet Actions) : run rouge, run absent, ou workflow désactivé (« This scheduled workflow is disabled »).
      2. Relancer à la main : `gh workflow run backup-mongo.yml --ref master`, puis vérifier l'archive du jour avec `gcloud storage ls -l gs://<BUCKET_SAUVEGARDE>/mongodb/`.
      3. Si `gcloud storage mv` cesse d'apparaître comme `MoveObject` (changement de gcloud), adapter le filtre de cette politique dans `infra/terraform/modules/monitoring/main.tf` plutôt que de la désactiver.
    EOT
    )
  }
}

resource "google_monitoring_alert_policy" "scheduler_failure" {
  project               = var.project_id
  display_name          = "Passe planifiee en echec (Cloud Scheduler)"
  combiner              = "OR"
  severity              = "ERROR"
  notification_channels = local.channels

  alert_strategy {
    auto_close = "1800s"

    notification_rate_limit {
      period = "1800s"
    }
  }

  conditions {
    display_name = "Tentative d'un job Cloud Scheduler terminee en erreur"

    condition_matched_log {
      filter = "resource.type=\"cloud_scheduler_job\" AND severity>=ERROR"

      label_extractors = {
        job    = "EXTRACT(resource.labels.job_id)"
        status = "EXTRACT(jsonPayload.status)"
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    content = chomp(<<-EOT
      **Indicateur** : une ligne de journal de Cloud Scheduler (`resource.type = cloud_scheduler_job`) en sévérité `ERROR`, écrite quand une tentative d'un job se termine sur autre chose qu'un 2xx : la cible a répondu 401, 503 ou pas du tout avant le délai de 300 s.

      **Pourquoi une alerte dédiée** : les trois passes planifiées (`movie-picker-event-reminders` toutes les 30 minutes, `movie-picker-recurring-events` et `movie-picker-finished-events` chaque nuit) appellent les routes `/api/v1/scheduler/*` de l'API. Un échec toutes les 30 minutes reste sous les seuils de l'alerte 5xx (plus de 2 réponses 5xx sur 30 minutes, ou plus de 20 % du trafic, que les sondes gonflent) : sans cette politique, les rappels de soirée cesseraient en silence, ce qui est déjà arrivé une fois avec un jeton absent.

      **Déclencheur** : chaque ligne correspondante, avec au plus une notification toutes les 30 minutes et fermeture automatique après 30 minutes.

      **Conduite à tenir** :
      1. Lire le `status` porté par la notification : `UNAUTHENTICATED` ou `PERMISSION_DENIED` (401) signifie que l'API refuse le jeton OIDC du job (audience, compte de service `movie-picker-scheduler@` ou variables `SCHEDULER_OIDC_*` de la révision) ; `UNAVAILABLE` (503) que la révision active n'a pas la configuration OIDC ; `DEADLINE_EXCEEDED` que la passe dépasse 300 s.
      2. Vérifier la révision active du service `${var.api_service_name}` et ses variables `SCHEDULER_OIDC_AUDIENCE` et `SCHEDULER_OIDC_SERVICE_ACCOUNT`, posées par `deploy.yml`.
      3. Relancer la passe à la main (`gcloud scheduler jobs run <job> --location europe-west1`) une fois la cause corrigée : une passe manquée n'est pas rejouée d'elle-même.
    EOT
    )
  }
}
