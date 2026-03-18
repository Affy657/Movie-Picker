# Migration du back-end vers .NET C#

Ce document présente les **avantages et inconvénients** du passage de l'API Node.js/Express (TypeScript) à **ASP.NET Core (C#)**, ainsi que le périmètre de l'étape « Migration back .NET » insérée entre le MVP et la V1.

---

## 1. Avantages de .NET C#

| Point | Détail |
|--------|--------|
| **Performance** | ASP.NET Core est très performant (Kestrel, pipeline async). Souvent meilleur que Node pour un même hardware, surtout sous charge. |
| **Typage et outillage** | C# fortement typé, IDE (Visual Studio, Rider, VS Code) avec refactoring, IntelliSense, débogage. Moins de surprises à l'exécution qu'en JavaScript. |
| **Écosystème** | Framework mature (DI, middleware, filtres), bibliothèques stables (MongoDB.Driver, HttpClient). NuGet pour les paquets. |
| **Cloud Run** | .NET est supporté nativement sur Cloud Run (image `mcr.microsoft.com/dotnet/aspnet`). Déploiement en conteneur identique au principe actuel. |
| **Déploiement** | Publication en **single-file** ou **self-contained** possible (.NET LTS récente, ex. 10) : binaire unique, moins de dépendances dans l'image Docker. |
| **Compétences / CV** | .NET très demandé en entreprise ; bonne addition pour un profil full-stack (React + .NET). |
| **Sécurité et perf** | Gestion mémoire (GC), pas de single-thread comme Node ; possibilité de parallélisme et async/await bien intégré. |
| **OpenAPI / Swagger** | Support natif (Swashbuckle) pour exposer la même API et garder le front inchangé côté contrat. |

---

## 2. Inconvénients et risques

| Point | Détail |
|--------|--------|
| **Réécriture complète** | Toute l'API doit être recodée : routes, modèles, validation, middleware, appels TMDB, connexion MongoDB. Pas de migration incrémentale. |
| **Temps et coût** | Estimation : plusieurs jours à quelques semaines selon la maîtrise de C#. Pendant la migration, pas de nouvelles features métier (MVP figé côté back). |
| **Courbe d'apprentissage** | Si l'équipe ne connaît que Node/TypeScript, il faut apprendre C#, ASP.NET Core, le driver MongoDB C#, la DI, etc. |
| **Contrat API** | Le **front ne doit pas changer** : les URLs, le format JSON (events, movies, votes, wheel, join, etc.) doivent rester **identiques**. Toute déviation casse le front déployé. |
| **CI/CD et Docker** | Nouveau Dockerfile (.NET), nouveau build (dotnet publish), adaptation des jobs GitHub Actions (plus de pnpm pour l'API). |
| **Double maintenance temporaire** | Si on garde l'ancienne API en parallèle le temps de valider la .NET, deux codebases à maintenir. En général on bascule d'un coup après validation. |
| **MongoDB** | Pas d'équivalent direct à Mongoose (ODM). Utilisation de **MongoDB.Driver** (documents BSON, sérialisation manuelle ou avec attributs). Modèles à réécrire. |
| **Verbosité** | C# est plus verbeux que TypeScript pour certains cas (config, middleware). Boilerplate un peu plus lourd. |

---

## 3. Recommandation

- **Faisable** si l'objectif est d'apprendre .NET ou d'aligner la stack sur un standard entreprise, et si on accepte une phase de réécriture sans nouvelle feature métier.
- **À bien cadrer** : définir le **contrat API** (OpenAPI/Swagger) actuel comme référence, recoder l'API .NET pour qu'elle respecte exactement les mêmes routes et schémas JSON. Le front React reste inchangé.
- **Ordre conseillé** : 1) Spécifier le contrat (liste des routes + body/response), 2) Créer le projet ASP.NET Core, 3) Implémenter routes + MongoDB + TMDB, 4) Adapter Docker + CI/CD, 5) Tester (même tests E2E ou manuels que pour le MVP), 6) Déployer sur Cloud Run et désactiver l'ancienne API.

---

## 4. Périmètre de l'étape « Migration back .NET » (entre MVP et V1)

L'étape est **technique** (changement de stack), pas une nouvelle feature utilisateur. À traiter **après** la livraison du MVP (Node) et **avant** le développement des features V1 (comptes, config, réactions, etc.).

- Créer un projet **ASP.NET Core** (Web API) dans le repo (ex. `apps/api-dotnet` ou remplacer `apps/api`).
- Implémenter les **mêmes routes** que l'API actuelle : events (création, détail, join), movies (liste, ajout, vote, suppression), wheel, close.
- Conserver **MongoDB Atlas** et le **même schéma** de collections (events, participants, movies, votes) pour éviter de migrer les données.
- Conserver l'appel **TMDB** côté serveur (HttpClient + clé en variable d'environnement).
- **Docker** : image basée sur `mcr.microsoft.com/dotnet/aspnet`, build avec `dotnet publish`.
- **CI/CD** : remplacer le build Node de l'API par `dotnet publish`, adapter le job Docker et le déploiement Cloud Run pour cibler la nouvelle image.
- **Front** : aucune modification si le contrat (URLs + JSON) est respecté ; seule l'URL de l'API peut rester la même (même service Cloud Run, nouvelle révision).

Une fois la migration validée (tests, démo parcours complet), on considère le « back .NET » comme la base pour la V1 (comptes, config, réactions sur cette nouvelle stack).
