# Movie Picker – Roadmap MVP (carte de suivi)

Suite de tâches à suivre de maintenant jusqu'à la fin du MVP.  
Références : [spec-technique.md](../spec-technique.md), [features-list.md](../features-list.md) (Features list).

Cocher au fur et à mesure. Une autre IA ou un humain peut reprendre en suivant l'ordre des sections.

---

## 1. Prérequis

> **Guide détaillé :** [PREREQUIS.md](../../PREREQUIS.md) – instructions et liens pour chaque point.

- [x] Créer / avoir un dépôt GitHub pour le projet
- [x] Avoir un compte AWS (accès S3, CloudFront)
- [x] Avoir un compte GCP (accès Cloud Run, Artifact Registry)
- [x] Créer un cluster MongoDB Atlas et récupérer l'URI de connexion
- [x] Obtenir une clé API TMDB
- [x] Vérifier l'environnement local : Node 20, pnpm, Docker, Git → `node scripts/check-prereqs.js`

---

## 2. Init du projet

- [x] Initialiser un monorepo Turborepo avec pnpm (racine du repo)
- [x] Créer l'app `apps/api` (Express + TypeScript strict)
- [x] Créer l'app `apps/web` (React + TypeScript strict, ex. Vite)
- [x] Configurer TypeScript strict pour les deux apps
- [x] Vérifier que `pnpm install` et `pnpm build` (ou `turbo run build`) passent

---

## 3. API – Base (events, participants)

- [x] Connecter l'API à MongoDB Atlas (variable d'environnement)
- [x] Définir les modèles / schémas : `events`, `participants` (ids, champs selon spec)
- [x] Exposer POST `/events` (création : title, date, time, génération hostToken + slug court pour l'URL)
- [x] Exposer GET `/events/:id` ou GET `/events/slug/:slug` (détail d'un event)
- [x] Exposer POST pour rejoindre un event (création participant avec pseudo, lien event)
- [x] Vérifier que l'hôte est identifié (query `?host=xxx` ou cookie) pour les actions réservées

---

## 4. API – Movies et votes

- [x] Définir les collections / modèles : `movies`, `votes` (liés à event et participant)
- [x] Exposer un endpoint de recherche films (proxy vers TMDB, côté serveur, clé en env)
- [x] Exposer POST pour ajouter un film à un event (vérifier doublon par id TMDB ou titre)
- [x] Exposer GET des films d'un event (avec infos proposant, score up/down)
- [x] Exposer POST upvote / downvote (un vote par participant par film)
- [x] Exposer suppression d'un film (par le proposant, si la roue n'a pas été lancée)

---

## 5. API – Roue et clôture

- [x] Exposer POST (ou GET) pour lancer la roue (réservé à l'hôte) : tirage parmi les films, retour du gagnant
- [x] Persister le résultat (film gagnant) sur l'event et/ou marquer l'event comme clôturé
- [x] Exposer POST pour clôturer l'event (réservé à l'hôte)
- [x] Gérer les cas : 0 film (erreur ou message), 1 film (gagnant direct)

---

## 6. API – Expiration et lecture seule

- [x] Lors du GET event, renvoyer un indicateur « terminé » si date/heure de l'event est dépassée (ou date de fin configurée)
- [x] Bloquer ou ignorer les actions d'écriture (ajout film, vote, roue) si l'event est terminé

---

## 7. Front – Base et navigation

- [x] Configurer l'app React (Vite ou équivalent), mobile-first
- [x] Mettre en place le routage : page d'accueil (home), création d'event, détail event (ex. `/s/:slug`)
- [x] Configurer l'appel à l'API (URL de base en variable d'environnement build)
- [x] Afficher une structure de page pour « détail event » (titre, date, zone films, zone roue)

---

## 8. Front – Création et accès à un event

- [x] Page « créer un event » : formulaire (titre, date, heure), soumission vers POST `/events`
- [x] Après création : redirection vers la page de l'event avec token hôte (URL ou cookie) et affichage du lien de partage
- [x] Bouton « Copier le lien » (URL de l'event) vers le presse-papier
- [x] Page « rejoindre » (ouverture du lien) : saisie du pseudo, enregistrement du participant
- [x] Afficher le détail de l'event (titre, date, liste des films, bouton « Lancer la roue » visible uniquement pour l'hôte)

---

## 9. Front – Movies (liste, proposition, votes)

- [x] Afficher la liste des films de l'event (poster, titre, année, qui a proposé)
- [x] Formulaire / recherche pour proposer un film (appel API recherche TMDB puis ajout à l'event)
- [x] Gérer l'erreur ou le message « Déjà proposé » en cas de doublon
- [x] Boutons upvote / downvote par film (un vote par participant)
- [x] Bouton « Retirer ma proposition » pour le proposant (si roue non lancée)

---

## 10. Front – Roue

- [x] Bouton « Lancer la roue » (affiché seulement si hôte) : appel API, récupération du film gagnant
- [x] Animation de roue (tourne puis s'arrête sur le film tiré)
- [x] Affichage du film gagnant ; bouton « Clôturer la soirée » (hôte)
- [x] Cas 0 film : message « Aucun film », bouton roue désactivé
- [x] Cas 1 film : affichage direct du gagnant (sans animation ou animation courte)

---

## 11. Front – Event terminé

- [x] Si l'event est expiré ou clôturé : afficher un message type « Soirée terminée » et passer la page en lecture seule (pas d'ajout de film, pas de vote, pas de roue)

---

## 12. Docker et déploiement API (GCP)

- [x] Écrire un Dockerfile pour l'app API (Node, build TypeScript ou run compilé)
- [x] Créer un dépôt dans Artifact Registry (GCP) pour l'image Docker
- [x] Configurer Cloud Run : déployer l'image, définir les variables d'environnement (MONGODB_URI, TMDB_API_KEY, etc.)
- [x] Vérifier que l'API répond en HTTPS sur l'URL Cloud Run

> **Doc :** [deploy-gcp-api.md](deploy-gcp-api.md) – build Docker et étapes Artifact Registry / Cloud Run.

---

## 13. Déploiement Front (AWS)

- [x] Build de l'app React (variable `VITE_API_URL` pointant vers l'URL Cloud Run)
- [x] Créer un bucket S3 pour héberger le build statique
- [x] Configurer CloudFront : origine S3, HTTPS, URL par défaut, `index.html` en root object, erreurs 403/404 → `/index.html` (SPA)
- [x] Déployer le build sur S3 et vérifier l'accès via l'URL CloudFront

> **Doc :** [deploy-aws-front.md](deploy-aws-front.md) – build avec `VITE_API_URL`, S3, CloudFront, commandes de déploiement.

---

## 14. CI/CD (GitHub Actions)

- [x] Créer un workflow : sur push (ex. main), lancer les tests (si présents), build des deux apps
- [x] Ajouter le job de build de l'image Docker de l'API et push vers Artifact Registry (GCP)
- [x] Ajouter le job de déploiement vers Cloud Run (API)
- [x] Ajouter le job de déploiement du front (upload S3, invalidation CloudFront si besoin)
- [x] Stocker les secrets nécessaires (AWS, GCP, TMDB, MONGODB_URI) dans les secrets du repo

> **Doc :** [deploy-cicd.md](deploy-cicd.md) – workflow, secrets à configurer, dépannage.

---

## 15. Monitoring et documentation

- [x] Vérifier que les logs de l'API sont visibles (Cloud Logging GCP)
- [x] Vérifier / configurer un minimum de métriques (Cloud Run, CloudFront)
- [x] Rédiger le README : but du projet, architecture, services utilisés, instructions de déploiement
- [x] Ajouter un schéma d'architecture (diagramme)

> **Doc :** [monitoring.md](monitoring.md) – où voir les logs (Cloud Logging) et les métriques (Cloud Run, CloudFront). [architecture.md](architecture.md) – schéma d'architecture (Mermaid).

---

## 16. MVP terminé

- [x] Parcours complet testé : créer un event → copier le lien → rejoindre avec un pseudo → proposer des films → voter → lancer la roue → clôturer
- [x] Vérifier que la consigne Ynov est couverte (front et back sur AWS et GCP, CI/CD, monitoring, doc)
- [x] Préparer la soutenance (présentation 15–20 min)

> **Docs :** [test-parcours-mvp.md](test-parcours-mvp.md) – checklist du parcours complet à valider avant la soutenance. [verification-consigne-ynov.md](verification-consigne-ynov.md) – vérification que la consigne Ynov est couverte. [soutenance.md](soutenance.md) – guide pour la présentation 15–20 min (structure, démo, points à montrer).

---

## 17. Migration back .NET (entre MVP et V1)

Étape **optionnelle** : remplacer l’API Node.js/Express par une API **ASP.NET Core (C#)** sans changer le front ni les fonctionnalités. À faire **après** la soutenance MVP et **avant** le développement des features V1.

- [ ] Documenter le contrat API actuel (OpenAPI/Swagger) comme référence
- [ ] Créer le projet ASP.NET Core Web API (mêmes routes, même JSON)
- [ ] Implémenter events, participants, movies, votes, wheel, close + MongoDB + TMDB
- [ ] Adapter Dockerfile et CI/CD (build .NET, push image, déploiement Cloud Run)
- [ ] Valider le parcours complet avec le front inchangé ; retirer l’ancienne API Node

> **Doc :** [../migration-dotnet/contexte-et-perimetre.md](../migration-dotnet/contexte-et-perimetre.md) – avantages/inconvénients, recommandations, périmètre. [Roadmap migration .NET](../migration-dotnet/roadmap-migration-dotnet.md) – suivi détaillé des tâches. Voir aussi [features-list.md](../features-list.md) § Migration back .NET.

---

## Bonus. Tests automatisés

- [x] Tests API (Vitest + supertest + mongodb-memory-server) : health, création event, join, parcours complet
- [x] Tests front (Vitest + React Testing Library + jsdom) : au moins la page d'accueil
- [x] Script `pnpm test` à la racine (Turbo) et exécution des tests dans la CI (job Build & Lint)

> **En local :** `pnpm test`. **CI :** les tests s'exécutent à chaque push/PR avant le build. Voir [deploy-cicd.md](deploy-cicd.md) § 4.
