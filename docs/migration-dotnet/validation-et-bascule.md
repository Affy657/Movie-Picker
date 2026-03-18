# Validation et bascule – étape 10

Guide pour valider l’API .NET (locale ou déployée), comparer avec l’API Node, déployer sur Cloud Run et retirer l’ancienne API.

**Références :** [roadmap-migration-dotnet.md](roadmap-migration-dotnet.md) § 10, [contrat-api-reference.md](contrat-api-reference.md), [../mvp/deploy-cicd.md](../mvp/deploy-cicd.md).

---

## 1. Prérequis

- **API .NET** : `apps/api-dotnet/MoviePicker.Api` tourne en local (port 4000) ou est déployée sur Cloud Run.
- **Variables d’environnement** : `MONGODB_URI`, `TMDB_API_KEY` (et `.env` en local).
- **Front** : optionnel pour la validation manuelle ; nécessaire pour la validation en production (même build avec `VITE_API_URL` pointant vers l’API).

Pour lancer l’API .NET en local :

```bash
cd apps/api-dotnet/MoviePicker.Api
dotnet run
# ou avec .env : dotnet run (EnvLoader charge le .env à l’origine du projet)
```

---

## 2. Parcours complet à tester

Ordre des appels pour couvrir tout le flux : **créer event → rejoindre → proposer films → voter → lancer roue → clôturer**.

Remplacer `BASE` par l’URL de l’API (ex. `http://localhost:4000` ou `https://movie-picker-api-xxxxx.run.app`). Sous PowerShell, définir par ex. `$BASE = "http://localhost:4000"`.

### 2.1 Santé

```bash
curl -s "%BASE%/health"
# Attendu : {"status":"ok","timestamp":"..."}
```

### 2.2 Créer un event

```bash
curl -s -X POST "%BASE%/events" -H "Content-Type: application/json" -d "{\"title\":\"Soirée test\",\"date\":\"2026-04-01\",\"time\":\"20:00\"}"
```

**Vérifier :** 201, corps avec `_id`, `slug`, `hostToken`, `shareUrl`, `title`, `date`, `time`, `createdAt`, `updatedAt`. **Sauvegarder `hostToken` et `slug` (ou `_id`)** pour la suite.

Exemple de sortie (extraire les valeurs) :

- `EVENT_ID` ou `SLUG` = valeur de `_id` ou `slug`
- `HOST_TOKEN` = valeur de `hostToken`

### 2.3 Détail event (sans host)

```bash
curl -s "%BASE%/events/%SLUG%"
```

**Vérifier :** 200, pas de `hostToken`, `isHost: false`, `terminé: false`, `winnerMovie` absent ou null.

### 2.4 Détail event (avec host)

```bash
curl -s "%BASE%/events/%SLUG%?host=%HOST_TOKEN%"
```

**Vérifier :** 200, `isHost: true`.

### 2.5 Rejoindre (participant 1)

```bash
curl -s -X POST "%BASE%/events/%SLUG%/join" -H "Content-Type: application/json" -d "{\"pseudo\":\"Alice\"}"
```

**Vérifier :** 201, corps avec `_id`, `eventId`, `pseudo`, `createdAt`, `updatedAt`. **Sauvegarder `_id` → `PARTICIPANT1_ID`.**

### 2.6 Rejoindre (participant 2)

```bash
curl -s -X POST "%BASE%/events/%SLUG%/join" -H "Content-Type: application/json" -d "{\"pseudo\":\"Bob\"}"
```

**Sauvegarder `_id` → `PARTICIPANT2_ID`.**

### 2.7 Recherche TMDB (optionnel)

```bash
curl -s "%BASE%/movies/search?q=Fight%20Club"
```

**Vérifier :** 200, tableau d’objets avec `id`, `title`, `year`, `posterPath`. (503 si pas de `TMDB_API_KEY`.)

### 2.8 Ajouter un film (Alice)

```bash
curl -s -X POST "%BASE%/events/%SLUG%/movies" -H "Content-Type: application/json" -d "{\"tmdbId\":550,\"title\":\"Fight Club\",\"year\":\"1999\",\"posterPath\":null,\"participantId\":\"%PARTICIPANT1_ID%\"}"
```

**Vérifier :** 201, film avec `proposerPseudo`, `score`, `up`, `down`. **Sauvegarder `_id` du film → `MOVIE1_ID`.**

### 2.9 Ajouter un second film (Bob)

Utiliser un autre `tmdbId`/title (ex. 155, "The Dark Knight") et `participantId: PARTICIPANT2_ID`. Sauvegarder `MOVIE2_ID`.

### 2.10 Voter (Bob vote +1 pour le film d’Alice)

```bash
curl -s -X POST "%BASE%/events/%SLUG%/movies/%MOVIE1_ID%/vote" -H "Content-Type: application/json" -d "{\"participantId\":\"%PARTICIPANT2_ID%\",\"value\":1}"
```

**Vérifier :** 200, document vote avec `value: 1`.

### 2.11 Liste des films

```bash
curl -s "%BASE%/events/%SLUG%/movies"
```

**Vérifier :** 200, tableau avec les deux films, scores et `proposerPseudo` cohérents.

### 2.12 Lancer la roue (en tant qu’hôte)

```bash
curl -s -X POST "%BASE%/events/%SLUG%/wheel?host=%HOST_TOKEN%"
```

**Vérifier :** 200, `winner` (objet film), `message` ("Roue lancée." ou "Un seul film proposé : gagnant direct.").

### 2.13 Clôturer la soirée

```bash
curl -s -X POST "%BASE%/events/%SLUG%/close?host=%HOST_TOKEN%"
```

**Vérifier :** 200, event avec `closedAt`, `message` ("Soirée clôturée." ou "Soirée déjà clôturée").

### 2.14 Détail event après clôture

```bash
curl -s "%BASE%/events/%SLUG%"
```

**Vérifier :** `terminé: true`, `winnerMovie` renseigné (film gagnant).

### 2.15 Écriture bloquée (soirée terminée)

Par ex. `POST .../join` ou `POST .../movies` sur le même event.

**Vérifier :** 400, `{ "error": "Soirée terminée. Lecture seule." }` (ou message équivalent).

---

## 3. Comparer les réponses Node vs .NET

Pour les **mêmes scénarios** (même titre event, mêmes pseudos, mêmes films, mêmes votes) :

1. Lancer l’API Node sur le même port (ou une autre URL) avec la **même base MongoDB** (ou des données équivalentes).
2. Enchaîner le même parcours (création event → join → movies → vote → wheel → close).
3. Comparer :
   - **Codes HTTP** : identiques pour chaque endpoint.
   - **Forme des JSON** : mêmes champs (camelCase), pas de `hostToken` sur les GET event, `isHost`, `terminé`, `winnerMovie`, structure des films (proposerPseudo, score, up, down), messages d’erreur en français.

Points sensibles à contrôler : format des `_id` (24 hex), dates (ISO), `shareUrl` (chemin relatif), réponses 200/201/400/403/404/409.

---

## 4. Déployer l’API .NET sur Cloud Run

Une fois la CI/CD configurée (étape 9) :

1. **Push sur `main`** (ou `master`) : le workflow build l’image .NET, la pousse vers Artifact Registry (`api:sha`, `api:latest`) et déploie sur Cloud Run.
2. **Aucun changement côté front** : le même service Cloud Run est mis à jour ; l’URL d’API (`VITE_API_URL`) reste la même. La nouvelle révision utilise l’image .NET.
3. **Secrets** : `MONGODB_URI`, `TMDB_API_KEY` sont déjà injectés dans le service ; rien à modifier.

Si tu déploies à la main (sans CI/CD) :

```bash
# Build + push image (adapter le nom du projet et du dépôt)
docker build -f apps/api-dotnet/MoviePicker.Api/Dockerfile -t europe-west1-docker.pkg.dev/PROJECT_ID/movie-picker/api:latest apps/api-dotnet/MoviePicker.Api
docker push europe-west1-docker.pkg.dev/PROJECT_ID/movie-picker/api:latest

# Déployer
gcloud run deploy movie-picker-api --image europe-west1-docker.pkg.dev/PROJECT_ID/movie-picker/api:latest --region europe-west1 --set-env-vars "MONGODB_URI=...,TMDB_API_KEY=..."
```

---

## 5. Valider en production avec le front

1. S’assurer que le front est buildé avec **`VITE_API_URL`** = URL HTTPS du service Cloud Run (sans slash final).
2. Ouvrir le front (S3/CloudFront ou URL de preview).
3. Refaire le parcours complet via l’UI : créer une soirée → partager le lien → rejoindre avec un autre pseudo → ajouter des films → voter → lancer la roue (lien hôte) → clôturer.
4. Vérifier qu’aucune erreur réseau ou JSON (champs manquants, erreurs affichées à tort).

---

## 6. Désactiver / retirer l’API Node

**À faire seulement après** validation complète en production (parcours OK avec le front sur l’API .NET).

- **Option A – Archiver** : (non applicable : suppression effectuée.)
- **Option B – Supprimer** : fait — dossier `apps/api` supprimé ; n'utilisent plus que l'API .NET.

Après retrait : l’API déployée et utilisée par le front est uniquement l’API .NET.

---

## 7. Checklist étape 10 (roadmap)

- [ ] Parcours complet exécuté contre l’API .NET (locale ou déployée) : créer event → rejoindre → proposer films → voter → lancer roue → clôturer.
- [ ] Réponses JSON et codes HTTP comparés avec l’API Node pour les mêmes scénarios (health, events, movies, wheel, close).
- [ ] API .NET déployée sur Cloud Run (nouvelle révision) ; front pointe déjà vers cette URL.
- [ ] Parcours validé en production avec le front existant.
- [x] Ancienne API Node désactivée / retirée (supprimé `apps/api`, monorepo et CI adaptés).
