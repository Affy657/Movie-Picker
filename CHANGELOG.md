# Changelog

Toutes les évolutions notables de Movie Picker sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet suit le [versionnage sémantique](https://semver.org/lang/fr/) (SemVer). Chaque
version publiée est associée à un tag Git et à une release GitHub.

## [Non publié]

- Préparation V1.4 : sélection manuelle du film et flamme de régularité (streak).

## [1.3.1] - 2026-07-08

### Added

- Filtre de durée de film dans la recherche d'ajout (10 min ou moins à 3h et plus).
- Réglage de compte pour l'échelle de notes TMDB (affichage sur 5 ou sur 10).
- Nouveau logo (clap incliné, fond sombre) et icônes PWA régénérées.
- Content-Security-Policy (CSP) sur le front SPA.
- Version de l'application affichée dans le pied de page.
- Repli sur les initiales pour l'avatar quand aucun avatar n'est choisi.

### Changed

- Refonte du pipeline CI/CD : filtrage par chemins, découpage du lint, mise en cache, images taguées par digest (temps de CI réduit de plus de moitié).
- Analyse SonarCloud basculée en mode CI (couverture ingérée, quality gate informatif).
- Refonte des cartes film : affiche immersive en grille, vue liste, modale dédiée aux plateformes de streaming.
- Cartes film : streaming affiché uniquement par abonnement, location et achat regroupés en pastilles compactes.
- Immersion PWA Android (theme-color dynamique, safe-area) et alignements optiques (logo, pseudo/avatar).
- Optimisations Lighthouse : accessibilité 100/100, CLS éliminé, bundle réduit de 83 %.

### Removed

- Barre de couleur du thème sur la page de détail d'une soirée.
- Configuration de dev « mobile-web » obsolète (le prototype mobile est archivé).

### Security

- Scans de sécurité étendus en CI : dépendances NuGet vulnérables, Trivy (image Docker), Gitleaks (secrets).
- Durcissement de la sécurité applicative : validation SSRF sur la récupération des affiches TMDB, sandbox de l'iframe bande-annonce, assainissement des URLs (Security Rating SonarCloud A).

### Fixed

- Résorption de la dette technique (élimination des warnings SonarCloud .NET et TS/CSS, déduplication).
- Comblement des lacunes de tests (front, API, E2E) et relèvement des seuils de couverture front.
- Images cassées en production : la CSP bloquait les posters et les avatars par défaut (img-src incomplet).

## [1.3.0] - 2026-06-19

### Added

- Roue de tirage repensée en canvas, avec animation de confettis.
- Recherche avancée de films : note minimale, langue originale, décennie, disponibilité.
- Tri de la liste de films (votes, note TMDB, durée, ordre d'ajout).
- Affichage de la location et de l'achat (VOD) sur la fiche film.
- États vides (empty states) harmonisés sur les écrans sans contenu.
- Export calendrier `.ics` (Google / Outlook / Apple) pour les soirées à venir.
- Infobulles (tooltips) accessibles et réutilisables.

### Changed

- Refonte de la navigation : entrée « Nouvelle soirée » dans la barre, menu utilisateur, retrait du bouton flottant.

### Security

- Correctifs de vulnérabilités dans les dépendances (undici, esbuild, ws).

## [1.2.0] - 2026-06-11

### Added

- Profil public léger : handle `/u/:handle`, bio, visibilité (public par défaut, profil privé en 404).
- Statistiques utilisateur sur le profil public.
- Suivi (follow) léger entre utilisateurs.
- Notifications in-app (7 types) avec cloche d'inbox.
- Invitations in-app : l'hôte invite ses follows depuis la soirée.
- Historique de recherche de films (local, par utilisateur).
- Analytics produit (PostHog) et bandeau de consentement (CMP).
- Accessibilité étendue : lien d'évitement, focus-visible global, couverture axe sur 9 vues.
- Suppression de compte et export des données personnelles (RGPD).
- Note de pitch sur les propositions de film.
- Pages d'erreur dédiées (404, 500).
- Personnalisation de la couleur d'accent des soirées (palette étendue).

### Changed

- Migration complète des tokens du design system.
- Isolation des bases de données dev / prod avec garde-fou anti-base-prod en environnement Development.
- PWA : ajout d'un splash screen et d'une bannière de mise à jour du service worker.

### Removed

- Mode invité : un compte est désormais obligatoire pour rejoindre une soirée.

### Security

- Correction d'une faille IDOR sur les actions de film (vote, déjà vu, note, suppression, ajout).
- Résorption de vulnérabilités SonarCloud (Security Rating C → A) et durcissement du pipeline CI (SHA-pin, secrets en variables d'environnement).

## [1.1.0] - 2026-05-25

### Added

- Progressive Web App : manifest, icônes, service worker (Workbox).
- Notifications push (VAPID) : 5 déclencheurs (rejoindre la soirée, ajout de film, tirage, suppression, rappels 1h/24h avant l'événement).
- Séries TV, bandes-annonces TMDB, liens externes et deep links vers les plateformes de streaming.
- Sélecteur d'avatar (DiceBear Bottts, thème cinéma, 18+ options).

## [1.0.0] - 2026-05-19

Première version de production complète.

### Added

- Comptes utilisateurs : inscription, connexion, mot de passe oublié par e-mail.
- Création de soirée, lien de partage (+ QR code), configuration par l'hôte (thème, expiration, limite de propositions, type de roue).
- Proposition de films (recherche TMDB), vote, marqueur « déjà vu » (avec décompte des autres participants), roue de tirage.
- Fournisseurs de visionnage (watch providers), aperçus Open Graph, internationalisation (FR / EN).
- Landing page publique ; mode sombre / clair ; mise à jour en direct des films et votes ; rappel in-app avant le début de soirée.
- Suppression d'un événement et expulsion d'un participant par l'hôte.

### Changed

- Migration de la stack back-end de Node / Express vers ASP.NET Core (.NET).

### Security

- Rate limiting par endpoint, CORS strict avec allowlist, en-têtes de sécurité, secrets gérés hors dépôt.

## [0.1.0] - 2026-02-27

### Added

- Prototype initial (MVP) : création de soirée, proposition de films (recherche TMDB), vote, roue de tirage — front React, API Node / Express.

[Non publié]: https://github.com/Affy657/Movie-Picker/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/Affy657/Movie-Picker/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Affy657/Movie-Picker/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Affy657/Movie-Picker/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Affy657/Movie-Picker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Affy657/Movie-Picker/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Affy657/Movie-Picker/releases/tag/v0.1.0
