# CI/CD – GitHub Actions

Le workflow CI/CD (`.github/workflows/ci-cd.yml`) assure :

- **À chaque push / PR** : install, lint, **tests**, build du front (web) et build de l’**API .NET** (`dotnet publish`).
- **Sur push vers `main` (ou `master`)** : build de l’image Docker de l’**API .NET** (Dockerfile dans `apps/api-dotnet/MoviePicker.Api`), push vers Artifact Registry (GCP), déploiement sur Cloud Run, build du front avec l’URL de l’API, upload S3 et invalidation CloudFront.

## 1. Secrets à configurer dans le dépôt GitHub

Dans **GitHub** → dépôt → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, ajouter :

### GCP (API)

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | ID du projet GCP (ex. `movie-picker-2026`). |
| `GCP_SA_KEY` | Clé JSON du compte de service GCP ayant les rôles : *Artifact Registry Writer*, *Cloud Run Admin* (ou *Editor*). Générer une clé dans IAM → Comptes de service → Créer une clé (JSON). |
| `MONGODB_URI` | URI de connexion MongoDB Atlas (ex. `mongodb+srv://...`). |
| `TMDB_API_KEY` | Clé API TMDB. |

### AWS (Front)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Clé d'accès d'un utilisateur IAM avec droits S3 (ListBucket, PutObject, GetObject, DeleteObject) et CloudFront (CreateInvalidation). Voir section 5 (politique IAM). |
| `AWS_SECRET_ACCESS_KEY` | Secret associé à la clé ci‑dessus. |
| `AWS_S3_BUCKET` | Nom du bucket S3 qui héberge le front (ex. `movie-picker-web`). |
| `VITE_API_URL` | URL HTTPS de l'API Cloud Run (ex. `https://movie-picker-api-xxxxx-ew.a.run.app`). Utilisée au **build** du front pour les appels API. |

### Variables (Settings → Variables)

Tu peux configurer le workflow sans toucher au YAML en ajoutant des **Variables** (Settings → Secrets and variables → Actions → onglet **Variables**) :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `AWS_REGION` | Région AWS pour S3/CloudFront. | `eu-west-1` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | ID de la distribution CloudFront (invalidation du cache). Si vide, l'étape d'invalidation est ignorée. | — |
| `GCP_REGION` | Région GCP (modifier le workflow si besoin). | `europe-west1` |
| `GCP_ARTIFACT_REPO` | Dépôt Artifact Registry (modifier le workflow si besoin). | `movie-picker` |
| `CLOUD_RUN_SERVICE_NAME` | Nom du service Cloud Run (modifier le workflow si besoin). | `movie-picker-api` |

## 2. Adapter le workflow à ton setup

Tout se configure depuis **Settings** → **Secrets and variables** → **Actions** :

- **Secrets** : voir section 1 (GCP, AWS, `VITE_API_URL`, etc.).
- **Variables** : optionnel. Si tu ne les définis pas, les valeurs par défaut du tableau ci-dessus sont utilisées. Sinon, crée par ex. `GCP_REGION`, `GCP_ARTIFACT_REPO`, `CLOUD_RUN_SERVICE_NAME` pour adapter région, dépôt d'images et nom du service Cloud Run sans modifier le fichier de workflow.

## 3. Ordre d'exécution (push sur main)

1. **build-and-lint** : `pnpm install`, `pnpm run lint`, **`pnpm run test`**, build du front (`pnpm run build --filter=web`), build de l’API .NET (`dotnet publish` sur `apps/api-dotnet/MoviePicker.Api`).
2. **docker-api** : build de l’image depuis `apps/api-dotnet/MoviePicker.Api/Dockerfile`, tag, push vers Artifact Registry (`api:sha` et `api:latest`).
3. **deploy-api** : `gcloud run deploy` avec l’image .NET taguée par le commit, variables `MONGODB_URI` et `TMDB_API_KEY`.
4. **deploy-front** : build du front avec `VITE_API_URL`, `aws s3 sync` vers le bucket, puis invalidation CloudFront si `AWS_CLOUDFRONT_DISTRIBUTION_ID` est défini.

## 4. Tests

Les tests sont exécutés dans le job **build-and-lint** : `pnpm run test` (Turbo lance les tests du front ; l’API déployée est .NET, les tests Node de l’ancienne API peuvent encore exister dans le monorepo).

- **Web** : Vitest + React Testing Library + jsdom ; tests de composants (ex. page d’accueil).

En local : `pnpm test` à la racine, ou `pnpm --filter api test` / `pnpm --filter web test`.

## 5. Politique IAM pour l'utilisateur AWS (S3 + CloudFront)

L'utilisateur IAM doit avoir **s3:ListBucket** sur le bucket (obligatoire pour `aws s3 sync --delete`). Exemple de stratégie (remplacer `NOM_DU_BUCKET`, `ID_DISTRIBUTION`, `ID_COMPTE_AWS`) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::NOM_DU_BUCKET"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::NOM_DU_BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
      "Resource": "arn:aws:cloudfront::ID_COMPTE_AWS:distribution/ID_DISTRIBUTION"
    }
  ]
}
```

IAM → Utilisateurs → ton utilisateur → Ajouter des autorisations → Créer une stratégie (JSON) puis l'attacher.

### Si ListBucket échoue encore (AccessDenied)

1. **Vérifier le secret GitHub** : le secret `AWS_S3_BUCKET` doit être **exactement** le nom du bucket (ex. `movie-picker-web`). C'est ce bucket que le workflow utilise ; la stratégie IAM doit autoriser ce même nom.
2. **Vérifier la stratégie sur le bon utilisateur** : IAM → Utilisateurs → **movie-picker-github-actions** → onglet Autorisations. La stratégie (inline ou gérée) doit être attachée à **cet** utilisateur.
3. **Refaire une stratégie inline propre** : sur cet utilisateur, supprimer l'ancienne stratégie inline S3/CloudFront, puis « Ajouter des autorisations » → « Créer une stratégie inline » → onglet JSON, coller la politique de la section 5 en remplaçant par le **nom exact** du bucket (celui dans `AWS_S3_BUCKET`) et l'ID de distribution. Enregistrer.
4. **Pas de Deny** : vérifier qu'aucune autre stratégie attachée à l'utilisateur ne contient `"Effect": "Deny"` sur `s3:*` ou `s3:ListBucket`.

## 6. Dépannage

- **Erreur d'auth GCP** : vérifier que `GCP_SA_KEY` est le JSON complet du compte de service et que le compte a bien *Artifact Registry Writer* et *Cloud Run Admin*.
- **Cloud Run « Container failed to start »** : vérifier que `MONGODB_URI` et `TMDB_API_KEY` sont bien renseignés dans les secrets (et qu'ils sont valides).
- **Front ne pointe pas vers la bonne API** : vérifier que `VITE_API_URL` est exactement l'URL HTTPS de ton service Cloud Run (sans slash final).
- **S3 « not authorized to perform: s3:ListBucket »** : voir ci‑dessous.
- **S3 / CloudFront** : vérifier les droits IAM de l'utilisateur dont les clés sont dans `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (S3 + CloudFront).
