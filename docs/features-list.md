# Movie Picker – Features list

**Nom du projet : Movie Picker.**

Liste des fonctionnalités (spécification complète du site + découpage par version MVP, V1, V2, V3).  
Pour la partie technique (stack, cloud, CI/CD), voir [spec-technique.md](spec-technique.md).

---

# Partie 1 – Spécification complète du site

Liste de tout ce qu'il y a dans le site (vision cible), puis UX/UI, cas limites et optionnel.

## 1. Liste de tout ce qu'il y a dans le site

### Création et gestion des soirées
- **Créer une soirée** : titre, date, heure, **lieu** (optionnel : adresse ou lien Google Maps), description (optionnelle).
- **Lien de partage** : URL unique par événement (ex. `https://app.com/s/abc123`) à envoyer par message.
- **Lien « Copier le lien »** : bouton qui copie l'URL de la soirée dans le presse-papier pour partager en un clic.
- **QR code** : génération d'un QR code pointant vers l'URL de la soirée ; affichage sur la page (hôte et participants) pour rejoindre facilement depuis le téléphone.
- **Modifier une soirée** : titre, date, heure, lieu, description (par le créateur).
- **Supprimer une soirée** (par le créateur).
- **Voir la liste de mes soirées** (créées ou auxquelles j'ai participé).
- **Historique** : page « Soirées passées » ou filtre « terminées » ; pour chaque soirée clôturée, affichage du film gagnant et de la liste des films en lecture seule.

### Compte utilisateur
- **Créer un compte** : inscription optionnelle (email, mot de passe, éventuellement pseudo par défaut). La participation aux soirées reste possible **sans compte** (pseudo par soirée uniquement).
- **Se connecter / Se déconnecter** : connexion par email + mot de passe ; déconnexion depuis le menu ou la page profil.
- **Mot de passe oublié** : lien « Réinitialiser le mot de passe » sur la page de connexion ; envoi d'un email avec lien sécurisé pour définir un nouveau mot de passe.
- **Avec un compte** : la liste « Mes soirées » (créées ou auxquelles j'ai participé) est persistante et synchronisée sur tous les appareils ; l'hôte peut être reconnu via son compte en plus du lien avec token ; possibilité de pré-remplir le pseudo avec le pseudo du compte quand on rejoint une soirée.
- **Sans compte** : usage inchangé (lien de partage, pseudo par soirée, token pour l'hôte) ; les soirées sont associées au navigateur / session jusqu'à déconnexion ou expiration.

### Rôle « hôte » et configuration de la soirée
- **Rôle « hôte »** : seul le créateur de la soirée est l'hôte (identifié par un token dans l'URL, un cookie de session, ou son compte s'il est connecté) ; lui seul peut lancer la roue, clôturer l'événement et **configurer la soirée**.
- **Configuration par l'hôte** : l'hôte peut paramétrer sa soirée comme il le souhaite, avant ou pendant l'événement (selon les options) :
  - **Thème de la soirée** : tag ou catégorie (ex. « Horreur », « Comédie », « SF », « Noël ») pour l'ambiance ; affichage d'un bandeau ou d'une couleur selon le thème.
  - **Expiration du lien** : date de fin de validité (date de la soirée, ou X jours après création).
  - **Limite de propositions** : nombre max de films par participant (ex. 1, 3, 5 ou illimité).
  - **Plage de votes** : votes ouverts jusqu'à une heure avant la soirée, ou jusqu'au lancement de la roue (configurable).
  - **Roue** : mode « aléatoire strict » ou « pondéré » (plus de chance pour les mieux notés).
  - **Réactions autorisées** : l'hôte choisit quelles réactions sont disponibles (voir ci‑dessous), en plus du up/down vote.
  - **Séries OK / pas OK** : toggle « Accepter les séries » ; si désactivé, seuls les films sont acceptés (type film/série fourni par l'API TMDB/OMDB) ; affichage du type (film ou série) sur chaque proposition.
  - **Limite de participants** : nombre max de participants (optionnel, ex. 10 ou illimité) ; au-delà, message « Soirée complète » ou refus d'inscription.
- **Page « Paramètres » ou « Config »** : accessible uniquement à l'hôte depuis la page de la soirée.

### Participation
- **Rejoindre un événement** : en cliquant sur le lien, sans compte obligatoire. Si l'utilisateur a un compte et est connecté, son pseudo par défaut peut être proposé (modifiable).
- **Pseudo par soirée** : en rejoignant (ou en ouvrant la soirée), chaque participant choisit un **pseudo** affiché à côté de ses propositions, votes et réactions pour cette soirée uniquement.
- **Voir les détails de la soirée** : titre, date, **lieu** (si renseigné), thème, liste des films proposés, votes, réactions, bouton « Lancer la roue » (visible uniquement pour l'hôte).
- **Compte à rebours** : affichage « Dans X jours » ou « Dans X heures » jusqu'à la date/heure de la soirée (et éventuellement « C'est ce soir » / « En cours »).
- **Lien « Ajouter au calendrier »** : bouton qui génère un fichier .ics (ou lien Google Calendar / Outlook) pour ajouter la soirée à son agenda (titre, date, heure, lieu).
- **Mise à jour en direct** : les nouvelles propositions, votes et réactions s'affichent sans recharger la page (WebSocket ou polling) ; idem pour le résultat de la roue quand l'hôte la lance.

### Films
- **Proposer un film** : titre (recherche ou saisie) → **infos film automatiques** (poster, année, résumé, **note moyenne**, **bande-annonce**) via API (TMDB / OMDB).
- **Note moyenne** : note du film (ex. TMDB / IMDb) affichée sur chaque proposition (étoiles ou score sur 10) pour aider au vote.
- **Bande-annonce** : lien vers la bande-annonce (YouTube ou autre) récupéré via l'API quand disponible ; affiché sur la fiche du film (miniature cliquable ou bouton « Voir la bande-annonce »). Si non disponible, rien n'est affiché.
- **Qui a proposé** : pour chaque film, affichage du **pseudo** du participant qui l'a proposé ; badge « C'est moi » sur ses propres propositions.
- **Cache des posters** : après un appel à l'API films, les URLs ou images des posters sont stockées (bucket ou BDD) pour limiter les appels et accélérer l'affichage des films déjà vus.
- **Doublons** : détection des films déjà proposés (même titre ou même ID TMDB) ; message « Déjà proposé » et blocage ou avertissement si quelqu'un tente d'ajouter un doublon.
- **Liste des films proposés** : affichage avec poster, titre, année, type (film ou série si « Séries OK » activé), note moyenne, bande-annonce, qui a proposé (pseudo), score (up/down), réactions (voir ci‑dessous).
- **Upvote / Downvote** : chaque participant peut voter une fois par film (selon la config de l'hôte).
- **Réactions** (en plus du up/down vote) : chaque participant peut poser **une ou plusieurs réactions** par film, selon la config de l'hôte. Exemples : « J'ai déjà vu ce film », « J'aimerais bien le voir », « Pas envie », « Masterpiece », « Je m'en fous » (liste configurable ou prédéfinie selon le thème).
- Les réactions sont affichées sous ou à côté du film (icônes + compteurs ou liste de pseudos).
- **Retirer sa proposition** (par celui qui a proposé, tant que la roue n'a pas été lancée).

### Roue
- **Lancer la roue** (réservé à l'hôte) : prise en compte des films (filtrés selon la config : ex. score > 0 ou top N).
- **Animation** : roue qui tourne et s'arrête sur un film gagnant.
- **Résultat** : affichage du film choisi ; l'hôte peut relancer (sans le gagnant) ou clôturer la soirée.
- **Cas particuliers** : si aucun film n'est proposé, message « Aucun film pour l'instant » et la roue ne peut pas être lancée ; si un seul film, affichage direct comme gagnant (sans animation) ou tirage quand même au choix.

### Sécurité et durée de vie
- **Expiration du lien** : configurée par l'hôte ; après expiration, lecture seule ou message « Soirée terminée ».

### Interface et confort
- **Mode sombre / clair** : toggle dans l'interface (préférence stockée en local, ou sur le compte si connecté).
- **Vue grille / liste** : bascule entre affichage en **grille** (posters, cartes) et en **liste** (texte compact, moins d'images) pour la liste des films de la soirée.
- **Mode hors-ligne léger** : mise en cache de la dernière vue de la soirée (données + assets) ; affichage basique possible sans réseau (lecture seule, avec indication « Données en cache »). En mode hors-ligne, pas de mise à jour en direct ; les données affichées sont celles du dernier chargement.
- **Usage principal sur mobile** : le site est pensé d'abord pour le **téléphone** ; voir section « UX/UI – Mobile first » ci-dessous.

### Technique (côté projet cloud)
- **Front** : pages (accueil, créer soirée, détail soirée avec films/votes/réactions/roue, paramètres hôte, historique, inscription, connexion, profil), **mobile-first** puis responsive (tablette, desktop), mode sombre/clair, vue grille/liste, mode hors-ligne léger (cache).
- **API** : événements, participants, films, votes, réactions, tirage roue, config soirée ; **auth** (inscription, connexion, déconnexion, session).
- **Base de données** : **utilisateurs** (email, mot de passe hashé, pseudo par défaut, préférences) ; soirées (dont config, lieu, date/heure, créateur_id si compte) ; participants (pseudo par soirée, lien à la soirée, user_id optionnel) ; films (dont id API, poster, note, bande-annonce, proposé par) ; votes ; réactions.
- **Services externes** : API films (TMDB ou OMDB) pour infos, posters, note moyenne, bande-annonce (si disponible).
- **Cache des posters** : stockage des posters en bucket (ou BDD) après appel API pour limiter les requêtes et améliorer les perfs.
- **Rate limiting** : limitation du nombre de créations de soirées, propositions et votes par IP (ou par session) pour éviter les abus et le spam.
- **Sécurité technique** : communication en **HTTPS** ; mots de passe stockés hashés (bcrypt, Argon2 ou équivalent), jamais en clair ; clé API films (TMDB/OMDB) utilisée **côté serveur uniquement** (pas d'exposition au client).
- **Environnement / déploiement** : variables d'environnement pour la config (URL de l'API, clé TMDB/OMDB, secret de session, URL front, connexion BDD) ; documentation des étapes de déploiement (voir consigne du projet).
- **CI/CD** : lint, tests (front Vitest + couverture, API .NET unitaires + intégration + Coverlet), build, déploiement ; E2E navigateur optionnel en local — voir [mvp/deploy-cicd.md](mvp/deploy-cicd.md).
- **Monitoring** : logs, métriques (créations, votes, tirages).

---

## 2. UX/UI – Mobile first (usage principal sur téléphone)

Le design et l'ergonomie sont pensés **en priorité pour le téléphone** : la majorité des utilisateurs rejoignent une soirée via un lien partagé (messagerie, SMS) et utilisent l'appareil en main.

### Principes de conception
- **Mobile first** : maquettes et styles définis d'abord pour un écran étroit (≈ 375 px) ; adaptations ensuite pour tablette et desktop (breakpoints).
- **Une main, pouce** : actions principales (rejoindre, proposer un film, voter, lancer la roue) accessibles sans étirement, zones cliquables suffisamment grandes (min. 44×44 px).
- **Peu de scroll horizontal** : contenu en colonne unique sur mobile ; grille de films en 1 ou 2 colonnes, pas plus.
- **Navigation simple** : menu type hamburger ou barre en bas (onglets : Accueil / Mes soirées / Compte) ; pas de sous-menus profonds.
- **Formulaires** : champs pleine largeur, champs de saisie et boutons bien espacés ; éviter le clavier qui masque le bouton de validation (bouton « Valider » / « Proposer » visible ou scroll automatique).
- **Roue** : animation lisible sur petit écran (roue centrée, texte lisible) ; bouton « Lancer la roue » bien visible et fixe ou en bas d'écran si besoin.
- **Partage** : « Copier le lien » et QR code particulièrement utiles sur mobile (partage vers une autre app, scan du QR depuis un autre téléphone).

### Contenu et lisibilité
- **Texte** : taille de police lisible sans zoom (ex. 16 px minimum pour le corps de texte) ; contraste suffisant (mode sombre/clair).
- **Posters** : taille adaptée au petit écran (pas trop petits pour rester reconnaissables) ; chargement progressif ou placeholder pour ne pas bloquer l'affichage.
- **Messages et toasts** : retours courts et visibles (succès, erreur) sans masquer le contenu principal ; disparition automatique ou fermeture facile.

### Performance et ressenti mobile
- **Poids des pages** : limiter les ressources lourdes sur mobile (images optimisées, lazy load).
- **Touch** : pas de dépendance au survol (hover) pour les infos importantes ; utiliser tap/long press si besoin.
- **Orientation** : l'app doit rester utilisable en portrait et en paysage (la roue peut profiter du paysage).

### Récapitulatif
- Design **mobile first**, puis responsive.
- Gros boutons, navigation simple, formulaires adaptés au clavier.
- Lisibilité (texte, posters, contraste) et feedback utilisateur clair.
- Performance et usage au doigt (touch) prioritaires.

---

## 3. Cas limites et messages utilisateur

- **Lien invalide ou soirée supprimée** : page 404 ou message clair « Cette soirée n'existe pas ou a été supprimée » avec lien vers l'accueil.
- **Soirée terminée / expirée** : message « Soirée terminée » ou « Cette soirée est terminée » ; affichage en lecture seule (film gagnant, liste des films).
- **Soirée complète** : si limite de participants atteinte, message « Soirée complète » ou « Le nombre max de participants est atteint » à l'ouverture du lien.
- **API films indisponible** : lors de la recherche de film, message « Service temporairement indisponible » ; possibilité de saisir le titre à la main sans infos auto (poster, note, bande-annonce optionnels).
- **Roue** : aucun film ou un seul film (voir section Roue).
- **Validation des données** : champs obligatoires (titre de la soirée, date, heure) ; format email à l'inscription ; mot de passe avec contraintes minimales (longueur, etc.) ; pseudo non vide par soirée.

---

## 4. À considérer (optionnel)

- **Suppression du compte** : depuis la page profil, option « Supprimer mon compte » avec confirmation ; suppression des données personnelles (email, pseudo), les soirées créées peuvent être conservées en anonyme ou supprimées selon le choix.
- **Accessibilité** : contraste suffisant (mode sombre/clair), navigation au clavier, labels sur les boutons et champs pour les lecteurs d'écran.
- **Pages d'erreur** : 404 (soirée ou page inexistante), 500 (erreur serveur) avec message clair et lien vers l'accueil.
- **Crédits / attribution API** : les APIs TMDB et OMDB imposent souvent une attribution (ex. « Données fournies par TMDB ») ; prévoir un lien ou une mention en bas de page ou sur les fiches films.
- **Cookies et confidentialité** : si des cookies (session, préférences) sont utilisés, prévoir une mention dans les mentions légales ou un bandeau d'information ; cookies strictement nécessaires au fonctionnement peuvent être exemptés de consentement selon la réglementation.

---

# Partie 2 – Roadmap par version (MVP, V1, V2, V3)

## Principes

- **MVP** : parcours minimal utilisable (créer soirée → partager → proposer films → voter → roue) + tous les critères techniques Ynov.
- **V1, V2, V3** : ajouts progressifs de la spec complète, sans casser le cœur métier.
- **Architecture extensible** : modèles et composants prévus pour accueillir les features suivantes sans refacto majeur.

---

## MVP – Features produit

**Objectif** : application démoable avec le parcours Movie Picker minimal.

### Création et accès

- Créer une soirée : titre, date, heure (obligatoires).
- Lien de partage unique (ex. `/s/abc123`) ; bouton « Copier le lien ».
- Rejoindre via le lien ; saisie d'un **pseudo** (obligatoire) pour cette soirée.
- Identification de l'**hôte** : token dans l'URL (ex. `?host=xxx`) ou cookie après création ; seul l'hôte peut lancer la roue et clôturer.

### Films

- Proposer un film : recherche par titre → API TMDB/OMDB côté serveur → **titre, année, poster** (minimum).
- Liste des films proposés avec poster, titre, année, **qui a proposé** (pseudo).
- **Doublons** : refus d'ajouter un film déjà proposé (même id API ou titre).
- **Upvote / Downvote** : un vote par participant par film.
- Retirer sa proposition (par le proposant, tant que la roue n'a pas été lancée).

### Roue

- Bouton « Lancer la roue » (visible uniquement pour l'hôte).
- Tirage parmi les films proposés (tous ou score > 0, au choix fixe pour le MVP).
- Animation simple (roue qui tourne puis s'arrête sur un film).
- Affichage du film gagnant ; bouton « Clôturer la soirée » (hôte).
- Cas 0 film : message « Aucun film », bouton roue désactivé. Cas 1 film : affichage direct du gagnant.

### Sécurité et durée de vie

- Expiration basique : soirée « terminée » après la date/heure de la soirée (ou champ optionnel « date de fin »). Page en lecture seule avec message « Soirée terminée » si expirée.

---

## Migration back .NET (étape entre MVP et V1)

**Objectif** : remplacer l’API Node.js/Express par une API **ASP.NET Core (C#)** sans changer les fonctionnalités ni le front. Le contrat API (routes, JSON) reste identique pour que le front React et le déploiement (Cloud Run, S3/CloudFront) continuent de fonctionner.

### Périmètre technique

- Nouveau projet **ASP.NET Core Web API** (ex. `apps/api-dotnet` ou remplacement de `apps/api`).
- **Mêmes routes et contrats** : POST/GET events, join, movies (liste, ajout, vote, suppression), wheel, close ; format JSON inchangé.
- **MongoDB** : mêmes collections (events, participants, movies, votes) avec **MongoDB.Driver**.
- **TMDB** : appel côté serveur (HttpClient), clé en variable d’environnement.
- **Docker** : image .NET (mcr.microsoft.com/dotnet/aspnet), build `dotnet publish`.
- **CI/CD** : adapter le workflow (build .NET, push image, déploiement Cloud Run) ; le front et l’URL de l’API restent identiques.

### Livrables

- [x] Contrat API documenté (OpenAPI/Swagger) aligné sur l’API actuelle.
- [x] API .NET déployée sur Cloud Run, même comportement que le MVP (parcours complet testé).
- [x] Ancienne API Node retirée ou désactivée après validation.

**Le back .NET est la base pour la V1** (comptes, config, réactions). Référence : [architecture-api-dotnet.md](architecture-api-dotnet.md), [mvp/roadmap-mvp.md](mvp/roadmap-mvp.md) § 17 (contrat : Swagger en dev, `OpenApiContractTests.cs`).

---

## V1 – Features

**Objectif** : compte utilisateur, config hôte, réactions, confort de partage et de lecture.

- **Compte utilisateur** : inscription (email, mot de passe, pseudo par défaut), connexion, déconnexion. Mot de passe oublié (lien par email).
- **Mes soirées** : liste persistante pour les utilisateurs connectés ; reconnaissance de l'hôte par compte en plus du token.
- **Config par l'hôte** : page Paramètres (thème, expiration, limite de propositions, type de roue aléatoire/pondérée). Réactions autorisées : choix des réactions disponibles en plus du up/down.
- **Réactions** : en plus du vote, réactions type « J'ai déjà vu », « J'aimerais bien », etc. (liste configurable par l'hôte).
- **Partage** : QR code ; « Copier le lien » (déjà en MVP).
- **Mise à jour en direct** : polling (ou WebSocket) pour voir les nouveaux films et votes sans recharger.
- **Interface** : mode sombre/clair (préférence locale ou compte).
- **Technique** : cache des posters (bucket ou BDD) ; rate limiting basique ; table `users`, `reactions` ; routes auth et config.

---

## V2 – Features

**Objectif** : contenu film riche, options de soirée, historique, UX avancée.

- **Films** : note moyenne (API), bande-annonce (lien), durée si disponible ; option « Séries OK / pas OK » (config hôte).
- **Soirée** : lieu, description ; compte à rebours ; lien « Ajouter au calendrier » (.ics).
- **Config** : limite de participants, plage de votes (configurable).
- **Historique** : filtre « Soirées passées », affichage du film gagnant et liste en lecture seule.
- **Interface** : vue grille / liste ; mode hors-ligne léger (cache dernière vue).
- **Cas limites** : messages clairs (soirée complète, lien invalide, API films indisponible), validation renforcée.

---

## V3 – Features (optionnel / bonus)

- Suppression du compte, export des données.
- Accessibilité (contraste, clavier, labels).
- Pages d'erreur dédiées (404, 500).
- Crédits API (TMDB/OMDB), mention cookies/confidentialité.
- **Environnement de staging** : second déploiement (ex. service Cloud Run + build front dédiés, ou URL préfixée) pour valider avant production ; secrets, `VITE_API_URL`, `ALLOWED_ORIGINS` et base de données de test — reprendre le modèle décrit dans [mvp/deploy-cicd.md](mvp/deploy-cicd.md).
- Bonus cloud : autoscaling, IaC (Terraform/CloudFormation), multi-région, etc.

---

## Récapitulatif par version

| Bloc | MVP | V1 | V2 | V3 |
|------|-----|----|----|-----|
| Créer soirée (titre, date, heure) | ✅ | – | Lieu, description | – |
| Lien partage + Copier lien | ✅ | – | – | – |
| Rejoindre + pseudo | ✅ | – | – | – |
| Hôte (token / cookie) | ✅ | + compte | – | – |
| Proposer film (API, poster, titre, année) | ✅ | – | Note, bande-annonce, durée, séries OK | – |
| Doublons, qui a proposé | ✅ | – | – | – |
| Up/down vote | ✅ | – | – | – |
| Réactions (« j'ai déjà vu », etc.) | ❌ | ✅ | – | – |
| Roue (lancer, animation, résultat, clôturer) | ✅ | – | – | – |
| Config hôte (thème, expiration, limites, roue, réactions) | ❌ (expiration basique) | ✅ | Limite participants, plage votes | – |
| Expiration / soirée terminée | ✅ (basique) | – | – | – |
| Compte utilisateur | ❌ | ✅ | – | Suppression, export |
| QR code | ❌ | ✅ | – | – |
| Mise à jour en direct | ❌ | ✅ | – | – |
| Mode sombre, vue grille/liste, hors-ligne | ❌ | Mode sombre | Grille/liste, hors-ligne | – |
| Cache posters, rate limiting | ❌ | ✅ | – | – |
| Calendrier .ics, compte à rebours | ❌ | ❌ | ✅ | – |
| Historique soirées passées | ❌ | ❌ | ✅ | – |
| Accessibilité, crédits API, cookies | ❌ | ❌ | ❌ | ✅ |
| Environnement staging (pré-prod) | ❌ | ❌ | ❌ | ✅ |
