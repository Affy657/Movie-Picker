# Roadmap de Movie Picker

Le backlog du projet, en flux continu : ce qui est en cours, ce qui vient ensuite dans l'ordre, le reste gardé dans un coin, rangé par thème, et les idées écartées. Ce qui est livré n'y figure plus : l'historique vit dans [`CHANGELOG.md`](../CHANGELOG.md) et dans le journal des versions de l'application (`/nouveautes`).

---

## Principes

- **Flux continu** : aucune version planifiée, aucun lot. Chaque entrée se livre seule, sur une branche courte fusionnée dans `master` et mise en production le jour où elle est prête, avec sa propre version calculée à partir du CHANGELOG (voir `AGENTS.md`). Une entrée livrée sort de ce fichier.
- **Statuts** : la section porte le statut de ses entrées.
  - 🚧 **En cours** : une partie est déjà en ligne et la suite est engagée, typiquement les tranches restantes d'une entrée découpée. Deux entrées au plus : on finit avant d'ouvrir.
  - ⏭️ **Prochainement** : les entrées à prendre ensuite, numérotées dans l'ordre où elles se prennent. Cinq au plus : au-delà, ce n'est plus un ordre mais une liste de souhaits.
  - 💡 **Backlog** : tout le reste, rangé par thème, l'entrée la plus utile en tête de chaque thème. Ni date ni promesse.
  - ⏸️ **En pause** : commencée ou décidée, puis suspendue volontairement. L'entrée dit pourquoi et ce qui la relancerait.
  - 🗄️ **Rejetée** : une idée qui ne semble plus pertinente au vu de ce que l'application est devenue, mise de côté plutôt que supprimée. L'entrée garde sa description et dit en fin de ligne pourquoi elle a été écartée ; elle ne revient que sur décision explicite.
- **Ce qui fixe l'ordre** : l'usage mesuré passe avant l'envie. Ce qui fait entrer du monde dans une soirée passe avant une nouvelle surface, et une surface qu'on ne sait pas mesurer se mesure avant d'être enrichie. Une entrée du backlog monte en Prochainement quand un besoin réel la porte : un retour d'utilisateur, une issue `user-feedback`, une mesure.
- **Tailles t-shirt** : chaque entrée porte une estimation de charge, indépendante de sa valeur produit. Échelle calibrée sur l'empreinte réelle des features déjà livrées.
  - `S` : moins de 800 lignes, une seule couche (front ou API), pas de changement de modèle.
  - `M` : 800 à 2000 lignes, front et API, au plus un champ ajouté au modèle.
  - `L` : 2000 à 5000 lignes, nouvelle entité ou nouveaux endpoints, plusieurs écrans touchés.
  - `XL` : au-delà, chantier structurant.
  - `?` : périmètre pas assez défini pour être estimé.
- **Découper avant de construire** : une entrée `L` ou `XL` se découpe en tranches livrables seules avant d'être commencée. La première tranche part, les suivantes restent ici sous forme d'entrées plus petites.
- **Dette technique** : ce qui existe et fonctionne moins bien qu'il ne devrait vit dans [`technical-debt.md`](technical-debt.md), jamais ici.
- **Format d'une entrée** : une ligne, ``- `taille` **Titre** : description`` (numérotée en Prochainement), ni version ni date après le titre. La description tient en une à deux phrases et 300 caractères au plus, et dit ce que l'utilisateur obtient plutôt que comment c'est construit. Une dépendance se dit en fin de description.

---

## 🚧 En cours

Rien pour l'instant.

---

## ⏭️ Prochainement

1. `S` **Mesurer ce qui sert** : savoir combien de personnes notent un film, ouvrent un recap, piochent dans leur watchlist ou synchronisent Letterboxd, et à quelle étape décroche celui qui ouvre le lien d'une soirée, inscriptions comprises. Sans ces chiffres, le reste se trie à l'aveugle.
2. `?` **Entrer dans une soirée depuis son lien** : aujourd'hui, environ une personne sur dix qui ouvre le lien d'une soirée finit par la rejoindre. Raccourcir le chemin du lien au compte puis à la soirée, à l'étape où la mesure montre qu'on décroche. Dépend de « Mesurer ce qui sert ».
3. `S` **Description de soirée** : champ libre en complément du titre, à la création comme ensuite par l'hôte, affiché en tête de la page soirée pour dire à l'invité dans quoi il entre (thème, consignes, lieu).

---

## 💡 Backlog

### La soirée, du vote à la note

- `L` **Plateformes streaming par compte** : chaque utilisateur renseigne ses abonnements dans ses paramètres, et la page d'une soirée affiche les plateformes communes à tous les participants. Les films peuvent être filtrés à celles-ci.
- `L` **Sondage de disponibilité** : avant de créer une soirée, l'hôte propose plusieurs créneaux à ses follows et chacun coche ses disponibilités. L'hôte retient le créneau final, qui crée la soirée.
- `L` **Thème imposé par l'hôte** : contrainte de proposition posée par l'hôte (genre, décennie, acteur, réalisateur ou classification d'âge maximale) ; les films qui ne la respectent pas sont refusés avec un message explicite, et la contrainte s'affiche en bannière sur la page soirée.
- `M` **Proposition de film anonyme** : option de soirée activable par l'hôte ; le nom du proposant n'est plus affiché sur les cartes de films tant que la roue n'a pas été lancée, pour éviter les votes d'affinité plutôt que de goût.
- `M` **Réactions rapides sur les films** : emojis (❤️ 🔥 😴…) posés sur une carte de film en complément des votes up/down, plus expressif, moins binaire.
- `L` **Co-hôte** : l'hôte désigne un ou plusieurs participants comme co-hôtes, avec les mêmes droits que lui (lancer la roue, expulser un participant, modifier les paramètres) sauf supprimer la soirée.
- `M` **Soirée à distance synchronisée** : une fois le film gagnant désigné, la page soirée guide l'hôte pour lancer une session de visionnage synchronisé avec une extension existante (Teleparty, Scener…) et en partage le lien aux participants.
- `S` **Noter aussi sur Letterboxd ou IMDb** : depuis la note d'un film vu, un bouton ouvre la fiche du film sur Letterboxd ou IMDb pour y reporter sa note.
- `L` **Synchronisation temps réel** : remplacer le rafraîchissement périodique par une connexion temps réel ; propositions, votes et arrivées de participants apparaissent sans délai perceptible.
- `M` **Présence sur la page soirée** : avatars des participants actuellement connectés et signal « en train de proposer un film ». Dépend de la synchronisation temps réel.
- `L` **Chat de soirée** : panneau de discussion en temps réel sur la page soirée, latéral sur ordinateur et en onglet sur mobile, pour remplacer les mini-commentaires par film par un seul espace d'échange. Dépend de la synchronisation temps réel.
- `M` **Consultation hors-ligne de la dernière soirée** : la dernière soirée vue reste lisible sans réseau, avec une bannière « Données en cache, reconnexion en cours ». Lecture seule : les actions attendent le retour du réseau.
- `L` **Reprise des actions faites hors-ligne** : file d'attente des votes et propositions passés sans réseau, rejoués et arbitrés à la reconnexion. Dépend de la synchronisation temps réel et de la consultation hors-ligne.
- `XL` **Mode Battle / Tournoi** : alternative à la roue, l'hôte lance un tournoi en duels ; deux films s'affrontent, les participants votent, et le gagnant passe au tour suivant jusqu'au champion.

### Accueil, aide et contact

- `M` **Onboarding pour nouveaux utilisateurs** : mini tour guidé ou écran de bienvenue à la première connexion, expliquant le concept (créer une soirée, voter, la roue).
- `S` **FAQ / Centre d'aide** : page qui répond aux questions récurrentes (fonctionnement de la roue, invitation, votes), accessible depuis le pied de page.
- `S` **Contact / Support** : formulaire ou adresse dédiée pour signaler un problème, distinct du bouton « Proposer une idée » réservé aux suggestions.
- `S` **Serveur Discord Movie Picker** : un serveur communautaire pour les retours, les idées et l'annonce des versions, avec un lien d'invitation dans le pied de page et le centre d'aide, sans remplacer les tickets GitHub.
- `M` **Statut du service** : page publique indiquant si l'API et le site sont opérationnels.
- `?` **Événements hebdomadaires** : un rendez-vous qui change chaque semaine sur l'accueil, sous une forme à définir : thème à respecter par le film gagnant d'une soirée, événement saisonnier comme Halloween ou Noël.

### Bibliothèque de films

- `L` **Import des films vus depuis Letterboxd** : reprendre les films déjà vus d'un compte Letterboxd avec la note posée sur chacun, qui alimentent le marqueur « déjà vu » et les notes Movie Picker. Complète la synchronisation de la watchlist.
- `S` **Écart watchlist Movie Picker / Letterboxd** : pour les comptes synchronisés, badge sur les films de la liste « À voir » absents de la watchlist Letterboxd, typiquement ceux ajoutés depuis une soirée.
- `L` **Mes listes** : la page Ma liste devient Mes listes, où chacun crée, renomme et supprime ses propres listes de films à côté de la liste « À voir », chacune visible sur le profil ou privée. Un film s'ajoute à n'importe quelle liste depuis sa fiche.
- `L` **Listes collaboratives** : le créateur d'une liste y invite d'autres personnes, qui peuvent y ajouter et en retirer des films, et chaque film affiche qui l'a ajouté. Pensée pour la liste « à voir ensemble » d'un couple ou d'une bande. Dépend de Mes listes.
- `L` **Listes intelligentes** : une liste qui se remplit toute seule dans tout le catalogue TMDB à partir de règles combinées (genres, décennie, note, durée, acteurs, réalisateur, plateformes) et se met à jour d'elle-même. Dépend de Mes listes.

### Fiches films

- `M` **Avertissements de contenu** : badges violence, horreur et 18+ sur les fiches films ; option hôte « masquer les films 18+ » pour les soirées en famille.
- `M` **Trigger warnings sur les fiches films** : avertissements précis (violence sexuelle, mort d'un animal, lumières clignotantes, suicide) tirés d'une base communautaire, sur la fiche et sur la carte du film tiré, masquables par compte. Prolonge les avertissements de contenu.
- `XL` **Vrai support des séries (progression par épisode)** : suivre la saison et l'épisode en cours d'une série et le prochain à voir, via les endpoints TMDB dédiés. Remplace le traitement actuel d'une série comme un simple film.

### Profil et social

- `L` **Cercles d'amis** : groupes persistants d'utilisateurs réutilisables d'une soirée à l'autre ; invitation en un clic de tout le cercle.
- `M` **Compatibilité ciné** : score de compatibilité avec un ami, calculé sur les films « déjà vu » et les notes en commun.
- `S` **Statistique : note moyenne des films gagnants** : dans les statistiques du profil public, la moyenne des notes TMDB des films gagnants des soirées auxquelles l'utilisateur a participé.
- `L` **Badges / achievements** : quatre badges (Organisateur, Cinéphile, Faiseur de rois, Juré assidu), dont le code de calcul a été supprimé ; à concevoir avec un design abouti et réimplémenter.
- `L` **Fil d'actualité** : un fil qui rassemble l'activité des comptes suivis (soirées créées et terminées, films notés, listes publiées) et les soirées publiques à venir. Il prolonge la rangée « Vos amis ont vu » de l'accueil, limitée aux films vus.
- `L` **Soirée publique** : une soirée que l'hôte rend publique apparaît sur une page de découverte, et n'importe quel compte peut la rejoindre. L'hôte peut bannir un participant, qui ne peut alors plus revenir par le lien. Dépend de la synchronisation temps réel.
- `XL` **Messages privés** : messagerie directe entre deux utilisateurs qui se suivent mutuellement, accessible depuis le profil public ou la liste de follows, pour organiser une soirée en dehors d'une soirée existante.

### Compte et sécurité

- `M` **Sessions actives** : liste des appareils et navigateurs connectés dans la section « Connexions », avec révocation individuelle.
- `M` **Alerte nouvelle connexion** : e-mail automatique envoyé à l'utilisateur lors d'une connexion depuis un nouvel appareil ou navigateur.
- `M` **Double authentification (2FA/TOTP)** : code à six chiffres généré par une application d'authentification, activable en option dans les paramètres de compte.
- `L` **Passkeys (WebAuthn)** : connexion sans mot de passe via biométrie ou PIN de l'appareil, en complément de l'e-mail / mot de passe et des fournisseurs OAuth.
- `M` **Connexion Discord, Meta et Twitch** : trois fournisseurs OAuth supplémentaires aux côtés de Google et GitHub, dans la section « Connexions » existante.

### Plateforme

- `XL` **Application mobile native** : une vraie application iOS et Android, pleinement intégrée à la plateforme, avec les notifications du système et tout le parcours hors navigateur. Le prototype de cours archivé dans `archive/mobile` n'est pas à reprendre.
- `M` **Story Instagram en un geste** : depuis l'application mobile, un bouton pose l'image du recap directement dans une story Instagram, avec un lien cliquable qui ramène au recap. Dépend de l'application mobile native.
- `M` **i18n étendue** : langues supplémentaires au-delà de FR / EN ; variantes régionales, RTL si besoin.
- `L` **Palette de commandes (Cmd+K)** : accès clavier global aux actions et à la navigation ; recherche floue sur les soirées, les films et les utilisateurs, création de soirée, changement de thème.

---

## ⏸️ En pause

- `XL` **Refonte visuelle de la plateforme** : Movie Picker prend l'allure d'une salle de cinéma, fond noir, film à la une en grand, affiches vivantes au survol, rangées jusqu'au bord. En pause pour essayer d'autres approches ; reprise par étages (jetons, composants, mises en page) quand l'une est retenue.

---

## 🗄️ Rejetée

Rien pour l'instant.
