locals {
  dashboard_tiles = [
    {
      title   = "Disponibilite API - sonde /health (% de checks reussis)"
      x       = 0
      y       = 0
      y_label = "disponibilite"
      data_sets = [{
        filter               = local.api_health_passed
        plot_type            = "LINE"
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
      }]
    },
    {
      title   = "Disponibilite front - sonde ${var.web_host}"
      x       = 6
      y       = 0
      y_label = "disponibilite"
      data_sets = [{
        filter               = local.web_passed
        plot_type            = "LINE"
        alignment_period     = "600s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
      }]
    },
    {
      title      = "Latence API - p50 et p95 (ms)"
      x          = 0
      y          = 4
      y_label    = "ms"
      thresholds = [{ label = "seuil d'alerte p95", value = 800 }]
      data_sets = [
        {
          legend               = "p50"
          filter               = local.api_latencies
          plot_type            = "LINE"
          alignment_period     = "300s"
          per_series_aligner   = "ALIGN_PERCENTILE_50"
          cross_series_reducer = "REDUCE_MEAN"
        },
        {
          legend               = "p95"
          filter               = local.api_latencies
          plot_type            = "LINE"
          alignment_period     = "300s"
          per_series_aligner   = "ALIGN_PERCENTILE_95"
          cross_series_reducer = "REDUCE_MEAN"
        },
      ]
    },
    {
      title   = "Requetes par classe de code"
      x       = 6
      y       = 4
      y_label = "requetes/s"
      data_sets = [{
        filter               = local.api_requests
        plot_type            = "STACKED_AREA"
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["metric.label.response_code_class"]
      }]
    },
    {
      title      = "Erreurs serveur 5xx (somme par 30 min)"
      x          = 0
      y          = 8
      y_label    = "erreurs"
      thresholds = [{ label = "seuil d'alerte (volume)", value = 2 }]
      data_sets = [{
        filter               = local.api_5xx
        plot_type            = "LINE"
        alignment_period     = "1800s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }]
    },
    {
      title   = "Instances de conteneur Cloud Run"
      x       = 6
      y       = 8
      y_label = "instances"
      data_sets = [{
        filter               = local.api_instances
        plot_type            = "STACKED_AREA"
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["metric.label.state"]
      }]
    },
  ]

  dashboard = {
    displayName = "Movie Picker - supervision (MCO)"
    mosaicLayout = {
      columns = 12
      tiles = [
        for tile in local.dashboard_tiles : merge(
          {
            width  = 6
            height = 4
            widget = {
              title = tile.title
              xyChart = merge(
                {
                  dataSets = [
                    for data_set in tile.data_sets : merge(
                      {
                        plotType   = data_set.plot_type
                        targetAxis = "Y1"
                        timeSeriesQuery = {
                          timeSeriesFilter = {
                            filter = data_set.filter
                            aggregation = merge(
                              {
                                alignmentPeriod    = data_set.alignment_period
                                perSeriesAligner   = data_set.per_series_aligner
                                crossSeriesReducer = data_set.cross_series_reducer
                              },
                              try({ groupByFields = data_set.group_by_fields }, {})
                            )
                          }
                        }
                      },
                      try({ legendTemplate = data_set.legend }, {})
                    )
                  ]
                  yAxis = { label = tile.y_label, scale = "LINEAR" }
                },
                try({ thresholds = tile.thresholds }, {})
              )
            }
          },
          tile.x > 0 ? { xPos = tile.x } : {},
          tile.y > 0 ? { yPos = tile.y } : {}
        )
      ]
    }
  }
}

resource "google_monitoring_dashboard" "mco" {
  project        = var.project_id
  dashboard_json = jsonencode(local.dashboard)
}
