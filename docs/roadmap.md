# Movie Picker – Roadmap

**Nom du projet : Movie Picker.**

Découpage par version, côté **métier / utilisateur** puis côté **plateforme**. Chaque version liste d'abord ses features, puis une section **Tech** pour le travail transverse.

---

## Principes

- **MVP** : parcours minimal utilisable côté utilisateur.
- **V1, V1.1, V1.2** : releases produit progressives sur la spec complète, sans casser le cœur métier.
- **V1.3 à V1.8** : polish, enrichissement, outils hôte et nouvelles surfaces produit.
- **Backlog** : idées et sujets non planifiés sur une date de release, triés régulièrement. Un backlog produit et un backlog tech, séparés, à la fin du fichier.
- **Tailles t-shirt** : chaque item porte une estimation de charge, indépendante de sa valeur produit, pour comparer les versions autrement qu'au nombre de tickets. Échelle calibrée sur l'empreinte réelle des features déjà livrées.
  - `S` : moins de 800 lignes, une seule couche (front ou API), pas de changement de modèle.
  - `M` : 800 à 2000 lignes, front et API, au plus un champ ajouté au modèle.
  - `L` : 2000 à 5000 lignes, nouvelle entité ou nouveaux endpoints, plusieurs écrans touchés.
  - `XL` : au-delà, chantier structurant à découper en sous-tâches. Aucune feature livrée n'a atteint cette bande à ce jour.
  - `?` : périmètre pas assez défini pour être estimé.
- **Poids d'une version** : somme des tailles de ses items, reportée dans le titre. `S` vaut 1, `M` vaut 3, `L` vaut 8, `XL` vaut 20 ; un `?` ne compte pas. C'est ce nombre qui permet de comparer deux versions et de décider d'y ajouter ou d'en retirer une feature.
- **Produit ou tech** : une entrée va en section Tech si elle est **transverse et indépendante de toute feature** (CI/CD, infra, sécurité de la chaîne, observabilité, outillage qualité). L'implémentation technique d'une feature (schéma, endpoints, cache) appartient à la feature elle-même.
- **Types d'entrée tech** : 🏗️ infra et déploiement, ⚙️ CI/CD et qualité, 🔒 sécurité, 📊 observabilité, ♿ accessibilité.
- **Format d'une entrée** : une ligne, ``- <statut> `type` `taille` **Titre** (version) : description``, le type n'étant porté que par les entrées tech. La description tient en une à deux phrases et 300 caractères au plus, et dit ce que l'utilisateur obtient plutôt que comment c'est construit. Le détail vit dans le code, la spec et les tests.

---

## ✅ MVP – Livré (32 points produit, 34 points tech)

**Objectif** : application démoable avec le parcours Movie Picker minimal.

- ✅ `L` **Navigation & shell** : pages accueil, création de soirée, détail soirée (`/e/:slug`) ; interface mobile-first puis responsive.
- ✅ `L` **Création & accès** : créer une soirée (titre, date, heure obligatoires) ; lien de partage unique + « Copier le lien » ; rejoindre avec pseudo obligatoire ; hôte seul habilité à lancer la roue et clôturer.
- ✅ `L` **Films** : proposition via recherche titre (TMDB) ; liste avec qui a proposé ; doublons refusés ; upvote / downvote (un vote par participant et par film) ; retirer sa proposition tant que la roue n'a pas été lancée.
- ✅ `S` **UX chargement & erreurs** : indicateurs de chargement ; en cas d'échec réseau ou API, message explicite et action « Réessayer ».
- ✅ `M` **Synchronisation** : rafraîchissement automatique des données soirée et films pour voir les autres participants sans recharger la page.
- ✅ `M` **Roue** : lancement par l'hôte ; tirage parmi les films ; animation puis film gagnant ; « Clôturer la soirée » ; cas limites (0 film, 1 film) gérés.
- ✅ `S` **Expiration & lecture seule** : soirée terminée à date/heure ; UI en lecture seule avec message adapté.

**Tech**

- ✅ 🏗️ `L` **Déploiement** : API en conteneur sur Cloud Run, front statique sur S3 et CloudFront avec repli SPA, variables et secrets documentés.
- ✅ ⚙️ `L` **CI/CD** : GitHub Actions pour la construction, les tests, l'image Docker de l'API et les deux déploiements.
- ✅ ⚙️ `M` **Qualité de code** : ESLint et Prettier côté front, `dotnet format` et analyzers côté API, `pnpm audit` en CI.
- ✅ ⚙️ `L` **Tests** : Vitest et Testing Library avec couverture côté front ; unitaires, intégration et contrat OpenAPI côté API, Playwright en local.
- ✅ 🔒 `M` **Sécurité de production** : HTTPS, CORS par liste blanche, rate limiting, secrets dans Secret Manager et en-têtes de sécurité.
- ✅ 📊 `M` **Observabilité** : journal structuré, identifiant de corrélation, erreurs JSON homogènes et métriques Cloud Run et CloudFront.
- ✅ ⚙️ `S` **Vérification locale** : `pnpm run verify:local` rejoue architecture, lint, format et les deux suites de tests avant tout envoi.

---

## ✅ V1 – Livré (42 points produit, 26 points tech)

**Objectif** : compte utilisateur, config hôte, marqueur « déjà vu », confort de partage, enrichissement film léger.

- ✅ `L` **Compte utilisateur** : inscription (email, mot de passe, pseudo), connexion, déconnexion, mot de passe oublié. **Compte obligatoire pour rejoindre une soirée** (le mode invité initial, qui permettait de rejoindre sans compte, a été retiré ensuite : trop de problèmes en usage réel).
- ✅ `S` **Création de soirée** : compte obligatoire pour créer ; lien de partage sans token hôte.
- ✅ `M` **Mes soirées** : liste persistante des soirées pour les utilisateurs connectés.
- ✅ `M` **Config par l'hôte** : thème, expiration, limite de propositions et type de roue (aléatoire ou pondérée), réglés dans les paramètres de la soirée.
- ✅ `S` **Déjà vu** : chaque participant peut marquer / démarquer un film comme « déjà vu » ; neutre pour la roue.
- ✅ `S` **Partage** : QR code en complément du lien.
- ✅ `M` **Aperçu de lien partagé (Open Graph)** : métadonnées de la soirée visibles lors du partage sur les réseaux sociaux.
- ✅ `S` **Rappels légers** : bannière in-app lorsque l'heure de début est proche.
- ✅ `S` **Mise à jour en direct** : les nouveaux films et votes apparaissent sans recharger la page.
- ✅ `M` **Interface** : mode sombre / clair.
- ✅ `M` **Disponibilité streaming** : pastilles et liens vers les plateformes de streaming disponibles (région FR).
- ✅ `S` **Indicateur « déjà vu » (autres participants)** : affichage du nombre de participants ayant déjà vu un film sur sa carte.
- ✅ `L` **Internationalisation** : FR / EN avec sélecteur de langue dans le header.
- ✅ `M` **Landing page** : page d'accueil publique avec hero, présentation des 4 étapes du parcours et CTAs connexion / inscription.
- ✅ `S` **Suppression d'événement** : l'hôte peut supprimer une soirée depuis les paramètres (zone danger).
- ✅ `S` **Expulsion d'un participant** : l'hôte peut retirer un participant de la soirée.

**Tech**

- ✅ 🏗️ `XL` **Migration de l'API vers .NET** : l'API Node.js est remplacée par ASP.NET Core entre le MVP et la V1, à routes et contrat JSON identiques.
- ✅ 🔒 `M` **Analyse statique SonarCloud** : API et front analysés à chaque envoi, quality gate bloquante sur les bugs, les vulnérabilités et les points chauds.
- ✅ 🔒 `S` **Audit des dépendances NuGet** : `dotnet list package --vulnerable` après restauration, en échec sur une faille haute ou critique.
- ✅ 🔒 `S` **Scan de l'image Docker** : recherche de CVE sur l'image taguée avant sa publication au registre.
- ✅ 🔒 `S` **Protection des secrets** : détection et blocage au push côté GitHub, procédure de rotation documentée.

---

## ✅ V1.1 – Livré (23 points produit, 3 points tech)

**Objectif** : contenu film riche, options de soirée, historique, UX avancée.

- ✅ `M` **Films** : note moyenne, durée, bande-annonce, option « Séries TV OK / pas OK » (config hôte).
- ✅ `S` **Config** : limite de participants par soirée.
- ✅ `M` **Historique** : onglet « Soirées passées » dans Mes soirées, film gagnant affiché, lecture seule.
- ✅ `M` **Interface** : personnalisation de la couleur d'UI (palette de 6 couleurs, persistance locale et compte).
- ✅ `S` **Footer global** : pied de page avec liens LinkedIn, GitHub, portfolio ; crédits TMDB obligatoires (condition d'usage de l'API) et liens légaux.
- ✅ `M` **Deep links streaming** : lien direct vers l'app ou le site du provider (Netflix, Prime Video, Disney+…) depuis la fiche film. Fallback web si l'app n'est pas installée.
- ✅ `S` **Liens critiques & bases de données** : boutons « Ouvrir sur Letterboxd », « Ouvrir sur IMDb » et « Ouvrir sur AlloCiné » dans le menu d'actions d'une card film ; redirection directe via l'ID TMDB pour Letterboxd, recherche titre + année pour IMDb et AlloCiné.
- ✅ `L` **Notifications push PWA** : abonnement VAPID depuis la page compte ; notification quand un participant rejoint la soirée (hôte) ; rappel automatique 1 h avant l'heure prévue (participants) ; préférences par notification configurables.

**Tech**

- ✅ 🏗️ `M` **PWA** : manifeste, icônes, écran de démarrage et service worker, pour l'installation sur l'écran d'accueil et un chargement partiel sans réseau.

---

## ✅ V1.2 – Livré (23 points produit, 7 points tech)

**Objectif** : vie sociale de l'app, identité utilisateur et engagement.

- ✅ `S` **Avatar utilisateur** : choix parmi un set préselectionné ; affiché à côté du pseudo dans la soirée et le profil.
- ✅ `M` **Statistiques utilisateur** : section stats sur le profil public `/u/:handle` avec 6 compteurs (soirées créées / rejointes, films proposés, votes, propositions gagnantes, films vus), barre des genres favoris (IDs TMDB persistés à l'ajout + backfill one-shot) et heatmap d'activité sur 26 semaines.
- ✅ `S` **Mini-commentaires sur une proposition** : le proposant ajoute une note de pitch de 140 caractères au plus sur son film, visible par tous et modifiable jusqu'au lancement de la roue. Le proposant comme l'hôte peuvent la supprimer.
- ✅ `M` **Profil public léger** : page `/u/:handle` (handle unique) avec avatar, pseudo, bio courte, « membre depuis » ; **public par défaut** avec opt-out ; statistiques et follow intégrés.
- ✅ `L` **Notifications in-app** : badge + liste « Invitations reçues » dans Mes soirées.
- ✅ `M` **Invitations in-app** : invitation directe à un autre utilisateur en complément du lien de partage.
- ✅ `M` **Follow léger entre utilisateurs** : retrouver facilement ses potes sur l'app pour les réinviter ; brique de base des invitations in-app.
- ✅ `S` **Historique de recherche dans la barre de film** : dans la page soirée, la barre de recherche de films affiche les dernières recherches effectuées par l'utilisateur ; sélection rapide d'une recherche passée en un clic ; effacement individuel ou global de l'historique ; persistance locale (localStorage) par utilisateur.

**Tech**

- ✅ ♿ `S` **Accessibilité étendue** : lien d'évitement, focus visible global, navigation clavier complète et couverture axe sur sept pages.
- ✅ 🔒 `M` **Bandeau de consentement** : choix granulaire au premier accès, persistant et modifiable depuis le footer ; il conditionne le chargement de tout SDK tiers.
- ✅ 📊 `M` **Analytics produit** : mesure d'usage et entonnoirs via PostHog, en production seule et seulement après consentement.

---

## ✅ V1.3 – Livré (28 points produit, 4 points tech)

**Objectif** : polish et qualité perçue, avec roue visuelle, finitions UX, conformité légale et enrichissement des données film.

- ✅ `M` **Vraie roue de tirage** : remplacer l'animation actuelle par une roue visuelle avec les titres des films sur chaque segment ; rotation physique puis ralentissement progressif jusqu'au film gagnant.
- ✅ `M` **Suppression de compte + export RGPD** : depuis la page profil, suppression définitive et téléchargement de ses données (soirées, votes, films proposés).
- ✅ `S` **Pages d'erreur dédiées** : 404 route / soirée introuvable, 500 erreur serveur, message clair et lien vers l'accueil.
- ✅ `S` **Empty states** : composant partagé `EmptyState` (icône + titre + message + CTA) appliqué à « Mes soirées » vide, liste de films vide, aucun participant, inbox notifications et abonnements/abonnés.
- ✅ `M` **Location & achat (VOD)** : afficher sur la fiche film les plateformes où le film est disponible à la location ou à l'achat (Amazon, Apple TV, Google Play…) en complément des abonnements streaming déjà affichés ; distinction visuelle claire entre les trois modes (abonnement / location / achat).
- ✅ `S` **Tri de la liste de films** : trier les films proposés par score de votes, note TMDB, durée ou ordre d'ajout.
- ✅ `M` **Recherche avancée de films** : filtrer par genre, plage d'années, note minimale et langue originale dans la barre de recherche TMDB lors de la proposition.
- ✅ `S` **Tooltips globaux** : info-bulles cohérentes sur les icônes et actions moins évidentes (boutons d'action, scores TMDB, badges, pastilles streaming).
- ✅ `M` **Accessibilité (a11y baseline)** : navigation clavier cohérente, focus trap dans les modals, aria-labels sur les éléments interactifs.
- ✅ `S` **Export calendrier (.ics)** : bouton « Ajouter au calendrier » sur la soirée, compatible Google Calendar, Outlook, Apple Calendar.
- ✅ `L` **Refonte de la page soirée** : barre de soirée avec état et compte à rebours, actions de décision toujours à portée, participants repliés derrière une pile d'avatars, réglages hôte derrière un engrenage et partage regroupé dans un menu « Inviter ».

**Tech**

- ✅ ⚙️ `S` **Dependabot** : mises à jour groupées mensuelles sur npm, NuGet, Docker et les actions, plus les correctifs de sécurité automatiques.
- ✅ 📊 `M` **Sentry** : erreurs front et API remontées dans deux projets SaaS européens, sans donnée personnelle, source maps et version liées au commit.

---

## ✅ V1.4 – Livré (49 points produit, 3 points tech)

**Objectif** : outils hôte avancés, bibliothèque personnelle, engagement utilisateur et ouverture de la plateforme, avec watchlist, intégration Letterboxd, sélection manuelle, streak de soirées, connexion sociale, dons, bouton pour proposer une idée et modale de nouveautés.

- ✅ `L` **Watchlist personnelle** : liste de films « à voir » par utilisateur ; ajout depuis la recherche TMDB ; proposition rapide d'un film depuis sa watchlist directement dans une soirée.
- ✅ `XL` **Intégration Letterboxd** : synchronisation bidirectionnelle de la watchlist à partir du pseudo Letterboxd, rafraîchie automatiquement. Import immédiat à la demande avec écran de revue des correspondances, sans jamais toucher aux films ajoutés directement dans Movie Picker.
- ✅ `M` **Sélection manuelle du film gagnant** : alternative au tirage par la roue, l'hôte bascule en « choix manuel », les cards de films se mettent à trembler et il désigne lui-même le gagnant. Même animation de révélation qu'un tirage, badge « Choisi par l'hôte » et notification aux participants.
- ✅ `S` **Flamme streak de soirées** : compteur de semaines consécutives où l'utilisateur a participé à une soirée avec tirage, affiché en flamme sur son profil public. Colorée et animée tant que le streak est actif, grisée sinon ; le meilleur streak atteint figure dans les statistiques.
- ✅ `S` **Exclusion d'un film de la roue** : l'hôte écarte un film du tirage sans le retirer de la liste ; il reste visible, votable et commentable, mais grisé. Réversible à tout moment, y compris après un tirage.
- ✅ `L` **Connexion sociale (OAuth)** : connexion et inscription via Google ou GitHub en complément de l'e-mail / mot de passe. Section « Connexions » sur la page Compte pour lier ou délier un fournisseur, sans jamais pouvoir retirer sa dernière méthode de connexion.
- ✅ `M` **Système de dons** : page publique « Soutenir Movie Picker » qui expose les frais réels du service et renvoie vers Ko-fi pour un don libre, ponctuel ou mensuel. Strictement facultatif, aucune fonctionnalité réservée aux donateurs, la seule contrepartie est un badge « Soutien » décoratif sur le profil public.
- ✅ `S` **Modale de nouveautés** : à la première visite suivant une mise à jour, une modale résume ce qui a changé dans la version. Affichée une seule fois par version, et consultable ensuite à la demande.
- ✅ `M` **Bouton « Proposer une idée »** : action unique accessible depuis le footer ou le menu compte, titre et description libre ; la soumission crée automatiquement une GitHub Issue sur le dépôt via l'API GitHub (token serveur, aucune credential exposée côté client) ; confirmation visuelle après envoi.
- ✅ `S` **Bouton d'installation PWA** (2026-08-24) : « Installer l'app » dans le footer et le menu compte ; prompt natif Chrome/Edge/Android, guide iOS et navigateurs in-app, masqué une fois l'app ouverte en standalone.

**Tech**

- ✅ 🔒 `M` **OAuth, volet infra** : bibliothèque OAuth côté API et secrets dédiés par fournisseur, un fournisseur sans secret étant masqué sans erreur. Les applications Google et GitHub restent à créer hors du dépôt.

---

## ✅ V1.5 – Livré (36 points)

**Objectif** : home page inspirationnelle, qui transforme l'accueil en vrai point d'entrée du produit, accessible sans compte et enrichi une fois connecté.

Les cinq blocs connecté restants ont été renvoyés au backlog : aucun n'est nécessaire pour que la home tienne debout, et deux dépendent d'un chantier d'une autre version.

### 🏠 Home page

> Page accessible avec ou sans compte, enrichie de rangées personnelles une fois connecté. La landing marketing est déplacée sur `/decouvrir` plutôt que remplacée.

- ✅ `M` **Navigation ouverte aux visiteurs sans compte** (v1.4.1) : nav, footer et cinq pages accessibles sans compte, avec un état déconnecté dédié et un appel à la connexion ou à l'inscription. `/decouvrir` devient la page publique indexable à la place de la racine.

- ✅ `L` **Refonte de la landing page** (V1.5) : neuf sections en FR et EN, de l'accroche à l'appel à l'action, avec une roue jouable et l'interface du produit reconstruite en CSS. Devenue « Comment ça marche » sur `/decouvrir` quand la home d'exploration a repris la racine.

**Blocs visibles sans compte**, livrés en V1.5. La racine `/` porte la home d'exploration pour tout le monde, connecté ou non, la landing marketing vit sur `/decouvrir`, et chaque bloc a sa page liste filtrable (`ShowcaseListPage`) alimentée par `GET /api/v1/movies/showcase`. Chaque bloc est un carrousel à défilement horizontal, avec flèches sur appareil pointeur et balayage au doigt.
- ✅ `M` **Films tendance de la semaine** (V1.5) : carrousel sur la racine, cent films chargés par section dont vingt montés dans le carrousel, lien « Voir les N films » vers la page liste filtrable.
- ✅ `S` **Suggestions thématiques** (V1.5) : dix thèmes déclarés côté API (frissons, comédies françaises, années 80, années 90, années 2000, braquages, pépites A24, moins de 90 minutes, les indétrônables, en famille), sélectionnables en onglets.
- ✅ `M` **Les plus proposés sur Movie Picker** (V1.5) : agrégation sur les films de soirées, un film entre au classement à partir de deux soirées distinctes, le bloc s'affiche à partir de trente films distincts.
- ✅ `S` **Collections TMDB** (V1.5) : douze franchises curées, grille dédiée sur `/films/collections`, page par saga sur `/films/collection/:id`.
- ✅ `M` **Recherche de films depuis la home** (V1.5) : champ en tête de page qui ouvre `/films/recherche?q=…`, la même page liste que les autres blocs, fiche film comprise.
- ✅ `M` **Recherche par réalisateur et acteur** (V1.5) : le nom d'une personne ramène sa filmographie, rôles joués et films réalisés, en plus des titres qui correspondent au texte saisi. La personne la plus populaire est retenue, et ses films passent devant quand le nom est saisi en entier.
- ✅ `S` **Films populaires par genre** (V1.5) : onglets en pastilles sur le bloc tendances, clavier compris, réutilisant la primitive `Tabs`.
- ✅ `S` **Actuellement au cinéma** (V1.5) : endpoint TMDB « Now Playing » région FR, même rangée et même page liste que les autres blocs.
- ✅ `S` **Ce soir en streaming** (V1.5) : onglets par plateforme (Netflix, Prime Video, Disney+, Canal+, Apple TV+) via `with_watch_providers` sur la région configurée, page liste sur `/films/streaming/:provider`.

**Blocs visibles connecté uniquement** : la racine ne redirige plus vers Mes soirées, elle sert la même home enrichie de rangées personnelles ; une entrée « Explorer » ouvre la page depuis la nav et depuis la barre du bas mobile. Une rangée personnelle vide ne se rend pas du tout.

- ✅ `S` **Films de la watchlist** (V1.5) : rangée « Dans votre liste » alimentée par la watchlist personnelle, fiche film et lien vers `/watchlist`.
- ✅ `M` **Films des personnes suivies** (V1.5) : rangée « Vos amis ont vu » sur `GET /api/v1/users/me/following-watched-movies`, agrégation des soirées terminées des comptes suivis, dédoublonnée par film ; les profils passés en privé sont exclus.
- ✅ `S` **Films de la prochaine soirée** (V1.5) : rangée « À voir avant votre prochaine soirée » listant les films proposés pour la soirée active la plus proche, avec accès direct à cette soirée.
- ✅ `M` **Recommandations personnelles** (V1.5) : rangée « Parce que vous avez aimé », recommandations TMDB amorcées sur le dernier film vu, page liste sur `/films/similaires/:seedTmdbId`.

---

## 📋 V1.6 – Planifiée (26 points, 4 restants)

**Objectif** : compléter la boucle sociale entamée en V1.2 et ritualiser la soirée. Items classés par valeur utilisateur décroissante.

- ✅ `M` **Recherche d'utilisateurs** (V1.6) : onglet « Rechercher » dans la modale Abonnements / Abonnés, qui trouve un compte par pseudo ou par handle, en sous-chaîne et sans tenir compte de la casse ni des accents. Les profils privés sont exclus, vingt résultats au plus.
- ✅ `L` **Soirée récurrente** (V1.6) : réglage « Répéter cette soirée » au rythme hebdomadaire, bimensuel ou mensuel ; la soirée suivante naît à la clôture de la précédente, avec la même configuration et une liste de films vide. Une seule occurrence ouverte à la fois, et l'hôte coupe la série quand il veut.
- ✅ `M` **Templates de soirée** (V1.6) : jusqu'à cinq configurations nommées par compte, enregistrées depuis la création d'une soirée comme depuis les paramètres d'une soirée existante, et réappliquées en un clic. Le menu d'une soirée passée propose en plus « Refaire cette soirée ».
- ✅ `L` **Plusieurs films gagnants par soirée** (V1.6) : l'hôte règle le nombre de films gagnants jusqu'à dix, et chaque tirage ajoute un film au palmarès en l'excluant des suivants. Les gagnants comptent partout : historique, statistiques, partage et « Vos amis ont vu ».
- ⬜ `S` **Plage de votes configurable** : l'hôte définit le nombre maximum de votes pour et contre par participant, dans les paramètres de la soirée.
- ⬜ `M` **Watchlist d'un autre utilisateur** : consulter la watchlist d'un compte depuis son profil public `/u/:handle`, avec un réglage de visibilité dédié, indépendant de celui du profil.

---

## 📋 V1.7 – Planifiée (34 points)

**Objectif** : faire passer la soirée en temps réel et armer l'hôte, avec la sécurité du compte en complément.

- ⬜ `L` **Thème imposé par l'hôte** : contrainte de proposition posée par l'hôte (genre, décennie, acteur, réalisateur ou classification d'âge maximale) ; les films qui ne la respectent pas sont refusés avec un message explicite, et la contrainte s'affiche en bannière sur la page soirée.
- ⬜ `M` **Avertissements de contenu** : badges violence / horreur / 18+ sur les fiches films ; option hôte « masquer les films 18+ » pour soirées familiales.
- ⬜ `L` **Co-hôte** : l'hôte peut désigner un ou plusieurs participants comme co-hôtes ; mêmes droits que l'hôte (lancer la roue, expulser un participant, modifier les paramètres) sauf supprimer la soirée.
- ⬜ `L` **Synchronisation temps réel** : remplacer le polling par une connexion temps réel ; propositions, votes et arrivées de participants apparaissent sans délai perceptible.
- ⬜ `M` **Présence sur la page soirée** : avatars des participants actuellement connectés et signal « en train de proposer un film », posés sur la connexion temps réel.
- ⬜ `M` **Double authentification (2FA/TOTP)** : code à six chiffres généré par une application d'authentification, activable en option dans les paramètres de compte.
- ⬜ `S` **FAQ / Centre d'aide** : page qui répond aux questions récurrentes (fonctionnement de la roue, invitation, votes), accessible depuis le footer.


---

---

## 📋 V1.8 – Planifiée (39 points)

**Objectif** : ce que chacun garde de ses soirées, des notes aux films vus, et le confort personnel au quotidien.

- ⬜ `M` **Note d'un film vu** : noter un film qu'on vient de voir directement dans Movie Picker, sur l'échelle choisie dans les paramètres de compte. Un bouton renvoie vers sa fiche Letterboxd ou IMDb pour l'y noter aussi.
- ⬜ `L` **Import des films vus depuis Letterboxd** : reprendre les films déjà vus d'un compte Letterboxd avec la note posée sur chacun, qui alimentent le marqueur « déjà vu » et les notes Movie Picker. Complète la synchronisation de watchlist livrée en V1.4.
- ⬜ `L` **Partage de soirée en story** : carte recap partageable après la soirée, avec le ou les films gagnants, les participants et les notes de chacun, au format des stories des réseaux sociaux.
- ⬜ `L` **Palette de commandes (Cmd+K)** : accès clavier global aux actions et à la navigation ; recherche floue sur les soirées, les films et les utilisateurs, création de soirée, changement de thème.
- ⬜ `M` **Top 3 films préférés sur le profil** : sélectionner et afficher trois films favoris sur son profil public `/u/:handle` via une recherche TMDB, visibles par tous et modifiables depuis les paramètres.
- ⬜ `M` **Photo de profil personnalisée** : téléverser une image comme photo de profil, en remplacement de l'avatar généré actuel.
- ⬜ `M` **Consultation hors-ligne de la dernière soirée** : la dernière vue soirée reste lisible sans réseau, avec une bannière « Données en cache, reconnexion en cours ». Lecture seule : les actions attendent le retour du réseau.
- ⬜ `S` **Détail des films vus** : le compteur « films vus » des statistiques du profil devient cliquable et ouvre la liste des films marqués « déjà vu ».
- ⬜ `S` **Pioche aléatoire dans la watchlist** : bouton qui tire un film au hasard parmi les films à voir de la watchlist, proposable dans une soirée en un clic.
- ⬜ `S` **Écart watchlist Movie Picker / Letterboxd** : pour les comptes synchronisés, badge sur les films de la watchlist Movie Picker absents de celle de Letterboxd, typiquement ceux ajoutés depuis une soirée.

---

## Backlog produit (non priorisé sur une release) (156 points, 1 non estimé)

> **Note V2, application mobile** : l'app mobile (Expo / React Native) était un projet de cours, archivée dans `archive/mobile` (mai 2026). Pour la V2, l'objectif est une app mobile propre, pleinement intégrée à la plateforme. Pas d'engagement de date.

- `L` **Reprise des actions faites hors-ligne** : file d'attente des votes et propositions passés sans réseau, rejoués et arbitrés à la reconnexion. Depend de la synchronisation temps réel (V1.7) et de la consultation hors-ligne (V1.8).
- `XL` **Mode Battle / Tournoi** : alternative à la roue, l'hôte lance un tournoi en duels ; deux films s'affrontent, les participants votent, et le gagnant passe au tour suivant jusqu'au champion.
- `M` **i18n étendue** : langues supplémentaires au-delà de FR / EN ; variantes régionales, RTL si besoin.
- `L` **Cercles d'amis** : groupes persistants d'utilisateurs réutilisables d'une soirée à l'autre ; invitation en un clic de tout le cercle.
- `M` **Réactions rapides sur les films** : emojis (❤️ 🔥 😴…) posés sur une card film en complément des votes up/down, plus expressif, moins binaire.
- `L` **Badges / achievements** : 4 badges (Organisateur, Cinéphile, Faiseur de rois, Juré assidu), code de calcul supprimé ; à concevoir avec un design abouti et réimplémenter.
- `M` **Compatibilité ciné** : score de compatibilité cinématographique avec un ami basé sur les films « déjà vu » en commun ; nécessite les statistiques utilisateur et potentiellement l'intégration Letterboxd pour être complet.
- `S` **Statistique : note moyenne des films gagnants** : ajouter dans la section stats du profil public la moyenne des notes TMDB des films tirés gagnants dans les soirées auxquelles l'utilisateur a participé ; aucune infra supplémentaire, les notes TMDB sont déjà stockées avec les films.
- `S` **Home : prochaine soirée mise en avant** : carte principale avec titre, heure et accès direct à la soirée imminente, ce qui évite de passer par « Mes soirées ». La rangée « À voir avant votre prochaine soirée » livrée en V1.5 donne déjà l'accès, sans la mise en avant.
- `S` **Home : invitations en attente** : rappel des invitations non répondues directement sur la home, plus visible que les notifications seules.
- `S` **Home : soirée rapide** : bouton « Créer une soirée » avec la dernière config utilisée en un clic ; dépend des templates de soirée (V1.6).
- `S` **Home : derniers films gagnants** : les 3-4 films tirés dans ses propres soirées récentes, ce qui évite de reproposer un film qu'on vient de voir. Distinct de « Vos amis ont vu », livré en V1.5, qui couvre les soirées des comptes suivis.
- `M` **Fil d'activité des follows** : événements sociaux (soirée créée par un ami, soirée clôturée) au-delà des seuls films vus, dont la rangée « Vos amis ont vu » couvre déjà la moitié.
- `L` **Sondage de disponibilité** : avant de créer une soirée, l'hôte propose plusieurs créneaux à ses follows et chacun coche ses disponibilités. L'hôte retient le créneau final, qui crée la soirée.
- `L` **Plateformes streaming par compte** : chaque utilisateur renseigne ses abonnements dans ses paramètres, et la page d'une soirée affiche les plateformes communes à tous les participants. Les films peuvent être filtrés à celles-ci.
- `XL` **Messages privés** : messagerie directe entre deux utilisateurs qui se suivent mutuellement ; accessible depuis le profil public ou la liste de follows ; permet d'organiser une soirée ou d'échanger en dehors du contexte d'une soirée existante.
- `M` **Proposition de film anonyme** : option dans les paramètres de la soirée activable par l'hôte ; le nom du proposant n'est plus affiché sur les cards de films tant que la roue n'a pas été lancée, pour éviter les votes d'affinité plutôt que de goût.
- `L` **Chat de soirée** : panneau de discussion en temps réel sur la page soirée, latéral sur desktop et en onglet sur mobile. Destiné à remplacer les mini-commentaires par film par un seul espace d'échange.
- `?` **Événements hebdomadaires** : dépend de la home page V1.5, événement qui change chaque semaine, sous différentes formes possibles (thème à respecter dans le film gagnant d'une soirée, événement saisonnier type Halloween ou Noël, etc.) ; à définir plus précisément une fois la home page livrée.
- `S` **Description de soirée** : champ de description libre en complément du titre à la création d'une soirée, modifiable ensuite par l'hôte ; affiché sur la page soirée pour donner du contexte (thème de la soirée, consignes, etc.).
- `M` **Soirée à distance synchronisée** : intégrer dans le parcours soirée l'usage d'une extension de visionnage synchronisé existante (Teleparty, Scener…) ; une fois le film gagnant désigné, la page soirée guide l'hôte pour lancer une session et partage le lien généré aux participants via le mécanisme d'invitation existant.
- `XL` **Vrai support des séries (progression par épisode)** : suivre la saison et l'épisode en cours d'une série et le prochain à voir, via les endpoints TMDB dédiés. Remplace le traitement actuel d'une série comme un simple film.
- `M` **Connexion Discord, Meta et Twitch** : trois fournisseurs OAuth supplémentaires aux côtés de Google et GitHub, dans la section « Connexions » existante.
- `L` **Passkeys (WebAuthn)** : connexion sans mot de passe via biométrie ou PIN de l'appareil, en complément de l'e-mail / mot de passe et des fournisseurs OAuth.
- `M` **Sessions actives** : liste des appareils et navigateurs connectés dans la section « Connexions », avec révocation individuelle.
- `M` **Alerte nouvelle connexion** : e-mail automatique envoyé à l'utilisateur lors d'une connexion depuis un nouvel appareil ou navigateur.
- `S` **Contact / Support** : formulaire ou adresse dédiée pour signaler un problème, distinct du bouton « Proposer une idée » réservé aux suggestions de features.
- `M` **Onboarding pour nouveaux utilisateurs** : mini tour guidé ou écran de bienvenue à la première connexion, expliquant le concept (créer une soirée, voter, la roue).
- `M` **Statut du service** : page publique indiquant si l'API et le site sont opérationnels.

---

## Backlog tech (non priorisé sur une release) (23 points)

> **Note, découpage du chantier Terraform** : l'item `XL` d'origine est coupé en huit lots livrables un par un, dans leur ordre de dépendance. Les lots 3 et 4 sortent le front d'AWS avant les lots d'identité et de CI : décrire puis outiller un hébergement qu'on s'apprête à supprimer serait du travail jeté. Le gain visé est la consolidation, pas l'économie.

- ⬜ 🏗️ `S` **Terraform 1, socle et état distant** : arborescence dédiée, versions épinglées, état distant versionné et verrouillé, `fmt` et `validate` ajoutés à la vérification locale et à la CI. Aucune ressource décrite à ce stade.
- ⬜ 🏗️ `M` **Terraform 2, prod GCP décrite et importée** : registre d'images, service Cloud Run et entrées Secret Manager décrits puis **importés**, jamais recréés. Le lot est fini quand `terraform plan` revient vide sur la prod en service.
- ⬜ 🏗️ `M` **Terraform 3, front hébergé sur GCP** : cible GCP décrite avec parité stricte sur le repli SPA, les en-têtes de sécurité et les trois paliers de cache de CloudFront. Publiée en parallèle et vérifiée sur un sous-domaine temporaire, sans impact utilisateur.
- ⬜ 🏗️ `S` **Terraform 4, bascule DNS et sortie d'AWS** : élargir les origines autorisées, repointer le CNAME chez OVH, observer les sondes, puis supprimer distribution, bucket, certificat et utilisateur IAM. Le certificat est un wildcard : vérifier qu'aucun autre sous-domaine ne s'en sert.
- ⬜ 🔒 `M` **Terraform 5, IAM décrit et clés longue durée retirées** : comptes de service au moindre privilège pour l'exécution comme pour le pipeline, et la clé JSON de déploiement remplacée par une fédération d'identité.
- ⬜ ⚙️ `S` **Terraform 6, plan en PR et apply sur master** : job dédié, `plan` publié en commentaire de PR, `apply` derrière l'environnement de production. Une dérive de configuration se voit alors en revue plutôt qu'en incident.
- ⬜ 📊 `M` **Terraform 7, supervision décrite en IaC** : les trois sondes de disponibilité, les cinq politiques d'alerte, le canal de notification et le tableau de bord, aujourd'hui créés par appels d'API et non versionnés.
- ⬜ 🏗️ `L` **Terraform 8, environnement de recette** : seconde instanciation des modules des lots 2, 3 et 5, avec son entrée DNS et un déploiement qui passe par la recette avant la prod. Son coût dépend entièrement des lots précédents.

> **Note, cible d'hébergement du front (lot 3)** : Firebase Hosting plutôt que Cloud Storage et Cloud CDN, dont la règle de transfert coûte près de 18 $ par mois avant le premier octet servi et ferait sortir le projet du « 0 €/mois » suivi comme indicateur. Seul point à surveiller : 360 Mo par jour, loin du trafic mesuré.
