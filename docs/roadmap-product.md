# Movie Picker – Roadmap produit 

**Nom du projet : Movie Picker.**

Découpage par version côté **métier / utilisateur**.
- Spec complète → [spec.md](spec.md).
- Roadmap **plateforme & qualité** → [roadmap-tech.md](roadmap-tech.md).

---

## Principes

- **MVP** : parcours minimal utilisable côté utilisateur. Les livrables plateforme / qualité associés sont dans [roadmap-tech.md](roadmap-tech.md).
- **V1, V1.1** : releases produit progressives sur la spec complète, sans casser le cœur métier.
- **Backlog** : idées et sujets **non planifiés** sur une date de release (tri régulier ; peut migrer vers une V3+ ou rester en sommeil).
- **Architecture extensible** : modèles et composants prévus pour accueillir les features suivantes sans refacto majeur (détaillé côté tech).

---

## MVP – Features produit

**Objectif** : application démoable avec le parcours Movie Picker minimal.

- **Navigation & shell** : pages accueil, création de soirée, détail soirée (`/e/:slug`) ; interface **mobile-first** puis responsive ; client API avec base URL au build (`VITE_API_URL`).
- **Création & accès** : créer une soirée (titre, date, heure obligatoires) ; lien de partage unique + « Copier le lien » ; rejoindre avec **pseudo** obligatoire ; **hôte** identifié par `?host=…` ou cookie, seul habilité à lancer la roue et clôturer.
- **Films** : proposition via recherche titre → API TMDB côté serveur (minimum **titre, année, poster**) ; liste avec **qui a proposé** ; **doublons** refusés (id API ou titre) ; **upvote / downvote** (un vote par participant et par film) ; retirer sa proposition tant que la roue n’a pas été lancée.
- **UX chargement & erreurs** : indicateurs de chargement pour le détail soirée et la liste des films ; en cas d’échec réseau ou API, **message explicite** et action **« Réessayer »** (pas de liste vide silencieuse).
- **Synchronisation légère** : rafraîchissement automatique (**polling**, intervalle fixe côté app) des données soirée et films pour voir les autres participants sans recharger la page.
- **Roue** : bouton « Lancer la roue » (hôte uniquement) ; tirage parmi les films (tous ou score > 0, règle fixe MVP) ; animation puis film gagnant ; « Clôturer la soirée » ; 0 film → message + roue désactivée ; 1 film → gagnant direct (animation optionnelle / courte).
- **Expiration & lecture seule** : soirée **terminée** à date/heure (ou date de fin optionnelle) ; UI en lecture seule avec message adapté.

> Côté **plateforme / qualité / livrables Ynov** : voir [roadmap-tech.md](roadmap-tech.md) § MVP.

---

## V1 – Features produit

**Objectif** : compte utilisateur (sans reset email), config hôte, marqueur « déjà vu », confort de partage et de lecture, enrichissement film léger côté découverte.

- **Création de soirée** : **compte obligatoire** (pas de création anonyme) ; après création, le créateur est participant avec son pseudo compte ; lien partagé **sans** `?host=`.
- **Compte utilisateur** : inscription (email, mot de passe, pseudo par défaut), connexion, déconnexion, **mot de passe oublié** (email avec lien sécurisé à durée limitée). **Rejoindre** une soirée reste possible **sans compte** (pseudo invité).
- **Mes soirées** : liste persistante pour les utilisateurs connectés ; reconnaissance de l'hôte par compte en plus du token.
- **Config par l'hôte** : page Paramètres (thème, expiration, limite de propositions, type de roue aléatoire/pondérée).
- **Déjà vu** (neutre pour la roue) : chaque participant peut **marquer / démarquer** un film comme « déjà vu », en plus du up/down vote. Ce marqueur n'influence **pas** la pondération de la roue ; il est **toujours disponible** (pas de config hôte).
- **Partage** : QR code ; « Copier le lien » (déjà en MVP).
- **Aperçu de lien partagé (Open Graph / Twitter Cards)** : métadonnées **dynamiques** pour l’URL d’une soirée (titre de l’événement, description courte, image marque ou visuel fixe) lorsque l’**infra** permet de servir du HTML ou des meta **par URL** aux crawlers (sinon rester sur OG **statiques** et consigner la limite). **Option hôte** : afficher ou non des indicateurs sensibles dans l’aperçu (ex. **nombre de participants**) ; défaut prudent si l’événement est « privé par lien ».
- **Rappels légers** : **bannière in-app** ou message sur la page soirée lorsque l’heure de début est proche (utilisateur déjà sur l’app / la soirée ouverte) — sans push ni e-mail.
- **Mise à jour en direct** : polling (ou WebSocket) pour voir les nouveaux films et votes sans recharger.
- **Interface** : mode sombre/clair (préférence locale ou compte).
- **Disponibilité streaming / VOD légale** : intégration TMDB *watch providers* (région ex. FR), pastilles ou liens sur recherche / fiche film.
- **Indicateur « déjà vu » (autres participants)** : à l’ajout d’un film (ou sur la carte), afficher si des participants de la soirée l’ont déjà marqué comme vu.
- **Internationalisation** : **deuxième langue UI (anglais)** + **sélecteur de langue** dans le header ; **persistance** de la préférence (localStorage, préparée pour sync compte) ; appels TMDB alignés sur la locale choisie. (FR par défaut, détection navigateur en fallback.)

> Tech V1 : voir [roadmap-tech.md](roadmap-tech.md) § V1.

---

## V1.1 – Features produit

**Objectif** : contenu film riche, options de soirée, historique, UX avancée.

- **Films** : note moyenne (API) ✅, durée si disponible ✅, bande-annonce (lien) ✅, option « Séries TV OK / pas OK » (config hôte) ✅ — livré avec fix doublon TMDB id par type de média.
- **Soirée** : lieu, description ; compte à rebours ; lien « Ajouter au calendrier » (.ics) — constitue aussi un **rappel** côté agenda (OS / Google / Outlook), complémentaire aux notifications in-app V1.
- **Config** : limite de participants, plage de votes (configurable).
- **Historique** : filtre « Soirées passées », affichage du film gagnant et liste en lecture seule.
- **Interface** : vue grille / liste ; mode hors-ligne léger (cache dernière vue).
- **Cas limites** : messages clairs (soirée complète, lien invalide, API films indisponible), validation renforcée.

---

## Backlog produit (non priorisé sur une release)

> Pistes pour plus tard : pas d’engagement de version. Pour les sujets transverses **techniques**, voir [roadmap-tech.md](roadmap-tech.md) § Backlog tech.

- **Suppression du compte / export des données** (RGPD) — depuis la page profil.
- **Pages d'erreur dédiées** (404 soirée/route, 500) avec message clair et lien vers l'accueil.
- **Crédits API** (TMDB/OMDB) et **mention cookies / confidentialité** côté UI / footer.
- **Notifications hors session** : **push navigateur** et/ou **e-mail** pour rappels avant soirée (ex. 1 h avant), **préférences** par utilisateur — dépend d’une base **consentement** et en pratique du **compte / e-mail** opérationnel (le transport email est déjà mis en place en V1 pour le mot de passe oublié, réutilisable comme socle).
- **i18n étendue** : langues supplémentaires au-delà des **FR / EN** livrés en V1, variantes régionales fines, RTL si besoin.
- **Footer global** : pied de page sur le shell de l’app avec liens **LinkedIn**, **GitHub**, portfolio ou autres réseaux / contact ; cohérent **mobile-first** (lisible, zones tactiles) ; peut regrouper plus tard crédits TMDB et liens légaux si retenus.
- **Statistiques utilisateur** : tableau de bord personnel sur la page profil — nombre de soirées **créées** / **rejointes**, films proposés, votes émis, films gagnants, éventuellement tags / thèmes les plus joués ; agrégats calculés côté API à partir des données existantes.
- **Personnalisation de la couleur d’UI** : sélection d’une **palette parmi un préréglage** (ex. bleu, vert, violet, rose) en complément du mode sombre / clair ; persistance **locale** pour invité, **sur le compte** pour utilisateur connecté.
- **Avatar utilisateur (set préselectionné)** : choix d’une image parmi un **set fourni** (pas d’upload libre, évite la modération) ; affichage à côté du pseudo dans la soirée et le profil ; persistance sur le compte.
- **Connexion sociale (OAuth)** : connexion via **Google** (et éventuellement Apple, GitHub, Microsoft) en plus du couple email / mot de passe ; liaison à un compte existant si l’email correspond. *Volet infra/secrets : voir backlog tech.*
- **Invitations in-app à une soirée** : envoyer une invitation **directe** à un autre utilisateur connecté (par pseudo ou email) en complément du lien de partage ; notification interne (badge, liste « Invitations reçues » dans Mes soirées) ; règles anti-spam (limite d’invitations / utilisateur / jour).
- **Intégration Letterboxd** : connecter son compte Letterboxd pour importer la liste **« déjà vu »** (films watched) et éventuellement la **watchlist** ; alimente les marqueurs « déjà vu » et la recherche de films. Hors scope : publication d’activité sur Letterboxd depuis Movie Picker.
- **Système de dons** : page de soutien au projet (ex. **Stripe**, **Buy Me a Coffee**, **Ko-fi**) ; lien depuis le footer ou la page profil, mention claire que c’est **facultatif** et **sans impact** sur les fonctionnalités.
- **Deep links streaming** : sur la fiche film, lien direct vers l’**app native** (scheme mobile si dispo) ou le **site** du provider (Netflix, Prime Video, Disney+, etc.) lorsque TMDB *watch providers* indique une disponibilité ; complète l’affichage des **pastilles** prévues en V1. Fallback web systématique.
- **Avertissements de contenu** : badges sur les fiches films pour signaler **violence**, **horreur**, **18+**, etc. via les *certifications* / *content ratings* TMDB ; **option hôte** « masquer les films 18+ » à la recherche / proposition pour les soirées familiales ; affichage neutre et factuel.
- **Cercles d’amis** : groupes persistants d’utilisateurs (ex. « Les colocs », « La famille ») réutilisables d’une soirée à l’autre ; création / gestion par le propriétaire du cercle (ajout, retrait, renommage) ; **invitation en un clic** de tout le cercle à une nouvelle soirée ; vue « Soirées du cercle » avec historique commun. Levier fort de **rétention**.
- **Profil public léger** : page consultable par les autres utilisateurs (ex. `/u/:pseudo`) — pseudo, avatar, badges, stats publiques choisies par l’utilisateur ; **paramètres de visibilité** explicites (public / cercles uniquement / privé), **opt-in** par défaut côté privé ; aucune donnée sensible exposée.
- **Mini-commentaires sur une proposition** : courte note (ex. ≤ 140 caractères) attachable à un film proposé ou voté (« vu y a 2 mois », « trop long ce soir », « VOSTFR uniquement ») ; visible par les participants de la soirée, à côté du film ; **modération basique** (suppression par l’auteur ou l’hôte) ; pas un chat de soirée.
- **Badges / achievements** : récompenses visuelles automatiques selon l’usage (ex. « 10 soirées créées », « 100 votes », « Curateur horreur ») ; affichés sur le **profil public léger** ; calcul côté API à partir des **stats existantes** ; éviter les badges qui poussent à un usage compulsif.
