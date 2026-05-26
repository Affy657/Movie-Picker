# Movie Picker – Roadmap produit 

**Nom du projet : Movie Picker.**

Découpage par version côté **métier / utilisateur**.
- Spec complète → [spec.md](spec.md).
- Roadmap **plateforme & qualité** → [roadmap-tech.md](roadmap-tech.md).

---

## Principes

- **MVP** : parcours minimal utilisable côté utilisateur.
- **V1, V1.1, V1.2** : releases produit progressives sur la spec complète, sans casser le cœur métier.
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

- ✅ **Compte utilisateur** : inscription (email, mot de passe, pseudo), connexion, déconnexion, mot de passe oublié. Rejoindre une soirée reste possible sans compte (pseudo invité).
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

- ⬜ **Avatar utilisateur** : choix parmi un set préselectionné ; affiché à côté du pseudo dans la soirée et le profil.
- ⬜ **Statistiques utilisateur** : tableau de bord personnel — soirées créées / rejointes, films proposés, votes, films gagnants.
- ⬜ **Badges / achievements** : récompenses visuelles automatiques selon l'usage (ex. « 10 soirées créées ») ; affichés sur le profil.
- ⬜ **Mini-commentaires sur une proposition** : courte note (≤ 140 caractères) attachable à un film proposé ; visible par tous les participants ; suppression par l'auteur ou l'hôte.
- ⬜ **Profil public léger** : page `/u/:pseudo` — pseudo, avatar, badges, stats publiques ; paramètres de visibilité (privé par défaut).
- ⬜ **Notifications in-app** : badge + liste « Invitations reçues » dans Mes soirées.
- ⬜ **Invitations in-app** : invitation directe à un autre utilisateur en complément du lien de partage.

---

## Backlog produit (non priorisé sur une release)

> **Note V2 — Application mobile** : l'app mobile (Expo / React Native) était un projet de cours, archivée dans `archive/mobile` (mai 2026). Pour la V2, l'objectif est une app mobile propre, pleinement intégrée à la plateforme. Pas d'engagement de date.

- **Mode hors-ligne léger** : cache de la dernière vue de la soirée, bannière « Données en cache ».
- **Export calendrier (.ics)** : lien « Ajouter au calendrier » sur la soirée, compatible Google Calendar, Outlook, Apple Calendar.
- **Plage de votes configurable** : l'hôte peut définir le nombre max de votes up/down par participant.
- **Suppression du compte / export des données** (RGPD) — depuis la page profil.
- **Pages d'erreur dédiées** : 404 soirée/route, 500 — message clair et lien vers l'accueil.
- **i18n étendue** : langues supplémentaires au-delà de FR / EN ; variantes régionales, RTL si besoin.
- **Connexion sociale (OAuth)** : Google, Apple, GitHub, Microsoft en complément de l'email / mot de passe.
- **Watchlist personnelle** : liste de films « à voir » par utilisateur ; ajout depuis la recherche TMDB ; proposition rapide d'un film depuis sa watchlist directement dans une soirée.
- **Intégration Letterboxd** : import de la watchlist (films à voir) et de la liste « déjà vu » depuis un export CSV Letterboxd ou via leur flux RSS public.
- **Système de dons** : page de soutien au projet (Stripe, Buy Me a Coffee, Ko-fi) ; strictement facultatif, sans impact fonctionnel.
- **Avertissements de contenu** : badges violence / horreur / 18+ sur les fiches films ; option hôte « masquer les films 18+ » pour soirées familiales.
- **Cercles d'amis** : groupes persistants d'utilisateurs réutilisables d'une soirée à l'autre ; invitation en un clic de tout le cercle.
