# Movie Picker – Roadmap produit 

**Nom du projet : Movie Picker.**

Découpage par version côté **métier / utilisateur**.
- Spec complète → [spec.md](spec.md).
- Roadmap **plateforme & qualité** → [roadmap-tech.md](roadmap-tech.md).

---

## Principes

- **MVP** : parcours minimal utilisable côté utilisateur.
- **V1, V1.1, V1.2** : releases produit progressives sur la spec complète, sans casser le cœur métier.
- **V1.3, V1.4, V1.5, V1.6, V1.7** : polish, enrichissement, outils hôte et nouvelles surfaces produit.
- **Backlog** : idées et sujets non planifiés sur une date de release (tri régulier).
- **Tailles t-shirt** : chaque item porte une estimation de charge, indépendante de sa valeur produit, pour comparer les versions autrement qu'au nombre de tickets. Échelle calibrée sur l'empreinte réelle des features déjà livrées.
  - `S` : moins de 800 lignes, une seule couche (front ou API), pas de changement de modèle.
  - `M` : 800 à 2000 lignes, front et API, au plus un champ ajouté au modèle.
  - `L` : 2000 à 5000 lignes, nouvelle entité ou nouveaux endpoints, plusieurs écrans touchés.
  - `XL` : au-delà, chantier structurant à découper en sous-tâches. Aucune feature livrée n'a atteint cette bande à ce jour.
  - `?` : périmètre pas assez défini pour être estimé.

---

## ✅ MVP – Livré

**Objectif** : application démoable avec le parcours Movie Picker minimal.

- ✅ `L` **Navigation & shell** : pages accueil, création de soirée, détail soirée (`/e/:slug`) ; interface mobile-first puis responsive.
- ✅ `L` **Création & accès** : créer une soirée (titre, date, heure obligatoires) ; lien de partage unique + « Copier le lien » ; rejoindre avec pseudo obligatoire ; hôte seul habilité à lancer la roue et clôturer.
- ✅ `L` **Films** : proposition via recherche titre (TMDB) ; liste avec qui a proposé ; doublons refusés ; upvote / downvote (un vote par participant et par film) ; retirer sa proposition tant que la roue n'a pas été lancée.
- ✅ `S` **UX chargement & erreurs** : indicateurs de chargement ; en cas d'échec réseau ou API, message explicite et action « Réessayer ».
- ✅ `M` **Synchronisation** : rafraîchissement automatique des données soirée et films pour voir les autres participants sans recharger la page.
- ✅ `M` **Roue** : lancement par l'hôte ; tirage parmi les films ; animation puis film gagnant ; « Clôturer la soirée » ; cas limites (0 film, 1 film) gérés.
- ✅ `S` **Expiration & lecture seule** : soirée terminée à date/heure ; UI en lecture seule avec message adapté.

---

## ✅ V1 – Livré

**Objectif** : compte utilisateur, config hôte, marqueur « déjà vu », confort de partage, enrichissement film léger.

- ✅ `L` **Compte utilisateur** : inscription (email, mot de passe, pseudo), connexion, déconnexion, mot de passe oublié. **Compte obligatoire pour rejoindre une soirée** (le mode invité initial — rejoindre sans compte — a été retiré ensuite : trop de problèmes en usage réel).
- ✅ `S` **Création de soirée** : compte obligatoire pour créer ; lien de partage sans token hôte.
- ✅ `M` **Mes soirées** : liste persistante des soirées pour les utilisateurs connectés.
- ✅ `M` **Config par l'hôte** : paramètres de la soirée — thème, expiration, limite de propositions, type de roue (aléatoire / pondérée).
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

---

## ✅ V1.1 – Livré

**Objectif** : contenu film riche, options de soirée, historique, UX avancée.

- ✅ `M` **Films** : note moyenne, durée, bande-annonce, option « Séries TV OK / pas OK » (config hôte).
- ✅ `S` **Config** : limite de participants par soirée.
- ✅ `M` **Historique** : onglet « Soirées passées » dans Mes soirées, film gagnant affiché, lecture seule.
- ✅ `M` **Interface** : personnalisation de la couleur d'UI (palette de 6 couleurs, persistance locale et compte).
- ✅ `S` **Footer global** : pied de page avec liens LinkedIn, GitHub, portfolio ; crédits TMDB obligatoires (condition d'usage de l'API) et liens légaux.
- ✅ `M` **Deep links streaming** : lien direct vers l'app ou le site du provider (Netflix, Prime Video, Disney+…) depuis la fiche film. Fallback web si l'app n'est pas installée.
- ✅ `S` **Liens critiques & bases de données** : boutons « Ouvrir sur Letterboxd », « Ouvrir sur IMDb » et « Ouvrir sur AlloCiné » dans le menu d'actions d'une card film ; redirection directe via l'ID TMDB pour Letterboxd, recherche titre + année pour IMDb et AlloCiné.
- ✅ `L` **Notifications push PWA** : abonnement VAPID depuis la page compte ; notification quand un participant rejoint la soirée (hôte) ; rappel automatique 1 h avant l'heure prévue (participants) ; préférences par notification configurables.

---

## ✅ V1.2 – Livré

**Objectif** : vie sociale de l'app, identité utilisateur et engagement.

- ✅ `S` **Avatar utilisateur** : choix parmi un set préselectionné ; affiché à côté du pseudo dans la soirée et le profil.
- ✅ `M` **Statistiques utilisateur** : section stats sur le profil public `/u/:handle` — 6 compteurs (soirées créées / rejointes, films proposés, votes, propositions gagnantes, films vus), barre des genres favoris (IDs TMDB persistés à l'ajout + backfill one-shot) et heatmap d'activité sur 26 semaines.
- ✅ `S` **Mini-commentaires sur une proposition** : note de pitch (≤ 140 caractères) posée par le proposant sur son film ; visible par tous ; bulle de texte avec avatar du proposant ; éditable au clic par le proposant, supprimable par le proposant (body vide) ou l'hôte (sans participantId requis) ; lecture seule après le lancement de la roue ; rate limiting 60 req/min.
- ✅ `M` **Profil public léger** : page `/u/:handle` (handle unique) — avatar, pseudo, bio courte, « membre depuis » ; **public par défaut** avec opt-out ; statistiques et follow intégrés.
- ✅ `L` **Notifications in-app** : badge + liste « Invitations reçues » dans Mes soirées.
- ✅ `M` **Invitations in-app** : invitation directe à un autre utilisateur en complément du lien de partage.
- ✅ `M` **Follow léger entre utilisateurs** : retrouver facilement ses potes sur l'app pour les réinviter ; brique de base des invitations in-app.
- ✅ `S` **Historique de recherche dans la barre de film** : dans la page soirée, la barre de recherche de films affiche les dernières recherches effectuées par l'utilisateur ; sélection rapide d'une recherche passée en un clic ; effacement individuel ou global de l'historique ; persistance locale (localStorage) par utilisateur.

---

## ✅ V1.3 – Livré

**Objectif** : polish & qualité perçue — roue visuelle, finitions UX, conformité légale et enrichissement des données film.

- ✅ `M` **Vraie roue de tirage** : remplacer l'animation actuelle par une roue visuelle avec les titres des films sur chaque segment ; rotation physique puis ralentissement progressif jusqu'au film gagnant.
- ✅ `M` **Suppression de compte + export RGPD** : depuis la page profil — suppression définitive et téléchargement de ses données (soirées, votes, films proposés).
- ✅ `S` **Pages d'erreur dédiées** : 404 route / soirée introuvable, 500 erreur serveur — message clair et lien vers l'accueil.
- ✅ `S` **Empty states** : composant partagé `EmptyState` (icône + titre + message + CTA) appliqué à « Mes soirées » vide, liste de films vide, aucun participant, inbox notifications et abonnements/abonnés.
- ✅ `M` **Location & achat (VOD)** : afficher sur la fiche film les plateformes où le film est disponible à la location ou à l'achat (Amazon, Apple TV, Google Play…) en complément des abonnements streaming déjà affichés ; distinction visuelle claire entre les trois modes (abonnement / location / achat).
- ✅ `S` **Tri de la liste de films** : trier les films proposés par score de votes, note TMDB, durée ou ordre d'ajout.
- ✅ `M` **Recherche avancée de films** : filtrer par genre, plage d'années, note minimale et langue originale dans la barre de recherche TMDB lors de la proposition.
- ✅ `S` **Tooltips globaux** : info-bulles cohérentes sur les icônes et actions moins évidentes (boutons d'action, scores TMDB, badges, pastilles streaming).
- ✅ `M` **Accessibilité (a11y baseline)** : navigation clavier cohérente, focus trap dans les modals, aria-labels sur les éléments interactifs.
- ✅ `S` **Export calendrier (.ics)** : bouton « Ajouter au calendrier » sur la soirée, compatible Google Calendar, Outlook, Apple Calendar.
- ✅ `L` **Refonte de la page soirée** : barre de soirée avec pastille d'état et compte à rebours, actions de décision toujours accessibles (barre collante sur desktop, barre basse sur mobile), participants repliés derrière une pile d'avatars avec mode « Gérer », réglages hôte derrière un engrenage, partage / QR / calendrier regroupés dans un menu « Inviter », colonne élargie pour trois cartes film de front.

---

## ✅ V1.4 – Livré

**Objectif** : outils hôte avancés, bibliothèque personnelle, engagement utilisateur et ouverture de la plateforme — watchlist, intégration Letterboxd, sélection manuelle, streak de soirées, connexion sociale, dons, bouton pour proposer une idée et modale de nouveautés.

- ✅ `L` **Watchlist personnelle** : liste de films « à voir » par utilisateur ; ajout depuis la recherche TMDB ; proposition rapide d'un film depuis sa watchlist directement dans une soirée.
- ✅ `XL` **Intégration Letterboxd** : synchronisation bidirectionnelle de la watchlist à partir du pseudo Letterboxd, rafraîchie automatiquement. Import immédiat à la demande avec écran de revue des correspondances, sans jamais toucher aux films ajoutés directement dans Movie Picker.
- ✅ `M` **Sélection manuelle du film gagnant** : alternative au tirage par la roue — l'hôte bascule en « choix manuel », les cards de films se mettent à trembler et il désigne lui-même le gagnant. Même animation de révélation qu'un tirage, badge « Choisi par l'hôte » et notification aux participants.
- ✅ `S` **Flamme streak de soirées** : compteur de semaines consécutives où l'utilisateur a participé à une soirée avec tirage, affiché en flamme sur son profil public. Colorée et animée tant que le streak est actif, grisée sinon ; le meilleur streak atteint figure dans les statistiques.
- ✅ `S` **Exclusion d'un film de la roue** : l'hôte écarte un film du tirage sans le retirer de la liste — il reste visible, votable et commentable, mais grisé. Réversible à tout moment, y compris après un tirage.
- ✅ `L` **Connexion sociale (OAuth)** : connexion et inscription via Google ou GitHub en complément de l'e-mail / mot de passe. Section « Connexions » sur la page Compte pour lier ou délier un fournisseur, sans jamais pouvoir retirer sa dernière méthode de connexion.
- ✅ `M` **Système de dons** : page publique « Soutenir Movie Picker » qui expose les frais réels du service et renvoie vers Ko-fi pour un don libre, ponctuel ou mensuel. Strictement facultatif — aucune fonctionnalité réservée aux donateurs, la seule contrepartie est un badge « Soutien » décoratif sur le profil public.
- ✅ `S` **Modale de nouveautés** : à la première visite suivant une mise à jour, une modale résume ce qui a changé dans la version. Affichée une seule fois par version, et consultable ensuite à la demande.
- ✅ `M` **Bouton « Proposer une idée »** : action unique accessible depuis le footer ou le menu compte — titre + description libre ; la soumission crée automatiquement une GitHub Issue sur le dépôt via l'API GitHub (token serveur, aucune credential exposée côté client) ; confirmation visuelle après envoi.
- ✅ `S` **Bouton d'installation PWA** (2026-08-24) : « Installer l'app » dans le footer et le menu compte ; prompt natif Chrome/Edge/Android, guide iOS et navigateurs in-app, masqué une fois l'app ouverte en standalone.

---

## ✅ V1.5 – Livré

**Objectif** : home page inspirationnelle — transformer l'accueil en vrai point d'entrée du produit, accessible sans compte et enrichi une fois connecté.

Les cinq blocs connecté restants ont été renvoyés au backlog : aucun n'est nécessaire pour que la home tienne debout, et deux dépendent d'un chantier d'une autre version.

### 🏠 Home page

> Page accessible avec ou sans compte, enrichie de rangées personnelles une fois connecté. La landing marketing est déplacée sur `/decouvrir` plutôt que remplacée.

- ✅ `M` **Navigation ouverte aux visiteurs sans compte** (v1.4.1) : préalable technique livré — nav, footer et cinq pages (Mes soirées, Nouvelle soirée, Ma liste, Notifications, Paramètres) accessibles sans compte, avec un état déconnecté dédié et un appel à l'action vers la connexion ou l'inscription ; `/decouvrir` reprend le rôle de page publique indexable à la place de la racine `/`.

- ✅ `L` **Refonte de la landing page** (V1.5) : neuf sections (accroche, problème, parcours en quatre étapes, roue jouable, bento de fonctionnalités, profil public, réassurance, FAQ, appel à l'action), interface du produit reconstruite en CSS, contenus FR / EN. Devenue la page « Comment ça marche » sur `/decouvrir` quand la home d'exploration a repris la racine.

**Blocs visibles sans compte** — livrés en V1.5. La racine `/` porte la home d'exploration pour tout le monde, connecté ou non, la landing marketing vit sur `/decouvrir`, et chaque bloc a sa page liste filtrable (`ShowcaseListPage`) alimentée par `GET /api/v1/movies/showcase`. Chaque bloc est un carrousel à défilement horizontal, avec flèches sur appareil pointeur et balayage au doigt.
- ✅ `M` **Films tendance de la semaine** (V1.5) : carrousel sur la racine, cent films chargés par section dont vingt montés dans le carrousel, lien « Voir les N films » vers la page liste filtrable.
- ✅ `S` **Suggestions thématiques** (V1.5) : dix thèmes déclarés côté API (frissons, comédies françaises, années 80, années 90, années 2000, braquages, pépites A24, moins de 90 minutes, les indétrônables, en famille), sélectionnables en onglets.
- ✅ `M` **Les plus proposés sur Movie Picker** (V1.5) : agrégation sur les films de soirées, un film entre au classement à partir de deux soirées distinctes, le bloc s'affiche à partir de trente films distincts.
- ✅ `S` **Collections TMDB** (V1.5) : douze franchises curées, grille dédiée sur `/films/collections`, page par saga sur `/films/collection/:id`.
- ✅ `M` **Recherche de films depuis la home** (V1.5) : champ en tête de page qui ouvre `/films/recherche?q=…`, la même page liste que les autres blocs, fiche film comprise.
- ✅ `M` **Recherche par réalisateur et acteur** (V1.5) : le nom d'une personne ramène sa filmographie — rôles joués et films réalisés — en plus des titres qui correspondent au texte saisi. Une seule personne est retenue par recherche, la plus populaire parmi celles dont le nom correspond ; ses films passent devant les correspondances de titre quand le nom complet est saisi tel quel. Recherche par titre et recherche par personne partent en parallèle, et une panne côté personnes laisse les résultats par titre intacts.
- ✅ `S` **Films populaires par genre** (V1.5) : onglets en pastilles sur le bloc tendances, clavier compris, réutilisant la primitive `Tabs`.
- ✅ `S` **Actuellement au cinéma** (V1.5) : endpoint TMDB « Now Playing » région FR, même rangée et même page liste que les autres blocs.
- ✅ `S` **Ce soir en streaming** (V1.5) : onglets par plateforme (Netflix, Prime Video, Disney+, Canal+, Apple TV+) via `with_watch_providers` sur la région configurée, page liste sur `/films/streaming/:provider`.

**Blocs visibles connecté uniquement** — la racine ne redirige plus vers Mes soirées, elle sert la même home enrichie de rangées personnelles ; une entrée « Explorer » ouvre la page depuis la nav et depuis la barre du bas mobile. Une rangée personnelle vide ne se rend pas du tout.

- ✅ `S` **Films de la watchlist** (V1.5) : rangée « Dans votre liste » alimentée par la watchlist personnelle, fiche film et lien vers `/watchlist`.
- ✅ `M` **Films des personnes suivies** (V1.5) : rangée « Vos amis ont vu » sur `GET /api/v1/users/me/following-watched-movies`, agrégation des soirées terminées des comptes suivis, dédoublonnée par film ; les profils passés en privé sont exclus.
- ✅ `S` **Films de la prochaine soirée** (V1.5) : rangée « À voir avant votre prochaine soirée » listant les films proposés pour la soirée active la plus proche, avec accès direct à cette soirée.
- ✅ `M` **Recommandations personnelles** (V1.5) : rangée « Parce que vous avez aimé », recommandations TMDB amorcées sur le dernier film vu, page liste sur `/films/similaires/:seedTmdbId`.

---

## 📋 V1.6 – Planifiée

**Objectif** : compléter la boucle sociale entamée en V1.2, ritualiser la soirée et ouvrir un second format de décision. Items classés par valeur utilisateur décroissante.

- ⬜ `M` **Recherche d'utilisateurs** : trouver un utilisateur par pseudo ou handle pour le suivre ou l'inviter — manque structurel dès lors que le follow existe.
- ✅ `L` **Soirée récurrente** : réglage « Répéter cette soirée » dans les paramètres de l'hôte, au rythme hebdomadaire, bimensuel ou mensuel ; la soirée suivante naît à la clôture de la précédente avec la même configuration, une seule occurrence ouverte à la fois, et repart d'une liste de films vide. Le groupe n'est pas reconduit automatiquement : seul l'hôte y figure, à lui de repartager le lien. L'hôte coupe la récurrence à tout moment tant que l'occurrence suivante n'existe pas ; ensuite le réglage se poursuit sur cette nouvelle soirée. Trois déclencheurs indépendants créent l'occurrence : la clôture, l'ouverture de « Mes soirées » qui rattrape une série laissée en plan, et le balayage `POST /api/v1/scheduler/recurring-events` pour quand Cloud Scheduler sera branché. Une série dormante au-delà de soixante intervalles s'arrête d'elle-même.
- ⬜ `M` **Templates de soirée** : sauvegarder une configuration de soirée (genres, limite de propositions, type de roue) et la réutiliser en un clic à la création.
- ⬜ `L` **Plusieurs films gagnants par soirée** : l'hôte peut relancer la roue un nombre indéfini de fois sur la même soirée ; chaque nouveau lancement tire parmi les films restants (les gagnants précédents sont exclus du tirage) ; possibilité de relancer la roue sur la sélection complète reste disponible en parallèle ; dépend de la sélection manuelle du film gagnant (V1.4).
- ⬜ `XL` **Mode Battle / Tournoi** : alternative à la roue — l'hôte lance un tournoi en duels ; deux films s'affrontent, les participants votent, le gagnant passe au tour suivant jusqu'au film champion.

---

## 📋 V1.7 – Planifiée

**Objectif** : outils hôte avancés, passage au temps réel et finitions du profil. Reprend les items de valeur utilisateur plus faible ou dépendants d'un chantier de plateforme.

- ⬜ `L` **Thème imposé par l'hôte** : contrainte de proposition définie à la création ou dans les paramètres de la soirée (genre TMDB, décennie, acteur, réalisateur, ou classification d'âge maximale pour un mode famille) ; les films proposés qui ne respectent pas la contrainte sont refusés côté back avec message explicite ; la contrainte est affichée en bannière sur la page soirée.
- ⬜ `M` **Avertissements de contenu** : badges violence / horreur / 18+ sur les fiches films ; option hôte « masquer les films 18+ » pour soirées familiales.
- ⬜ `L` **Co-hôte** : l'hôte peut désigner un ou plusieurs participants comme co-hôtes ; mêmes droits que l'hôte (lancer la roue, expulser un participant, modifier les paramètres) sauf supprimer la soirée.
- ⬜ `XL` **Synchronisation temps réel et présence** : remplacer le polling actuel par une connexion temps réel — propositions, votes et arrivées de participants apparaissent instantanément sans délai perceptible ; indicateur de présence sur la page soirée (avatars des participants actuellement connectés, signal « en train de proposer un film »).
- ⬜ `L` **Palette de commandes (Cmd+K)** : accès clavier global aux actions et à la navigation — recherche floue sur les soirées, les films et les utilisateurs, création de soirée, changement de thème ; navigation entièrement au clavier dans la palette.
- ⬜ `M` **Top 3 films préférés sur le profil** : sélectionner et afficher 3 films favoris sur son profil public `/u/:handle` via une recherche TMDB ; cartes visibles par tous les visiteurs, modifiables depuis les paramètres du profil.
- ⬜ `S` **Détail des films vus** : le compteur « films vus » des statistiques du profil devient cliquable ; ouvre la liste des films marqués « déjà vu » par l'utilisateur sur Movie Picker.

---

## Backlog produit (non priorisé sur une release)

> **Note V2 — Application mobile** : l'app mobile (Expo / React Native) était un projet de cours, archivée dans `archive/mobile` (mai 2026). Pour la V2, l'objectif est une app mobile propre, pleinement intégrée à la plateforme. Pas d'engagement de date.

- `XL` **Mode hors-ligne léger** : cache de la dernière vue soirée, bannière « Données en cache, reconnexion en cours » — complexité élevée dans un contexte collaboratif temps réel, à traiter comme un sprint dédié.
- `S` **Plage de votes configurable** : l'hôte peut définir le nombre max de votes up/down par participant.
- `M` **i18n étendue** : langues supplémentaires au-delà de FR / EN ; variantes régionales, RTL si besoin.
- `L` **Cercles d'amis** : groupes persistants d'utilisateurs réutilisables d'une soirée à l'autre ; invitation en un clic de tout le cercle.
- `M` **Note d'un film vu** : noter sur 5 un film qu'on vient de voir directement dans Movie Picker ; bouton pour aller aussi le noter sur Letterboxd / IMDb (redirection vers la fiche film).
- `L` **Partage de soirée (story)** : carte recap partageable (film gagnant, participants, note de chacun) à poster sur les réseaux.
- `M` **Réactions rapides sur les films** : emojis (❤️ 🔥 😴…) posés sur une card film en complément des votes up/down — plus expressif, moins binaire.
- `L` **Badges / achievements** : 4 badges (Organisateur, Cinéphile, Faiseur de rois, Juré assidu) — code de calcul supprimé ; à concevoir avec un design abouti et réimplémenter.
- `M` **Compatibilité ciné** : score de compatibilité cinématographique avec un ami basé sur les films « déjà vu » en commun ; nécessite les statistiques utilisateur et potentiellement l'intégration Letterboxd pour être complet.
- `S` **Statistique : note moyenne des films gagnants** : ajouter dans la section stats du profil public la moyenne des notes TMDB des films tirés gagnants dans les soirées auxquelles l'utilisateur a participé — aucune infra supplémentaire, les notes TMDB sont déjà stockées avec les films.
- `S` **Home : prochaine soirée mise en avant** : carte principale avec titre, heure et accès direct à la soirée imminente — évite de passer par « Mes soirées ». La rangée « À voir avant votre prochaine soirée » livrée en V1.5 donne déjà l'accès, sans la mise en avant.
- `S` **Home : invitations en attente** : rappel des invitations non répondues directement sur la home — plus visible que les notifications seules.
- `S` **Home : soirée rapide** : bouton « Créer une soirée » avec la dernière config utilisée en un clic ; dépend des templates de soirée (V1.6).
- `S` **Home : derniers films gagnants** : les 3-4 films tirés dans ses propres soirées récentes — évite de reproposer un film qu'on vient de voir. Distinct de « Vos amis ont vu », livré en V1.5, qui couvre les soirées des comptes suivis.
- `M` **Fil d'activité des follows** : événements sociaux — soirée créée par un ami, soirée clôturée — au-delà des seuls films vus, dont la rangée « Vos amis ont vu » couvre déjà la moitié.
- `L` **Sondage de disponibilité** : avant de créer une soirée, l'hôte propose plusieurs créneaux (date + heure) à ses follows ou à une liste de contacts ; chaque invité sélectionne les créneaux où il est disponible ; l'hôte voit le récapitulatif des disponibilités et choisit le créneau final — crée automatiquement la soirée avec ce créneau.
- `L` **Plateformes streaming par compte** : chaque utilisateur renseigne ses abonnements streaming dans ses paramètres de compte (Netflix, Prime Video, Disney+, Canal+…) ; sur la page d'une soirée, un bloc « Plateformes communes » affiche les plateformes partagées par l'ensemble des participants connectés ; les films peuvent optionnellement être filtrés aux seuls disponibles sur ces plateformes communes.
- `XL` **Messages privés** : messagerie directe entre deux utilisateurs qui se suivent mutuellement ; accessible depuis le profil public ou la liste de follows ; permet d'organiser une soirée ou d'échanger en dehors du contexte d'une soirée existante.
- `M` **Proposition de film anonyme** : option dans les paramètres de la soirée activable par l'hôte — le nom du proposant n'est plus affiché sur les cards de films tant que la roue n'a pas été lancée, pour éviter les votes d'affinité plutôt que de goût.
- `L` **Chat de soirée** : panneau de discussion en temps réel accessible depuis la page soirée — bouton d'ouverture d'un panneau latéral sur desktop, onglet dédié sur mobile ; destiné à remplacer les mini-commentaires par film (peu utilisés, intégration visuelle imparfaite dans les cards) par un seul espace d'échange centralisé pour toute la soirée.
- `?` **Événements hebdomadaires** : dépend de la home page V1.5 — événement qui change chaque semaine, sous différentes formes possibles (thème à respecter dans le film gagnant d'une soirée, événement saisonnier type Halloween ou Noël, etc.) ; à définir plus précisément une fois la home page livrée.
- `S` **Pioche aléatoire dans la watchlist** : bouton qui tire un film au hasard parmi les films « à voir » de la watchlist, pour trancher rapidement quand on ne sait pas quoi proposer ; le film tiré peut ensuite être proposé dans une soirée en un clic, comme la proposition rapide existante depuis la watchlist.
- `S` **Écart watchlist Movie Picker / Letterboxd** : pour les utilisateurs synchronisés avec Letterboxd, badge sur les films de la watchlist Movie Picker absents de la watchlist Letterboxd — typiquement des films ajoutés depuis une soirée plutôt qu'importés, que la synchronisation à sens unique ne remonte jamais côté Letterboxd. Dépend de l'intégration Letterboxd (V1.4).
- `M` **Watchlist d'un autre utilisateur** : consulter la watchlist d'un autre utilisateur depuis son profil public `/u/:handle`, avec un réglage de visibilité dédié indépendant de celui du profil. Dépend de la watchlist personnelle (V1.4) et du profil public (V1.2).
- `S` **Description de soirée** : champ de description libre en complément du titre à la création d'une soirée, modifiable ensuite par l'hôte ; affiché sur la page soirée pour donner du contexte (thème de la soirée, consignes, etc.).
- `M` **Soirée à distance synchronisée** : intégrer dans le parcours soirée l'usage d'une extension de visionnage synchronisé existante (Teleparty, Scener…) — une fois le film gagnant désigné, la page soirée guide l'hôte pour lancer une session et partage le lien généré aux participants via le mécanisme d'invitation existant.
- `XL` **Vrai support des séries (progression par épisode)** : suivre la progression de visionnage saison / épisode en cours et le prochain épisode à voir pour une série, via les endpoints TMDB dédiés — remplace le traitement actuel d'une série comme un simple film (réglage hôte « Séries TV OK » sans notion d'épisode). Synergie avec la soirée récurrente (backlog) pour un groupe qui suit la même série au fil des séances.
- `M` **Connexion Discord, Meta et Twitch** : trois fournisseurs OAuth supplémentaires aux côtés de Google et GitHub, dans la section « Connexions » existante.
- `L` **Passkeys (WebAuthn)** : connexion sans mot de passe via biométrie ou PIN de l'appareil, en complément de l'e-mail / mot de passe et des fournisseurs OAuth.
- `M` **Double authentification (2FA/TOTP)** : code à 6 chiffres généré par une app d'authentification, activable en option dans les paramètres de compte.
- `M` **Sessions actives** : liste des appareils et navigateurs connectés dans la section « Connexions », avec révocation individuelle.
- `M` **Alerte nouvelle connexion** : e-mail automatique envoyé à l'utilisateur lors d'une connexion depuis un nouvel appareil ou navigateur.
- `S` **FAQ / Centre d'aide** : page qui répond aux questions récurrentes (fonctionnement de la roue, invitation, votes…), accessible depuis le footer.
- `S` **Contact / Support** : formulaire ou adresse dédiée pour signaler un problème, distinct du bouton « Proposer une idée » réservé aux suggestions de features.
- `M` **Onboarding pour nouveaux utilisateurs** : mini tour guidé ou écran de bienvenue à la première connexion, expliquant le concept (créer une soirée, voter, la roue).
- `M` **Statut du service** : page publique indiquant si l'API et le site sont opérationnels.
- `M` **Photo de profil personnalisée** : pouvoir uploader une image comme photo de profil, en remplacement de l'avatar généré (DiceBear) actuel.
