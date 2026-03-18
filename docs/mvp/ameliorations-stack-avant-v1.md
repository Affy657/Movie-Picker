# Améliorations stack avant la V1

Pistes d’amélioration **techniques** (sécurité, structure, DX, robustesse) à traiter **avant** ou **en parallèle du début** du dev V1. Les features produit V1 (comptes, config, réactions, etc.) restent dans [features-list.md](../features-list.md).

**Référence :** [ameliorations-bonnes-pratiques.md](ameliorations-bonnes-pratiques.md).

---

## 1. Sécurité (priorité haute)

| Amélioration | État actuel | Action |
|--------------|-------------|--------|
| **CORS** | `SetIsOriginAllowed(_ => true)` (toute origine) | En production, restreindre aux origines du front (CloudFront, localhost en dev). Ex. variable `ALLOWED_ORIGINS` (liste séparée par des virgules), sinon fallback permissif en dev. |
| **Rate limiting** | Aucun | Limiter les appels par IP (ou par clé) sur `POST /events`, `POST .../join`, `GET /movies/search` pour limiter abus et coût TMDB. Ex. ASP.NET middleware ou package type AspNetCoreRateLimit. |
| **Secrets en prod** | `MONGODB_URI`, `TMDB_API_KEY` en `--set-env-vars` Cloud Run | Migrer vers **GCP Secret Manager** : créer les secrets, puis dans Cloud Run référencer les variables depuis Secret Manager (pas de valeur en clair dans la CI). |
| **En-têtes de sécurité** | Non configurés | Ajouter au minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (ou SAMEORIGIN si besoin d’iframe). Possible via middleware ou lib dédiée. |

---

## 2. API .NET (structure et robustesse)

| Amélioration | Bénéfice |
|--------------|----------|
| **Préfixe /v1** | Éviter les breaking changes plus tard : monter les controllers sous `/api/v1` (ou `[Route("v1/events")]`). Le front appelle déjà une base URL ; changer `apiUrl` une fois pour préfixer par `v1` suffit. |
| **Validation des variables au démarrage** | Si `MONGODB_URI` est vide en production, faire échouer le démarrage avec un message clair au lieu de continuer en mode in-memory. Ex. `HostBuilder` ou code au démarrage qui vérifie la config selon l’environnement. |
| **Swagger** | Documenter les réponses 4xx/5xx sur les endpoints principaux (`ProducesResponseType`) pour faciliter l’intégration et les tests de contrat. |
| **Logging structuré** | S’assurer que les logs (ex. erreurs, durée des handlers) sont exploitables dans Cloud Logging (JSON, niveaux cohérents). |

---

## 3. Front React (préparer la V1)

| Amélioration | Bénéfice |
|--------------|----------|
| **Hooks `useEvent(slug)` / `useMovies(slug)`** | Extraire la logique fetch + state de `EventDetail` dans des hooks réutilisables. Facilite les tests, la page Config V1 et un éventuel cache. |
| **Cache / données serveur** | Introduire **React Query** (ou SWR) pour event + movies : cache, refetch, états loading/error centralisés. Réduit les rechargements inutiles et prépare la “mise à jour en direct” V1 (polling ou invalidation). |
| **Type erreur API commun** | Définir un type `ApiError` (ex. `{ message: string; code?: number }`) et l’utiliser côté client pour afficher les erreurs et éventuellement “Réessayer”. |
| **Message explicite si liste films vide (erreur)** | Si le chargement des films échoue, afficher un message + bouton “Réessayer” au lieu d’une liste vide sans explication. |
| **Mode sombre** | V1 prévoit le mode sombre ; préparer un thème (CSS variables ou context) dès maintenant pour éviter un gros refactor plus tard. |

---

## 4. CI/CD et qualité

| Amélioration | Action |
|--------------|--------|
| **Branche principale unique** | Choisir **main** ou **master** et aligner la CI (et la doc) pour éviter la duplication des déploiements. |
| **pnpm audit** | Ajouter une étape (ex. `pnpm audit --audit-level=high`) en CI pour alerter sur les vulnérabilités ; optionnel : bloquer si niveau critique. |
| **Dépendances** | Vérifier les alertes Dependabot / Renovate et tenir à jour les deps (surtout front et outils de build). |

---

## 5. Organisation du monorepo

| Amélioration | Bénéfice |
|--------------|----------|
| **configs/ partagés** | tsconfig de base (ou ESLint/Prettier partagés) dans `configs/` ; les apps font `extends` pour éviter la duplication et garder les mêmes règles. |
| **Documentation des env** | Un seul fichier (ex. `docs/mvp/env-reference.md`) listant toutes les variables (front + API, dev + prod) et où les configurer (local, Cloud Run, GitHub Secrets). |

---

## 6. Nom de domaine

| Amélioration | Action |
|--------------|--------|
| **Mettre en place un nom de domaine** | Remplacer les URLs par défaut (CloudFront, Cloud Run) par un domaine dédié (ex. `app.moviepicker.fr`, `api.moviepicker.fr`). **Front** : domaine personnalisé sur la distribution CloudFront (certificat ACM si AWS) ou via le fournisseur de domaine (CNAME vers CloudFront). **API** : domaine personnalisé sur Cloud Run (mapping du domaine vers le service) + certificat géré par GCP. Mettre à jour `VITE_API_URL` et CORS (`ALLOWED_ORIGINS`) avec la nouvelle origine. Utile pour la communication (partage de liens), le SEO et une image plus pro avant la V1. |

---

## Ordre suggéré (avant / tout début V1)

1. **Sécurité** : CORS en prod, rate limiting, puis Secret Manager (peut être fait en parallèle du dev V1).
2. **API** : préfixe `/v1` + validation env au démarrage (rapide, évite les mauvaises surprises).
3. **Nom de domaine** : configurer un domaine pour le front et l’API (CloudFront + Cloud Run), puis mettre à jour `VITE_API_URL` et CORS.
4. **Front** : hooks `useEvent` / `useMovies` + type `ApiError` + message “Réessayer” sur erreur chargement films (facilite les features V1).
5. **Ensuite** : cache (React Query/SWR), mode sombre, configs partagés, pnpm audit.

Les points “Basse priorité” de [ameliorations-bonnes-pratiques.md](ameliorations-bonnes-pratiques.md) (Swagger détaillé, skip link, etc.) peuvent être traités pendant la V1 si le temps le permet.
