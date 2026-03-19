# Déploiement API sur GCP (Cloud Run)

L'API déployée est **ASP.NET Core (.NET)**. Le Dockerfile est dans `apps/api-dotnet/MoviePicker.Api/Dockerfile`.

## 1. Dockerfile

Build **depuis la racine du repo** :

```bash
docker build -f apps/api-dotnet/MoviePicker.Api/Dockerfile -t movie-picker-api apps/api-dotnet/MoviePicker.Api
```

## 2. Prérequis API GCP — Secret Manager

Le déploiement Cloud Run avec **`--set-secrets`** (CI/CD ou `gcloud run deploy`) exige que l’**API Secret Manager** soit **activée** sur le projet.

- **Console** : [activer Secret Manager API](https://console.cloud.google.com/apis/library/secretmanager.googleapis.com) (choisir le bon projet), bouton **Enable**.
- **CLI** (compte avec droit d’activer des services, ex. *Editor* sur le projet) :

```bash
gcloud services enable secretmanager.googleapis.com --project=VOTRE_PROJECT_ID
```

Si l’API vient d’être activée, attendre **1–2 minutes** avant de relancer le déploiement.

## 3. Artifact Registry (GCP)

1. Créer un dépôt d'images dans [Artifact Registry](https://console.cloud.google.com/artifacts).
2. Exemple : région `europe-west1`, dépôt `movie-picker`.
3. Tagger et pousser l'image (remplacer `PROJECT_ID` et `REGION`) :

```bash
# 1. Construire l'image (obligatoire avant tag/push)
docker build -f apps/api-dotnet/MoviePicker.Api/Dockerfile -t movie-picker-api apps/api-dotnet/MoviePicker.Api

# 2. Tagger pour Artifact Registry
docker tag movie-picker-api europe-west1-docker.pkg.dev/movie-picker-2026/movie-picker/api:latest

# 3. Pousser
docker push europe-west1-docker.pkg.dev/movie-picker-2026/movie-picker/api:latest
```

**Authentification (obligatoire avant le premier push)** : exécuter une fois (ou en cas d'erreur « Unauthenticated request ») :

```bash
gcloud auth login
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

## 4. Cloud Run

1. [Cloud Run](https://console.cloud.google.com/run) → Créer un service.
2. Choisir l'image depuis Artifact Registry.
3. **Secrets (recommandé)** : référencer **`MONGODB_URI`** et **`TMDB_API_KEY`** depuis [Secret Manager](https://console.cloud.google.com/security/secret-manager) (pas de valeurs sensibles en variables d'environnement en clair). Voir [deploy-cicd.md](deploy-cicd.md) § 1 bis.
4. **Variable d'environnement** : **`ALLOWED_ORIGINS`** = origine(s) du front (ex. `https://xxx.cloudfront.net`), virgules si plusieurs. **Obligatoire** en production : sans elle, l'API ne démarre pas.
5. Déployer. L'API sera accessible en HTTPS sur l'URL fournie par Cloud Run.

**Sécurité (résumé)** : CORS restreint, rate limiting sur création d’event / join / recherche films, en-têtes `X-Content-Type-Options` / `X-Frame-Options` — voir code dans `Program.cs` et `Infrastructure/Web/`.

## 5. Vérification

Appeler `https://VOTRE_URL/health` : la réponse doit être `{"status":"ok","service":"movie-picker-api"}`.

## 6. Dépannage : « Container failed to start and listen on the port »

- **MongoDB** : fournir `MONGODB_URI` via Secret Manager (ou variable d’environnement en dev). Sans connexion Mongo valable en prod, le comportement dépend de la config (voir roadmap § 24 pour validation stricte au démarrage).
- **`ALLOWED_ORIGINS`** : obligatoire en production ; sinon exception au démarrage.
- L'API écoute sur la variable **`PORT`** (fournie par Cloud Run, en général 8080) et sur **0.0.0.0**.
- Consulter les logs dans Cloud Run (ou Cloud Logging) pour voir l'erreur exacte au démarrage.
