# Déploiement API sur GCP (Cloud Run)

## 1. Dockerfile

Le Dockerfile est dans `apps/api/Dockerfile`. Build **depuis la racine du repo** :

```bash
docker build -f apps/api/Dockerfile -t movie-picker-api .
```

## 2. Artifact Registry (GCP)

1. Créer un dépôt d’images dans [Artifact Registry](https://console.cloud.google.com/artifacts).
2. Exemple : région `europe-west1`, dépôt `movie-picker`.
3. Tagger et pousser l’image (remplacer `PROJECT_ID` et `REGION`) :

```bash
# 1. Construire l'image (obligatoire avant tag/push)
docker build -f apps/api/Dockerfile -t movie-picker-api .

# 2. Tagger pour Artifact Registry
docker tag movie-picker-api europe-west1-docker.pkg.dev/movie-picker-2026/movie-picker/api:latest

# 3. Pousser
docker push europe-west1-docker.pkg.dev/movie-picker-2026/movie-picker/api:latest
```

**Authentification (obligatoire avant le premier push)** : exécuter une fois (ou en cas d’erreur « Unauthenticated request ») :

```bash
gcloud auth login
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

## 3. Cloud Run

1. [Cloud Run](https://console.cloud.google.com/run) → Créer un service.
2. Choisir l’image depuis Artifact Registry.
3. Variables d’environnement : `MONGODB_URI`, `TMDB_API_KEY` (et `PORT` si besoin).
4. Déployer. L’API sera accessible en HTTPS sur l’URL fournie par Cloud Run.

## 4. Vérification

Appeler `https://VOTRE_URL/health` : la réponse doit être `{"status":"ok","service":"movie-picker-api"}`.

## 5. Dépannage : « Container failed to start and listen on the port »

- **Définir `MONGODB_URI`** dans Cloud Run (Variables d’environnement du service). Sans elle, l’API quitte au démarrage avant d’écouter sur le port.
- L’API écoute sur la variable **`PORT`** (fournie par Cloud Run, en général 8080) et sur **0.0.0.0**.
- Consulter les logs dans Cloud Run (ou Cloud Logging) pour voir l’erreur exacte au démarrage.
