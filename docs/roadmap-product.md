# Movie Picker – Roadmap produit 

**Nom du projet : Movie Picker.**

Découpage par version côté **métier / utilisateur**.
- Spec complète → [spec.md](spec.md).
- Roadmap **plateforme & qualité** → [roadmap-tech.md](roadmap-tech.md).

---

## Principes

- **MVP** : parcours minimal utilisable côté utilisateur.
- **V1, V1.1, V1.2** : releases produit progressives sur la spec complète, sans casser le cœur métier.
- **V1.3, V1.4, V1.5** : polish, enrichissement, outils hôte et nouvelles surfaces produit.
- **Backlog** : idées et sujets non planifiés sur une date de release (tri régulier).

---

## ✅ MVP – Livré

**Objectif** : application démoable avec le parcours Movie Picker minimal.

- ✅ **Navigation & shell** : pages accueil, création de soirée, détail soirée (`/e/:slug`) ; interface mobile-first puis responsive.
- ✅ **Création & accès** : créer une soirée (titre, date, heure obligatoires) ; lien de partage unique + « Copier le lien » ; rejoindre avec pseudo obligatoire ; hôte seul habilité à lancer la roue et clôturer.
- ✅ **Films** : proposition via recherche titre (TMDB) ; liste avec qui a proposé ; doublons refusés ; upvote / downvote (un vote par participant et par film) ; retirer sa proposition tant que la roue n'a pas été lancée.
- ✅ **UX chargement & erreurs** : indicateurs de chargement ; en cas d'échec réseau ou API, message explicite et action « Réessayer ».
- ✅ **Synchronisation** : rafraîchissement automatique des données soirée et films pour voir les autres participants sans recharger la page.
- ✅ **Roue** : lancement par l'hôte ; tirage parmi les films ; animation puis film gagnant ; « Clôturer la soirée » ; cas limites (0 film, 1 film) gérés.
- ✅ **Expiration & lecture seule** : soirée terminée à date/heure ; UI en lecture seule avec message adapté.

---

## ✅ V1 – Livré

**Objectif** : compte utilisateur, config hôte, marqueur « déjà vu », confort de partage, enrichissement film léger.

- ✅ **Compte utilisateur** : inscription (email, mot de passe, pseudo), connexion, déconnexion, mot de passe oublié. **Compte obligatoire pour rejoindre une soirée** (le mode invité initial — rejoindre sans compte — a été retiré ensuite : trop de problèmes en usage réel).
- ✅ **Création de soirée** : compte obligatoire pour créer ; lien de partage sans token hôte.
- ✅ **Mes soirées** : liste persistante des soirées pour les utilisateurs connectés.
- ✅ **Config par l'hôte** : paramètres de la soirée — thème, expiration, limite de propositions, type de roue (aléatoire / pondérée).
- ✅ **Déjà vu** : chaque participant peut marquer / démarquer un film comme « déjà vu » ; neutre pour la roue.
- ✅ **Partage** : QR code en complément du lien.
- ✅ **Aperçu de lien partagé (Open Graph)** : métadonnées de la soirée visibles lors du partage sur les réseaux sociaux.
- ✅ **Rappels légers** : bannière in-app lorsque l'heure de début est proche.
- ✅ **Mise à jour en direct** : les nouveaux films et votes apparaissent sans recharger la page.
- ✅ **Interface** : mode sombre / clair.
- ✅ **Disponibilité streaming** : pastilles et liens vers les plateformes de streaming disponibles (région FR).
- ✅ **Indicateur « déjà vu » (autres participants)** : affichage du nombre de participants ayant déjà vu un film sur sa carte.
- ✅ **Internationalisation** : FR / EN avec sélecteur de langue dans le header.
- ✅ **Landing page** : page d'accueil publique avec hero, présentation des 4 étapes du parcours et CTAs connexion / inscription.
- ✅ **Suppression d'événement** : l'hôte peut supprimer une soirée depuis les paramètres (zone danger).
- ✅ **Expulsion d'un participant** : l'hôte peut retirer un participant de la soirée.

---

## ✅ V1.1 – Livré

**Objectif** : contenu film riche, options de soirée, historique, UX avancée.

- ✅ **Films** : note moyenne, durée, bande-annonce, option « Séries TV OK / pas OK » (config hôte).
- ✅ **Config** : limite de participants par soirée.
- ✅ **Historique** : onglet « Soirées passées » dans Mes soirées, film gagnant affiché, lecture seule.
- ✅ **Interface** : personnalisation de la couleur d'UI (palette de 6 couleurs, persistance locale et compte).
- ✅ **Footer global** : pied de page avec liens LinkedIn, GitHub, portfolio ; crédits TMDB obligatoires (condition d'usage de l'API) et liens légaux.
- ✅ **Deep links streaming** : lien direct vers l'app ou le site du provider (Netflix, Prime Video, Disney+…) depuis la fiche film. Fallback web si l'app n'est pas installée.
- ✅ **Liens critiques & bases de données** : boutons « Ouvrir sur Letterboxd », « Ouvrir sur IMDb » et « Ouvrir sur AlloCiné » dans le menu d'actions d'une card film ; redirection directe via l'ID TMDB pour Letterboxd, recherche titre + année pour IMDb et AlloCiné.
- ✅ **Notifications push PWA** : abonnement VAPID depuis la page compte ; notification quand un participant rejoint la soirée (hôte) ; rappel automatique 1 h avant l'heure prévue (participants) ; préférences par notification configurables.

---

## 📋 V1.2 – Planifiée

**Objectif** : vie sociale de l'app, identité utilisateur et engagement.

- ✅ **Avatar utilisateur** : choix parmi un set préselectionné ; affiché à côté du pseudo dans la soirée et le profil.
- ✅ **Statistiques utilisateur** : section stats sur le profil public `/u/:handle` — 6 compteurs (soirées créées / rejointes, films proposés, votes, propositions gagnantes, films vus), barre des genres favoris (IDs TMDB persistés à l'ajout + backfill one-shot) et heatmap d'activité sur 26 semaines.
- ✅ **Mini-commentaires sur une proposition** : note de pitch (≤ 140 caractères) posée par le proposant sur son film ; visible par tous ; bulle de texte avec avatar du proposant ; éditable au clic par le proposant, supprimable par le proposant (body vide) ou l'hôte (sans participantId requis) ; lecture seule après le lancement de la roue ; rate limiting 60 req/min.
- ✅ **Profil public léger** : page `/u/:handle` (handle unique) — avatar, pseudo, bio courte, « membre depuis » ; **public par défaut** avec opt-out ; statistiques et follow intégrés.
- ✅ **Notifications in-app** : badge + liste « Invitations reçues » dans Mes soirées.
- ✅ **Invitations in-app** : invitation directe à un autre utilisateur en complément du lien de partage.
- ✅ **Follow léger entre utilisateurs** : retrouver facilement ses potes sur l'app pour les réinviter ; brique de base des invitations in-app.
- ✅ **Historique de recherche dans la barre de film** : dans la page soirée, la barre de recherche de films affiche les dernières recherches effectuées par l'utilisateur ; sélection rapide d'une recherche passée en un clic ; effacement individuel ou global de l'historique ; persistance locale (localStorage) par utilisateur.

---

## 📋 V1.3 – Planifiée

**Objectif** : polish & qualité perçue — roue visuelle, finitions UX, conformité légale et enrichissement des données film.

- ⬜ **Vraie roue de tirage** : remplacer l'animation actuelle par une roue visuelle avec les titres des films sur chaque segment ; rotation physique puis ralentissement progressif jusqu'au film gagnant.
- ✅ **Suppression de compte + export RGPD** : depuis la page profil — suppression définitive et téléchargement de ses données (soirées, votes, films proposés).
- ✅ **Pages d'erreur dédiées** : 404 route / soirée introuvable, 500 erreur serveur — message clair et lien vers l'accueil.
- ✅ **Empty states** : composant partagé `EmptyState` (icône + titre + message + CTA) appliqué à « Mes soirées » vide, liste de films vide, aucun participant, inbox notifications et abonnements/abonnés.
- ✅ **Location & achat (VOD)** : afficher sur la fiche film les plateformes où le film est disponible à la location ou à l'achat (Amazon, Apple TV, Google Play…) en complément des abonnements streaming déjà affichés ; distinction visuelle claire entre les trois modes (abonnement / location / achat).
- ⬜ **Tri de la liste de films** : trier les films proposés par score de votes, note TMDB, durée ou ordre d'ajout.
- ⬜ **Recherche avancée de films** : filtrer par acteur, réalisateur, genre ou année dans la barre de recherche TMDB lors de la proposition.
- ⬜ **Tooltips globaux** : info-bulles cohérentes sur les icônes et actions moins évidentes (boutons d'action, scores TMDB, badges, pastilles streaming).
- ✅ **Accessibilité (a11y baseline)** : navigation clavier cohérente, focus trap dans les modals, aria-labels sur les éléments interactifs.
- ✅ **Export calendrier (.ics)** : bouton « Ajouter au calendrier » sur la soirée, compatible Google Calendar, Outlook, Apple Calendar.

---

## 📋 V1.4 – Planifiée

**Objectif** : outils hôte avancés et bibliothèque personnelle — timer, templates, watchlist et intégration Letterboxd pour une expérience plus organisée.

- ⬜ **Timer avant le début de la soirée** : compte à rebours visible par tous les participants depuis la page soirée jusqu'à l'heure de début prévue.
- ⬜ **Templates de soirée** : sauvegarder une configuration de soirée (genres, limite de propositions, type de roue) et la réutiliser en un clic à la création.
- ⬜ **Watchlist personnelle** : liste de films « à voir » par utilisateur ; ajout depuis la recherche TMDB ; proposition rapide d'un film depuis sa watchlist directement dans une soirée.
- ⬜ **Intégration Letterboxd** : import de la watchlist (films à voir) et de la liste « déjà vu » depuis un export CSV Letterboxd ou via leur flux RSS public.

---

## 📋 V1.5 – Planifiée

**Objectif** : home page inspirationnelle — transformer l'accueil en vrai point d'entrée du produit, accessible sans compte et enrichi une fois connecté.

### 🏠 Home page

> Page accessible sans compte, avec des blocs supplémentaires qui apparaissent une fois connecté. Remplace et enrichit la landing page actuelle. À découper en plusieurs sprints. Les blocs connecté dépendent de V1.4 (watchlist, templates).

**Blocs visibles sans compte**
- ⬜ **Films tendance de la semaine** : carrousel des films populaires TMDB du moment — nourrit l'inspiration avant même de créer un compte.
- ⬜ **Suggestions thématiques** : carrousels contextuels selon la saison ou l'occasion (« Films d'horreur », « Comédies de Noël », « Soirée années 80 ») — données 100 % TMDB, sans infra custom.
- ⬜ **Les plus proposés sur Movie Picker** : films les plus souvent mis en soirée par la communauté — dimension sociale sans nécessiter de compte.
- ⬜ **Collections TMDB** : carrousels de franchises et collections (Marvel, Pixar, trilogies…) ; clic sur un film ouvre sa fiche avec option « Proposer dans une soirée » — données nativement disponibles via l'API TMDB.
- ⬜ **Recherche de films depuis la home** : barre de recherche TMDB accessible sans compte pour explorer et s'inspirer ; résultats avec fiche rapide (synopsis, note, streaming dispo).
- ⬜ **Films populaires par genre** : onglets ou filtres (Action, Comédie, Thriller…) sur le bloc tendances pour affiner l'exploration.

**Blocs visibles connecté uniquement**
- ⬜ **Prochaine soirée mise en avant** : carte principale avec titre, heure et accès direct à la soirée imminente — évite de passer par « Mes soirées ».
- ⬜ **Invitations en attente** : rappel des invitations non répondues directement sur la home — plus visible que les notifications seules.
- ⬜ **Soirée rapide** : bouton « Créer une soirée » avec la dernière config utilisée en un clic (dépend des templates de soirée V1.3).
- ⬜ **Derniers films gagnants** : les 3-4 films tirés dans ses soirées récentes — évite de reproposer un film qu'on vient de voir.
- ⬜ **Activité des follows** : fil léger — soirée créée par un ami, film gagnant d'une soirée — donne vie à la dimension sociale sans quitter la home.
- ⬜ **Films de la watchlist** : accès rapide pour proposer un film en un clic depuis la home (dépend de la watchlist personnelle).

---

## Backlog produit (non priorisé sur une release)

> **Note V2 — Application mobile** : l'app mobile (Expo / React Native) était un projet de cours, archivée dans `archive/mobile` (mai 2026). Pour la V2, l'objectif est une app mobile propre, pleinement intégrée à la plateforme. Pas d'engagement de date.

- **Système de dons** : page de soutien au projet (Stripe, Buy Me a Coffee, Ko-fi) ; strictement facultatif, sans impact fonctionnel.
- **Mode hors-ligne léger** : cache de la dernière vue soirée, bannière « Données en cache, reconnexion en cours » — complexité élevée dans un contexte collaboratif temps réel, à traiter comme un sprint dédié.
- **Plage de votes configurable** : l'hôte peut définir le nombre max de votes up/down par participant.
- **i18n étendue** : langues supplémentaires au-delà de FR / EN ; variantes régionales, RTL si besoin.
- **Connexion sociale (OAuth)** : Google, Apple, GitHub, Microsoft en complément de l'email / mot de passe.
- **Avertissements de contenu** : badges violence / horreur / 18+ sur les fiches films ; option hôte « masquer les films 18+ » pour soirées familiales.
- **Cercles d'amis** : groupes persistants d'utilisateurs réutilisables d'une soirée à l'autre ; invitation en un clic de tout le cercle.
- **Note d'un film vu** : noter sur 5 un film qu'on vient de voir directement dans Movie Picker ; bouton pour aller aussi le noter sur Letterboxd / IMDb (redirection vers la fiche film).
- **Partage de soirée (story)** : carte recap partageable (film gagnant, participants, note de chacun) à poster sur les réseaux.
- **Réactions rapides sur les films** : emojis (❤️ 🔥 😴…) posés sur une card film en complément des votes up/down — plus expressif, moins binaire.
- **Badges / achievements** : 4 badges (Organisateur, Cinéphile, Faiseur de rois, Juré assidu) — code de calcul supprimé ; à concevoir avec un design abouti et réimplémenter.
- **Compatibilité ciné** : score de compatibilité cinématographique avec un ami basé sur les films « déjà vu » en commun ; nécessite les statistiques utilisateur et potentiellement l'intégration Letterboxd pour être complet.
- **Recherche d'utilisateurs** : trouver un utilisateur par pseudo ou handle pour le suivre ou l'inviter — manque structurel dès lors que le follow existe.
