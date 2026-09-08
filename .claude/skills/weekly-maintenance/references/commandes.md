# Commandes de la passe hebdomadaire

Référence lue à la demande depuis [SKILL.md](../SKILL.md). Repo `Affy657/Movie-Picker`, projet GCP `movie-picker-2026`, région `europe-west1`.

Commandes POSIX : les lancer via l'outil Bash, pas PowerShell, qui ne comprend ni `$(...)` ni `date -d`.

## GitHub

```bash
rtk gh pr list --repo Affy657/Movie-Picker --author app/dependabot --state open --json number,title,mergeable,mergeStateStatus,statusCheckRollup
rtk gh api "repos/Affy657/Movie-Picker/dependabot/alerts?state=open"
rtk gh api "repos/Affy657/Movie-Picker/code-scanning/alerts?state=open"
rtk gh issue list --repo Affy657/Movie-Picker --state open --label bug
rtk gh run list --repo Affy657/Movie-Picker --branch master --limit 3
```

Workflows planifiés, dernier statut :

```bash
rtk gh run list --repo Affy657/Movie-Picker --workflow security-scan.yml --limit 1 --json conclusion,createdAt
rtk gh run list --repo Affy657/Movie-Picker --workflow registry-cleanup.yml --limit 1 --json conclusion,createdAt
```

`security-scan.yml` tourne le lundi à 04:17 UTC, `registry-cleanup.yml` le 1er du mois à 05:00 UTC.

Merge d'une PR Dependabot :

```bash
rtk gh pr merge <n> --repo Affy657/Movie-Picker --merge
```

## Scores Lighthouse réels

Le job archive les rapports en artefact `lighthouse-reports`, rétention 7 jours, ce qui couvre exactement une passe.

```bash
rtk gh run download <run-id> --repo Affy657/Movie-Picker --name lighthouse-reports --dir "${TMPDIR:-/tmp}/lh"
```

Un fichier `report-<slug>.json` par page. Lire `categories.performance.score`, `categories.accessibility.score`, `categories["best-practices"].score`, `categories.seo.score` (valeurs de 0 à 1, les seuils de [configs/lighthouse-budgets.json](../../../../configs/lighthouse-budgets.json) sont sur 100).

Ce qui déclenche une alerte dans le rapport :

- `accessibility` ou `best-practices` en dessous de 100 : seuil sans aucune marge, le gate rougit au prochain run et laisse `deploy-front` en `skipped` ;
- `performance` à moins de 3 points de son seuil (85 en général, 80 pour `watchlist`) ;
- `seo` sous 95 sur une page indexable.

## Google Cloud

Trafic par classe de code sur 7 jours :

```bash
TOKEN=$(gcloud auth print-access-token)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ); START=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
curl -sS -G -H "Authorization: Bearer $TOKEN" \
  "https://monitoring.googleapis.com/v3/projects/movie-picker-2026/timeSeries" \
  --data-urlencode 'filter=metric.type="run.googleapis.com/request_count" AND resource.labels.service_name="movie-picker-api"' \
  --data-urlencode "interval.startTime=$START" --data-urlencode "interval.endTime=$END" \
  --data-urlencode 'aggregation.alignmentPeriod=86400s' \
  --data-urlencode 'aggregation.perSeriesAligner=ALIGN_SUM' \
  --data-urlencode 'aggregation.crossSeriesReducer=REDUCE_SUM' \
  --data-urlencode 'aggregation.groupByFields=metric.labels.response_code_class'
```

Latence p95 : même requête avec `metric.type="run.googleapis.com/request_latencies"` et `aggregation.perSeriesAligner=ALIGN_PERCENTILE_95`.

`gcloud alpha` n'est pas installé sur ce poste et ne peut pas l'être en mode non interactif : passer par l'API REST, pas par `gcloud alpha monitoring`.

Erreurs applicatives :

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="movie-picker-api" AND severity>=ERROR' \
  --project movie-picker-2026 --freshness=7d --limit=50 --format="value(timestamp,severity,textPayload)"
```

Révision active et image déployée :

```bash
gcloud run services describe movie-picker-api --region europe-west1 \
  --format="value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)"
gcloud run services list --region europe-west1 --format="value(metadata.name)"
```

Le projet porte deux services Cloud Run, `movie-picker-api` (le bon) et `api`. Rejouer la requête de trafic ci-dessus avec `resource.labels.service_name="api"` : si elle ne renvoie aucune série, le service est mort et ne fait que coûter de l'argent et offrir de la surface d'attaque.

## MongoDB Atlas

MCP `mongodb`, outils `atlas-*` :

- `atlas-list-alerts` : alertes ouvertes sur le projet ;
- `atlas-get-performance-advisor` : index manquants et requêtes lentes, la source la plus utile de la semaine ;
- `atlas-inspect-cluster` : version, tier, occupation disque.

Le cluster dev et le cluster prod sont encore partagés (dette connue) : bien vérifier sur quelle base porte chaque résultat avant de conclure.

## Domaine et certificat

```bash
echo | openssl s_client -connect api.movie-picker.fr:443 -servername api.movie-picker.fr 2>/dev/null \
  | openssl x509 -noout -enddate -issuer
curl -sS -o /dev/null -w "%{http_code}\n" --max-time 15 https://api.movie-picker.fr/health
```

Rejouer sur le domaine qui sert réellement le front.

> **Note à supprimer une fois tranchée.** Au 7 septembre 2026, `movie-picker.fr` et `www.movie-picker.fr` résolvent vers `213.186.33.5` (OVH) et réinitialisent la connexion, alors que `api.movie-picker.fr` répond 200. La bascule DNS vers CloudFront n'a jamais été exécutée, voir [docs/runbook-migration-domaine-www.md](../../../../docs/runbook-migration-domaine-www.md). Établir quel domaine est censé servir le front, inscrire ce domaine ci-dessus, et retirer cette note.

## SonarCloud

MCP `sonarqube`, organisation `affy657`, projet `Affy657_Movie-Picker`, branche `master`.

Ordre des appels :

1. date de la dernière analyse réussie ;
2. issues du **new code period**, toutes sévérités ;
3. issues du code historique, `BLOCKER` et `CRITICAL` d'abord ;
4. hotspots de sécurité à revoir.

Pagination comprise : ne pas s'arrêter à la première page et présenter le total comme complet.
