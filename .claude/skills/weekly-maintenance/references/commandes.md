# Commandes de la passe hebdomadaire

Référence lue à la demande depuis [SKILL.md](../SKILL.md). Repo `Affy657/Movie-Picker`, projet GCP `<PROJET_GCP>`, région `europe-west1`.

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
```

`security-scan.yml` tourne le lundi à 04:17 UTC, `backup-mongo.yml` tous les jours à 02:31 UTC. GitHub démarre les runs planifiés de ce dépôt avec environ cinq heures de retard, c'est constant et ce n'est pas une panne.

Outils épinglés à la main (gitleaks, actionlint, zizmor, SonarScanner, sentry-cli, mongo tools, images MongoDB et Trivy) contre leur dernière version publiée :

```bash
rtk pnpm run check:tools
```

Une ligne par outil, `ok` ou `behind`, code de sortie 1 dès qu'un outil est en retard. La montée se fait dans les fichiers que le script cite, digest ou somme de contrôle compris, puis `pnpm run check:workflows` et la porte gitleaks de `verify:local` rejouent les nouvelles versions en local.

Liaisons IAM hors de ce que `infra/terraform` décrit (projet, buckets, secrets, comptes de service, dépôt d'images, services Cloud Run), clés de compte de service, comptes non décrits encore actifs, et secrets dont la dernière version a plus d'un an :

```bash
rtk pnpm run check:iam
```

Une ligne par constat, code de sortie 1 dès qu'il y en a un. Une liaison de trop se retire à la main (`gcloud <ressource> remove-iam-policy-binding`), jamais en la décrivant pour la faire taire ; un secret trop vieux se fait tourner dans la console du fournisseur puis `gcloud secrets versions add`.

Merge d'une PR Dependabot :

```bash
rtk gh pr merge <n> --repo Affy657/Movie-Picker --merge
```

## Scores Lighthouse réels

Le job vit dans `deploy.yml` depuis le 2026-09-10, et le déploiement est manuel : le dernier rapport n'est pas celui du dernier master, c'est celui de la dernière livraison. La rétention de l'artefact `lighthouse-reports` est de 7 jours, donc au-delà d'une semaine sans déploiement il n'y a **rien** à télécharger. Le noter dans le rapport plutôt que de conclure au vert.

```bash
RUN=$(rtk gh run list --workflow=deploy.yml --repo Affy657/Movie-Picker --limit 1 --json databaseId --jq '.[0].databaseId')
rtk gh run download "$RUN" --repo Affy657/Movie-Picker --name lighthouse-reports --dir "${TMPDIR:-/tmp}/lh"
```

Un fichier `report-<slug>.json` par page. Lire `categories.performance.score`, `categories.accessibility.score`, `categories["best-practices"].score`, `categories.seo.score` (valeurs de 0 à 1, les seuils de [configs/lighthouse-budgets.json](../../../../configs/lighthouse-budgets.json) sont sur 100).

Ce qui déclenche une alerte dans le rapport :

- `accessibility` ou `best-practices` en dessous de 100 : seuil sans aucune marge, le gate rougit au prochain déploiement et laisse `deploy-front` en `skipped` ;
- `performance` à moins de 3 points de son seuil (85 en général, 80 pour `watchlist`) ;
- `seo` sous 95 sur une page indexable.

## Google Cloud

Trafic par classe de code sur 7 jours :

```bash
TOKEN=$(gcloud auth print-access-token)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ); START=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
curl -sS -G -H "Authorization: Bearer $TOKEN" \
  "https://monitoring.googleapis.com/v3/projects/<PROJET_GCP>/timeSeries" \
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
  --project <PROJET_GCP> --freshness=7d --limit=50 --format="value(timestamp,severity,textPayload)"
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

Le front est sur **`www.movie-picker.fr`** (Firebase Hosting), l'API sur **`api.movie-picker.fr`** (Cloud Run). `movie-picker.fr` et `web.movie-picker.fr` répondent `301` vers `www` depuis le 2026-09-20 : un `curl -I` sur ces deux hôtes doit rendre une redirection, pas un 200 ni un 000. Une exception voulue : `https://web.movie-picker.fr/sw.js` répond `200` avec le worker de départ (`infra/web-legacy/`), c'est lui qui désinstalle les anciens service workers ; un `301` sur ce chemin voudrait dire que le domaine est retombé sur le site principal.

```bash
for host in www.movie-picker.fr api.movie-picker.fr; do
  echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null \
    | openssl x509 -noout -enddate -subject
done
curl -sS -o /dev/null -w "front %{http_code}\n" --max-time 15 https://www.movie-picker.fr/
curl -sS -o /dev/null -w "api %{http_code}\n" --max-time 15 https://api.movie-picker.fr/health
```

Le smoke test front de `deploy.yml` fait la même vérification au moment du déploiement ; entre deux déploiements, c'est ce `curl` qui en tient lieu.

## SonarCloud

MCP `sonarqube`, organisation `affy657`, projet `Affy657_Movie-Picker`, branche `master`.

Ordre des appels :

1. date de la dernière analyse réussie ;
2. issues du **new code period**, toutes sévérités ;
3. issues du code historique, `BLOCKER` et `CRITICAL` d'abord ;
4. hotspots de sécurité à revoir.

Pagination comprise : ne pas s'arrêter à la première page et présenter le total comme complet.
