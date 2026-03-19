# CI/CD – GitHub Actions

Le workflow (`.github/workflows/ci-cd.yml`) assure :

- **À chaque push / PR** : job **lint** (ESLint, Prettier, **`dotnet format`** sur `MoviePicker.slnx`, **`dotnet build -warnaserror`** API, export **OpenAPI** `artifacts/openapi-v1.json` + artefact **`openapi-v1`**, `pnpm audit`), puis en parallèle **test-web** (Vitest + couverture), **test-api** (unitaires + intégration .NET + Coverlet). Les **E2E Playwright** ne sont pas exécutés en CI (option local : `pnpm run test:e2e` / `test:e2e:ci`).
- **Sur push vers `master`** (branche par défaut du dépôt, voir commentaire en tête de [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)) : après **lint** (dont `pnpm audit --audit-level=high`), **test-web**, **test-api** — image Docker API → Artifact Registry → Cloud Run (**secrets** `MONGODB_URI` / `TMDB_API_KEY` via **Secret Manager** + variable **`ALLOWED_ORIGINS`** pour le CORS) ; build front prod (`VITE_API_URL` secret) → S3 + invalidation CloudFront.

Variables d’environnement **local** : `.env.example` à la racine, `apps/web/.env.example`. **Cloud Run / GitHub** : tableau des secrets et variables dans ce fichier (§ 1).

## 1. Secrets à configurer dans le dépôt GitHub

Dans **GitHub** → dépôt → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, ajouter :

### GCP (API)

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | ID du projet GCP (ex. `movie-picker-2026`). |
| `GCP_SA_KEY` | Clé JSON du compte de service GCP ayant les rôles : *Artifact Registry Writer*, *Cloud Run Admin* (ou *Editor*), et **Secret Manager Secret Accessor** sur les secrets `MONGODB_URI` et `TMDB_API_KEY` (nécessaire pour déployer avec `--set-secrets`). |
| `MONGODB_URI` | *(Optionnel GitHub)* Plus injecté par la CI dans Cloud Run. À stocker une fois dans **GCP Secret Manager** (voir § 1 bis). Tu peux garder ce secret GitHub pour copier la valeur lors de la création du secret GCP ou pour d’autres usages. |
| `TMDB_API_KEY` | *(Optionnel GitHub)* Idem : valeur dans **Secret Manager** côté GCP ; secret GitHub optionnel pour bootstrap / doc. |

### AWS (Front)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Clé d'accès d'un utilisateur IAM avec droits S3 (ListBucket, PutObject, GetObject, DeleteObject) et CloudFront (CreateInvalidation). Voir section 5 (politique IAM). |
| `AWS_SECRET_ACCESS_KEY` | Secret associé à la clé ci‑dessus. |
| `AWS_S3_BUCKET` | Nom du bucket S3 qui héberge le front (ex. `movie-picker-web`). |
| `VITE_API_URL` | URL **racine** HTTPS de l'API Cloud Run (ex. `https://movie-picker-api-xxxxx-ew.a.run.app`), **sans** `/api/v1` : le front ajoute le préfixe versionné automatiquement. |

### 1 bis. Secret Manager (GCP) — obligatoire pour le déploiement API

Les variables **`MONGODB_URI`** et **`TMDB_API_KEY`** ne sont plus passées en clair dans le workflow : Cloud Run les lit depuis **Secret Manager** (noms de secrets **`MONGODB_URI`** et **`TMDB_API_KEY`**, version `latest`).

1. **Créer les secrets** (exemple, une fois) :

```bash
# Remplacer par tes vraies valeurs (ne pas commiter)
echo -n 'mongodb+srv://...' | gcloud secrets create MONGODB_URI --data-file=-
echo -n 'votre_cle_tmdb' | gcloud secrets create TMDB_API_KEY --data-file=-
```

2. **Accès en exécution** : le compte de service **runtime** de Cloud Run (souvent `PROJECT_NUMBER-compute@developer.gserviceaccount.com`) doit avoir le rôle **Secret Manager Secret Accessor** sur chaque secret (Console GCP → Secret Manager → secret → onglet *Autorisations*, ou `gcloud secrets add-iam-policy-binding`).

3. **Accès au déploiement** : le compte de service dont la clé est `GCP_SA_KEY` doit aussi pouvoir utiliser ces secrets au moment du `gcloud run deploy` (**Secret Accessor** sur les mêmes secrets).

4. **CORS** : ajouter la variable de dépôt **`ALLOWED_ORIGINS`** (onglet **Variables**, pas Secrets) : l’**origine** exacte du front (ex. `https://d1234567890.cloudfront.net`, **sans** slash final). Plusieurs origines : séparées par des **virgules**. Si elle est vide, le job **deploy-api** échoue volontairement.

### Variables (Settings → Variables)

Tu peux configurer le workflow sans toucher au YAML en ajoutant des **Variables** (Settings → Secrets and variables → Actions → onglet **Variables**) :

| Variable | Description | Défaut |
|----------|-------------|--------|
| **`ALLOWED_ORIGINS`** | **Obligatoire pour deploy-api** : origine(s) du front pour CORS (ex. `https://xxx.cloudfront.net`). Virgule si plusieurs. | — |
| `AWS_REGION` | Région AWS pour S3/CloudFront. | `eu-west-1` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | ID de la distribution CloudFront (invalidation du cache). Si vide, l'étape d'invalidation est ignorée. | — |
| `GCP_REGION` | Région GCP (modifier le workflow si besoin). | `europe-west1` |
| `GCP_ARTIFACT_REPO` | Dépôt Artifact Registry (modifier le workflow si besoin). | `movie-picker` |
| `CLOUD_RUN_SERVICE_NAME` | Nom du service Cloud Run (modifier le workflow si besoin). | `movie-picker-api` |

## 2. Adapter le workflow à ton setup

Tout se configure depuis **Settings** → **Secrets and variables** → **Actions** :

- **Secrets** : voir section 1 (GCP, AWS, `VITE_API_URL`, etc.).
- **Variables** : optionnel. Si tu ne les définis pas, les valeurs par défaut du tableau ci-dessus sont utilisées. Sinon, crée par ex. `GCP_REGION`, `GCP_ARTIFACT_REPO`, `CLOUD_RUN_SERVICE_NAME` pour adapter région, dépôt d'images et nom du service Cloud Run sans modifier le fichier de workflow.

## 3. Ordre d'exécution (push sur `master`)

1. **lint** (tsc, ESLint, Prettier, **`pnpm audit --audit-level=high`**) → puis **test-web**, **test-api** (parallèles).
2. **docker-api** (push `master` uniquement) : image depuis `apps/api-dotnet/MoviePicker.Api/Dockerfile`, push Artifact Registry.
3. **deploy-api** : Cloud Run avec `--set-secrets` (`MONGODB_URI`, `TMDB_API_KEY` depuis Secret Manager) et `--set-env-vars ALLOWED_ORIGINS=…` (variable GitHub).
4. **deploy-front** : build front avec secret `VITE_API_URL`, S3, invalidation CloudFront.

### Audit npm et Dependabot (§ 26)

- **`pnpm audit --audit-level=high`** : exécuté à la fin du job **Lint** (échec si vulnérabilité **high** ou **critical**). En local : `pnpm run audit` à la racine.
- **Dependabot** : fichier `.github/dependabot.yml` — PR hebdomadaires pour **npm** (racine / monorepo pnpm), **GitHub Actions** et **NuGet** (`apps/api-dotnet`). Merger ou ajuster selon les besoins ; cela couvre le suivi des dépendances prévu roadmap.

## 4. Tests

| Job | Contenu |
|-----|---------|
| **test-web** | Vitest (composants, pages, MSW, a11y), couverture, artefact HTML |
| **test-api** | `MoviePicker.Api.Tests` + Coverlet ; `MoviePicker.Api.IntegrationTests` (Mongo vide = mémoire) |
En local : `pnpm test`, `pnpm run test:coverage --filter=web`, `dotnet test …` ; E2E optionnel : `pnpm run test:e2e:ci`.

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
- **Cloud Run « Container failed to start »** : vérifier les secrets **Secret Manager** (`MONGODB_URI`, `TMDB_API_KEY`), les IAM **Secret Accessor** (runtime + déploiement), et la variable **`ALLOWED_ORIGINS`** (obligatoire hors dev ; sinon l’API refuse de démarrer).
- **Deploy API « permission denied » sur secrets** : accorder **Secret Manager Secret Accessor** sur `MONGODB_URI` et `TMDB_API_KEY` au compte de service de **GCP_SA_KEY** et au compte d’exécution Cloud Run.
- **Front ne pointe pas vers la bonne API** : vérifier que `VITE_API_URL` est exactement l'URL HTTPS de ton service Cloud Run (sans slash final).
- **S3 « not authorized to perform: s3:ListBucket »** : voir ci‑dessous.
- **S3 / CloudFront** : vérifier les droits IAM de l'utilisateur dont les clés sont dans `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (S3 + CloudFront).
