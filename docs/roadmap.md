# Roadmap de Movie Picker

Le backlog du projet, en flux continu : ce qui est en cours, ce qui vient ensuite dans l'ordre, le reste gardé dans un coin, rangé par thème, et les idées écartées. Ce qui est livré n'y figure plus : l'historique vit dans [`CHANGELOG.md`](../CHANGELOG.md) et dans le journal des versions de l'application (`/nouveautes`).

---

## Principes

- **Flux continu** : aucune version planifiée, aucun lot. Chaque entrée se livre seule, sur une branche courte fusionnée dans `master` et mise en production le jour où elle est prête, avec sa propre version calculée à partir du CHANGELOG (voir `AGENTS.md`). Une entrée livrée sort de ce fichier.
- **Statuts** : la section porte le statut de ses entrées.
  - 🚧 **En cours** : une partie est déjà en ligne et la suite est engagée, typiquement les tranches restantes d'une entrée découpée. Deux entrées au plus : on finit avant d'ouvrir.
  - ⏭️ **Prochainement** : les entrées à prendre ensuite, numérotées dans l'ordre où elles se prennent. Pas de plafond : la liste reste triée, et la première entrée est toujours la prochaine prise.
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

1. `M` **Alerte nouvelle connexion** : e-mail automatique envoyé à l'utilisateur lors d'une connexion depuis un nouvel appareil ou navigateur.
2. `M` **Double authentification (2FA/TOTP)** : code à six chiffres généré par une application d'authentification, activable en option dans les paramètres de compte.
3. `L` **Palette de commandes (Cmd+K)** : accès clavier global aux actions et à la navigation (création de soirée, changement de thème, pages de l'application), dans le même champ que la recherche de la barre de navigation.
4. `L` **Passkeys (WebAuthn)** : connexion sans mot de passe via biométrie ou PIN de l'appareil, en complément de l'e-mail / mot de passe et des fournisseurs OAuth.
5. `M` **Avertissements de contenu** : badges violence, horreur et 18+ sur les fiches films ; option hôte « masquer les films 18+ » pour les soirées en famille.
6. `M` **Trigger warnings sur les fiches films** : avertissements précis (violence sexuelle, mort d'un animal, lumières clignotantes, suicide) tirés d'une base communautaire, sur la fiche et sur la carte du film tiré, masquables par compte. Prolonge les avertissements de contenu.
7. `M` **Une liste pour chaque groupe** : chaque groupe a sa liste « À voir ensemble », que tous ses membres remplissent. Dans une soirée du groupe, proposer un film et la pioche partent d'abord de cette liste.
8. `M` **Réactions rapides sur les films** : emojis (❤️ 🔥 😴…) posés sur une carte de film en complément des votes up/down, plus expressif, moins binaire.
9. `L` **Sondage de disponibilité dans un groupe** : sur la page d'un groupe, un membre propose plusieurs créneaux et chacun coche ceux où il est libre. Le créneau retenu devient une soirée du groupe, annoncée à tous ses membres.
10. `L` **Bilan de l'année** : en décembre, chaque membre et chaque groupe reçoit une page à partager qui résume son année : films vus ensemble, meilleure et pire note, qui a gagné le plus de tirages, le film qui a le plus divisé.

---

## 💡 Backlog

### La soirée, du vote à la note

- `L` **Rejoindre une soirée sans compte** : un invité entre dans une soirée avec un simple prénom, propose des films et vote sans s'inscrire. Le compte lui est proposé après le recap, pour garder ses notes et retrouver la soirée.
- `L` **Plateformes de streaming par compte** : chacun renseigne dans son profil ses abonnements, et une soirée marque disponible un film présent sur la plateforme d'au moins un participant. Un panneau de la soirée liste les plateformes retenues, à cocher ou décocher à la main.
- `M` **Déjà vu automatique en soirée** : dans une soirée, un film qui figure dans les films vus d'un participant est marqué « Déjà vu » pour lui, sans qu'il ait à le faire. Seulement pour qui a rendu ses films vus visibles, pour ne rien dévoiler d'une liste privée.
- `L` **Thème imposé par l'hôte** : contrainte de proposition posée par l'hôte (genre, décennie, acteur, réalisateur ou classification d'âge maximale) ; les films qui ne la respectent pas sont refusés avec un message explicite, et la contrainte s'affiche en bannière sur la page soirée.
- `M` **Soirée à distance synchronisée** : une fois le film gagnant désigné, la page soirée guide l'hôte pour lancer une session de visionnage synchronisé avec une extension existante (Teleparty, Scener…) et en partage le lien aux participants.

### Accueil, aide et contact

- `?` **Événements hebdomadaires** : un rendez-vous qui change chaque semaine sur l'accueil, sous une forme à définir : thème à respecter par le film gagnant d'une soirée, événement saisonnier comme Halloween ou Noël.

### Bibliothèque de films

- `L` **Listes intelligentes** : une liste qui se remplit toute seule dans tout le catalogue TMDB à partir de règles combinées (genres, décennie, note, durée, acteurs, réalisateur, plateformes) et se met à jour d'elle-même, à enregistrer dans Mes listes comme une saga.

### Fiches films

- `XL` **Vrai support des séries (progression par épisode)** : suivre la saison et l'épisode en cours d'une série et le prochain à voir, via les endpoints TMDB dédiés. Remplace le traitement actuel d'une série comme un simple film.

### Profil et social

- `M` **Une liste en vitrine sur le profil** : un membre épingle l'une de ses listes publiques en haut de son profil, avec ses affiches et son nombre de films, pour la montrer à ceux qui le visitent.
- `M` **Cadres d'avatar à débloquer** : un contour autour de l'avatar, gagné avec la flamme de soirées, le soutien Ko-fi ou un nombre de soirées, que le membre choisit d'afficher et que tous voient, sur son profil comme en soirée.
- `M` **Compatibilité ciné** : score de compatibilité avec un ami, calculé sur les films « déjà vu » et les notes en commun.
- `L` **Badges / achievements** : quatre badges (Organisateur, Cinéphile, Faiseur de rois, Juré assidu), dont le code de calcul a été supprimé ; à concevoir avec un design abouti et réimplémenter.
- `L` **Fil d'actualité** : un fil qui rassemble l'activité des comptes suivis (soirées créées et terminées, films notés, listes publiées) et les soirées publiques à venir. Il prolonge la rangée « Vos amis ont vu » de l'accueil, limitée aux films vus.
- `L` **Chat de groupe** : discussion en temps réel entre les membres d'un groupe, sur la page du groupe (panneau latéral sur ordinateur, onglet sur mobile), pour parler des films vus et organiser la prochaine soirée sans passer par une autre messagerie.
- `XL` **Messages privés** : messagerie directe entre deux utilisateurs qui se suivent mutuellement, accessible depuis le profil public ou la liste de follows, pour organiser une soirée en dehors d'une soirée existante.

### Plateforme

- `XL` **Application mobile native** : une vraie application iOS et Android, pleinement intégrée à la plateforme, avec les notifications du système et tout le parcours hors navigateur. Le prototype de cours archivé dans `archive/mobile` n'est pas à reprendre.
- `M` **Story Instagram en un geste** : depuis l'application mobile, un bouton pose l'image du recap directement dans une story Instagram, avec un lien cliquable qui ramène au recap. Dépend de l'application mobile native.

---

## ⏸️ En pause

- `XL` **Refonte visuelle de la plateforme** : Movie Picker prend l'allure d'une salle de cinéma, fond noir, film à la une en grand, affiches vivantes au survol, rangées jusqu'au bord. En pause pour essayer d'autres approches ; reprise par étages (jetons, composants, mises en page) quand l'une est retenue.

---

## 🗄️ Rejetée

- `S` **Description de soirée** : champ libre en complément du titre, à la création comme ensuite par l'hôte, affiché en tête de la page soirée pour dire à l'invité dans quoi il entre (thème, consignes, lieu). Écartée : la fenêtre de création garde le moins de champs possible, et le titre et le thème disent déjà à l'invité dans quoi il entre.
- `XL` **Mode Battle / Tournoi** : alternative à la roue, l'hôte lance un tournoi en duels ; deux films s'affrontent, les participants votent, et le gagnant passe au tour suivant jusqu'au champion. Écartée : les votes, la roue et le choix de l'hôte suffisent à trancher.
- `L` **Soirée de démo sans compte** : un bouton de l'accueil ouvre une soirée déjà remplie de participants fictifs, de films proposés et de votes, où le visiteur vote et lance la roue sans créer de compte. Écartée : la page « Comment ça marche » a déjà une roue jouable sans compte.
- `S` **Serveur Discord Movie Picker** : un serveur communautaire pour les retours, les idées et l'annonce des versions, avec un lien d'invitation dans le pied de page et la page « Comment ça marche », sans remplacer les tickets GitHub. Écartée : « Envoyer un retour » et les tickets GitHub suffisent à recueillir les retours.
- `M` **i18n étendue** : langues supplémentaires au-delà de FR / EN ; variantes régionales, RTL si besoin. Écartée : le français et l'anglais couvrent le public de l'application.
- `M` **Connexion Discord, Meta et Twitch** : trois fournisseurs OAuth supplémentaires aux côtés de Google et GitHub, dans la section « Connexions » existante. Écartée : l'e-mail, Google et GitHub couvrent déjà l'inscription.
