# Changelog

Toutes les évolutions notables de Movie Picker sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet suit le [versionnage sémantique](https://semver.org/lang/fr/) (SemVer). Chaque
version publiée est associée à un tag Git et à une release GitHub.

## [Non publié]

- Préparation V1.4 : sélection manuelle du film et flamme de régularité (streak).

## [1.3.1] - 2026-07-08

### Changed

- Refonte du pipeline CI/CD : filtrage par chemins, découpage du lint, mise en cache, images taguées par digest (temps de CI réduit de plus de moitié).
- Analyse SonarCloud basculée en mode CI (couverture ingérée, quality gate informatif).
- Isolation des bases de données dev / prod avec garde-fou anti-base-prod en environnement Development.

### Security

- Scans de sécurité étendus en CI : dépendances NuGet vulnérables, Trivy (image Docker), Gitleaks (secrets).

### Fixed

- Résorption de la dette technique (élimination des warnings SonarCloud .NET et TS/CSS, déduplication).
- Comblement des lacunes de tests (front, API, E2E) et relèvement des seuils de couverture front.

## [1.3.0] - 2026-06-19

### Added

- États vides (empty states) harmonisés sur les écrans sans contenu.
- Export calendrier `.ics` (Google / Outlook / Apple) pour les soirées à venir.
- Infobulles (tooltips) accessibles et réutilisables.

### Changed

- Refonte de la navigation : entrée « Nouvelle soirée » dans la barre, menu utilisateur, retrait du bouton flottant.

## [1.2.0] - 2026-06-11

### Added

- Profil public léger : handle `/u/:handle`, bio, visibilité.
- Statistiques utilisateur sur le profil public.
- Suivi (follow) léger entre utilisateurs.
- Notifications in-app (7 types) avec cloche d'inbox.
- Invitations in-app : l'hôte invite ses follows depuis la soirée.
- Historique de recherche de films (local, par utilisateur).
- Analytics produit (PostHog) et bandeau de consentement (CMP).
- Accessibilité étendue : lien d'évitement, focus-visible global, couverture axe sur 7 pages.
- Suppression de compte et export des données personnelles (RGPD).
- Note de pitch sur les propositions de film.

### Changed

- Migration complète des tokens du design system.

### Removed

- Mode invité : un compte est désormais obligatoire pour rejoindre une soirée.

## [1.1.0] - 2026-05-25

### Added

- Progressive Web App : manifest, icônes, service worker (Workbox).
- Notifications push (VAPID).
- Séries TV, bandes-annonces TMDB, liens externes et deep links vers les plateformes de streaming.

## [1.0.0] - 2026-05-19

Première version de production complète.

### Added

- Comptes utilisateurs : inscription, connexion, mot de passe oublié par e-mail.
- Création de soirée, lien de partage, configuration par l'hôte.
- Proposition de films (recherche TMDB), vote, marqueur « déjà vu », roue de tirage.
- Fournisseurs de visionnage (watch providers), aperçus Open Graph, internationalisation (FR / EN).

### Changed

- Migration de la stack back-end de Node / Express vers ASP.NET Core (.NET).

### Security

- Rate limiting par endpoint, CORS strict avec allowlist, en-têtes de sécurité, secrets gérés hors dépôt.

## [0.1.0] - 2026-02-27

### Added

- Prototype initial (MVP) : choix collaboratif d'un film à plusieurs (front React, API Node / Express).

[Non publié]: https://github.com/Affy657/Movie-Picker/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/Affy657/Movie-Picker/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Affy657/Movie-Picker/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Affy657/Movie-Picker/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Affy657/Movie-Picker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Affy657/Movie-Picker/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Affy657/Movie-Picker/releases/tag/v0.1.0
