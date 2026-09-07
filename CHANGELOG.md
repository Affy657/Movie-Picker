# Changelog

Toutes les évolutions notables de Movie Picker sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet suit le [versionnage sémantique](https://semver.org/lang/fr/) (SemVer). Chaque
version publiée est associée à un tag Git et à une release GitHub.

## [Non publié]

## [1.5.0] - 2026-09-07

### Added

- **Page d'accueil d'exploration** : la racine `/` propose des films à tout le monde, connecté ou non, en huit rangées ordonnées du plus personnel au plus exploratoire. Une entrée « Explorer » ouvre la page depuis la nav et depuis la barre du bas mobile.
- **Recherche en tête d'accueil** : un champ de recherche et trois exemples cliquables, sans compte requis.
- **Rangées personnelles** : votre liste triée par note, des recommandations tirées du dernier film vu en soirée, et ce qu'ont vu les personnes que vous suivez.
- **Ce soir en streaming** : Netflix, Prime Video, Disney+, Canal+ et Apple TV+, avec bascule d'une plateforme à l'autre.
- **Cent vingt sagas** : les grandes franchises réunies, chacune avec sa page, et une barre de recherche et de tri sur la page qui les liste.
- **Dix sélections thématiques** : frissons, comédies françaises, années 80 à 2000, braquages, pépites A24, moins de 90 minutes, indétrônables, en famille.
- **Classement communautaire** : les films que les soirées proposent le plus souvent, un film y entrant à partir de deux soirées distinctes.
- **Nouvelle landing page** : neuf sections, l'interface du produit reconstruite en CSS et une roue de tirage réellement jouable depuis la page.
- Pages listes complètes derrière chaque rangée, avec filtres par genre et par type, tri et recherche.
- Composant partagé `SearchField`, extrait de la barre d'outils des listes et réutilisé par la recherche d'accueil.
- Endpoints `GET /movies/showcase`, `GET /movies/collections`, `GET /users/me/watched-movies` et `GET /users/me/following-watched-movies`, avec cache mémoire de six heures par section.
- Contexte `.on-dark` dans le design system : une bande sombre redéfinit les jetons de thème pour ses descendants, si bien que `Button`, `Card`, `Chip` et `Avatar` s'y posent sans classe locale.
- Taille `lg` sur `Button` et `buttonClass`, pour les appels à l'action de page d'accueil.
- Test de parité des clés d'internationalisation : une clé française sans équivalent anglais fait désormais échouer la suite.

### Changed

- La racine `/` sert la page d'exploration ; la présentation du produit vit sur `/decouvrir`, annoncée dans le sitemap.
- Les listes de films et les profils affichent la note et la durée, comme Ma liste.
- Les rangées d'onglets signalent leur débordement par un dégradé et ramènent l'onglet actif dans le champ de vision.
- Les recommandations d'accueil passent par un endpoint authentifié plutôt que par le profil public : un compte au profil privé garde sa rangée.
- Sur mobile, le titre d'une rangée tient sur une ligne et le lien « voir tout » descend sous lui, aligné à droite, quand la place manque.
- La roue de tirage s'adapte enfin à la largeur de son conteneur au lieu d'être figée à 460 pixels.
- Les pastilles `Chip` de ton primaire passent sur le bleu de texte, mieux contrasté que le bleu de fond en thème clair comme en thème sombre.

### Fixed

- La fiche film ouverte depuis un carrousel d'accueil affiche son affiche et son année.
- Le service worker de développement ne s'enregistre plus par défaut : un worker obsolète interceptait `/api/v1/*` sur `localhost` et vidait toutes les sections sans le moindre message d'erreur. Il revient avec `VITE_DEV_SERVICE_WORKER=true`.
- La rangée « Vos amis ont vu » exclut les profils passés en privé.

## [1.4.1] - 2026-09-04

### Added

- **Navigation ouverte aux visiteurs sans compte** : la nav, le pied de page et cinq pages (Mes soirées, Nouvelle soirée, Ma liste, Notifications, Paramètres) sont désormais accessibles sans compte, avec un état déconnecté dédié par page et un appel à l'action vers la connexion ou l'inscription.
- **Pièces jointes sur « Proposer une idée »** : jusqu'à 4 images (bouton, glisser-déposer ou collage) jointes à une suggestion de feature ou de bug.
- **Resservir un film déjà vu** : proposer un film de son historique vers une soirée en cours, sans le rechercher.
- **Alerte de date changée** : quand l'hôte reprogramme une soirée, les participants reçoivent une notification push et un message in-app.

### Changed

- La racine `/` redirige désormais vers Mes soirées ; la landing publique déménage sur `/decouvrir`, qui devient la page indexable de présentation du produit (FR / EN).
- **Mes soirées repensée** : onglets Actives et Historique, bloc « À traiter » pour les soirées en suspens, cartes adaptées au mobile.
- **Historique fouillable** : recherche, tris (date, titre, films, participants) et filtre sur les soirées restées sans film choisi.
- **Mon compte devient Paramètres** : cinq rubriques (Profil, Préférences, Notifications, Intégrations, Compte et sécurité), enregistrement automatique.
- **Panneau de soirée revu** : enregistrement en direct, erreurs par champ, mode de roue et séries TV dès la création ; jusqu'à 15 films par personne et 300 participants.
- **Liste de films** : vue liste en plus de la grille, date de sortie, indicateur Ma liste, plateformes redessinées, fiche film en un geste.
- **Partage unifié** : une seule fenêtre pour le lien, le QR code et l'invitation des abonnements, sur la soirée comme sur le profil.
- Premier affichage plus rapide : le chunk App et sa CSS sont préchargés en parallèle de l'entrée.

### Fixed

- Contraste du libellé actif de la navigation mobile et de l'option de thème sélectionnée en mode sombre (ratio AA).
- Navigateurs intégrés (Snapchat, etc.) : un bandeau propose d'ouvrir Movie Picker dans Safari ou Chrome, au lieu de perdre la session.
- Pseudo et identifiant public exclus des événements d'analytics.

## [1.4.0] - 2026-08-25

### Added

- **Watchlist personnelle** : liste de films « à voir » par utilisateur, alimentée depuis la recherche TMDB, avec proposition rapide d'un film de la watchlist directement dans une soirée.
- **Intégration Letterboxd** : synchronisation bidirectionnelle de la watchlist à partir du pseudo Letterboxd, rafraîchie automatiquement (plafonnée à une fois par jour côté serveur) avec un écran de revue des correspondances à l'import.
- **Sélection manuelle du film gagnant** : alternative au tirage par la roue, l'hôte bascule en « choix manuel » et désigne lui-même le gagnant, avec la même animation de révélation et un badge « Choisi par l'hôte ».
- **Exclusion d'un film de la roue** : l'hôte écarte un film du tirage sans le retirer de la liste ; réversible à tout moment, y compris après un tirage.
- **Flamme streak de soirées** : compteur de semaines consécutives de participation à une soirée avec tirage, affiché sur le profil public, mis en avant sur la carte de profil.
- **Connexion sociale (OAuth)** : connexion et inscription via Google ou GitHub, avec une section « Connexions » sur la page Compte pour lier ou délier un fournisseur.
- **Système de dons** : page publique « Soutenir Movie Picker » exposant les frais réels du service, renvoyant vers Ko-fi, avec un badge « Soutien » décoratif sur le profil public des donateurs.
- **Modale de nouveautés** : à la première visite suivant une mise à jour, une modale résume ce qui a changé dans la version ; affichée une seule fois par version connectée, consultable ensuite à la demande depuis le pied de page.
- **Bouton « Proposer une idée »** : depuis le pied de page ou le menu compte, titre + description ; la soumission crée une GitHub Issue côté serveur.
- **Bouton d'installation PWA** : « Installer l'app » dans le pied de page et le menu compte ; prompt natif Chrome/Edge/Android, guide iOS et navigateurs in-app.

## [1.3.2] - 2026-07-25

### Added

- Lien **« Signaler un problème »** en pied de page : ouvre un message pré-rempli (description, étapes, comportement attendu et observé) avec le contexte technique (page, version, navigateur).
- Sonde de disponibilité applicative **`GET /health/ready`** : vérifie la joignabilité de MongoDB, renvoie 503 si la base est injoignable, et expose la version déployée.
- **Supervision de production** : trois sondes de disponibilité (API, readiness, front) interrogées depuis trois continents, cinq politiques d'alerte (indisponibilité, base injoignable, erreurs serveur, latence dégradée) notifiées par e-mail, tableau de bord d'exploitation, et alertes Sentry sur les régressions et les rafales d'erreurs.
- Vérification de la readiness dans le **smoke test de déploiement** : une révision dont la base est injoignable fait échouer sa propre mise en production.
- **Monitoring d'erreurs Sentry** sur le front (React) et l'API (.NET), en production uniquement, avec une catégorie « surveillance des erreurs » dans les préférences de confidentialité.
- **SEO global** : métadonnées par page, image Open Graph, données structurées JSON-LD et sitemap dynamique des profils publics.
- QR code de partage sur le profil public.
- Filtre de durée de film dans la recherche d'ajout (10 min ou moins à 3h et plus).
- Réglage de compte pour l'échelle de notes TMDB (affichage sur 5 ou sur 10).
- Nouveau logo (clap incliné, fond sombre) et icônes PWA régénérées.
- Version de l'application affichée dans le pied de page.

### Changed

- Portes de qualité CI désormais **bloquantes** (Quality Gate SonarCloud, Lighthouse, E2E Playwright) : un échec fait échouer le pipeline et bloque le déploiement.
- Réduction de la duplication de code : factorisation des handlers d'action sur un film (vote, « déjà vu », note de pitch, suppression), fermeture des modales mutualisée (`useModalDialog`), pied de carte film partagé entre les vues grille et liste.
- Optimisations Lighthouse : accessibilité 100/100, CLS éliminé, bundle réduit de 83 %.
- Immersion PWA Android (theme-color dynamique, safe-area) et alignements optiques (logo, pseudo/avatar).
- Cartes film : streaming affiché uniquement par abonnement, location et achat regroupés en pastilles compactes.

### Removed

- Barre de couleur du thème sur la page de détail d'une soirée.

### Fixed

- **Sessions non persistées en production** : les utilisateurs étaient déconnectés à la fermeture du navigateur, sans qu'aucun code n'ait changé. Deux causes cumulées, l'expiration au bout de 90 jours de la clé de protection des données (générée sans durée explicite, puis régénérée en éphémère à chaque démarrage à froid) et un configurateur de cookie enregistré sur une interface que la fabrique d'options ne consomme pas, donc inopérant depuis l'origine. Les clés sont désormais persistées en base et partagées entre instances et révisions, le configurateur est enregistré sur la bonne interface, la durée de session est unifiée à 30 jours glissants et un test de non-régression vérifie que la configuration s'applique réellement. Une reconnexion unique a été nécessaire au déploiement.
- Résolution des 7 signalements SonarCloud restants (règle CA1861 : tableaux constants hissés en `static readonly`).
- CSRF : les deux endpoints de lancement/clôture de la roue exigent désormais un corps JSON, alignés sur le reste de l'API.
- Accessibilité : l'animation de la roue respecte `prefers-reduced-motion` (affiche le résultat directement si la préférence système est active).
- Images cassées en production : la CSP bloquait les posters et les avatars par défaut (`img-src` incomplet).
- Cookie de session passé en `SameSite=Lax` en production.
- Bandes-annonces cassées, contraste des actions de carte film en thème clair, modale sur mobile.
- Année de film absente désormais acceptée à l'ajout ; QR code et copie du lien regroupés.
- Le skip transitif du pipeline empêchait `deploy-api` et `deploy-front` de s'exécuter.
- Envoi d'e-mails de production rebranché (`RESEND_API_KEY`, `EMAIL_PROVIDER=resend`).

### Security

- Montée de **react-router 7.18.1 vers 8.3.0** (paquet unifié `react-router`), corrigeant `GHSA-qwww-vcr4-c8h2` (contournement CSRF en mode RSC). L'API de routage utilisée est inchangée.
- Résolution des 8 alertes Dependabot ouvertes (6 hautes, 2 basses) : `fast-uri`, `shell-quote`, `brace-expansion`, `dompurify`, `linkify-it`, `js-yaml`.
- Remplacement de `pnpm audit` par Trivy sur `pnpm-lock.yaml`, le service d'audit npm ayant été retiré le 15 juillet 2026 ; l'audit ne scannait plus aucun fichier depuis son introduction.
- Déblocage du pipeline : CVE de l'image Docker de base et version de Java obsolète pour le scanner Sonar.

## [1.3.1] - 2026-07-08

### Added

- Content-Security-Policy (CSP) sur le front SPA.
- Repli sur les initiales pour l'avatar quand aucun avatar n'est choisi.

### Changed

- Refonte du pipeline CI/CD : filtrage par chemins, découpage du lint, mise en cache, images taguées par digest (temps de CI réduit de plus de moitié).
- Analyse SonarCloud basculée en mode CI (couverture ingérée, quality gate informatif).
- Refonte des cartes film : affiche immersive en grille, vue liste, modale dédiée aux plateformes de streaming.

### Removed

- Configuration de dev « mobile-web » obsolète (le prototype mobile est archivé).

### Security

- Scans de sécurité étendus en CI : dépendances NuGet vulnérables, Trivy (image Docker), Gitleaks (secrets).
- Durcissement de la sécurité applicative : validation SSRF sur la récupération des affiches TMDB, sandbox de l'iframe bande-annonce, assainissement des URLs (Security Rating SonarCloud A).

### Fixed

- Résorption de la dette technique (élimination des warnings SonarCloud .NET et TS/CSS, déduplication).
- Comblement des lacunes de tests (front, API, E2E) et relèvement des seuils de couverture front.

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

[Non publié]: https://github.com/Affy657/Movie-Picker/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/Affy657/Movie-Picker/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/Affy657/Movie-Picker/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/Affy657/Movie-Picker/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/Affy657/Movie-Picker/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Affy657/Movie-Picker/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Affy657/Movie-Picker/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Affy657/Movie-Picker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Affy657/Movie-Picker/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Affy657/Movie-Picker/releases/tag/v0.1.0
