# Movie Picker – Spec complète 

**Nom du projet : Movie Picker.**

Spec complète du site, organisée **par domaine métier**. Chaque section décrit le **quoi** (côté utilisateur) ; quand c’est pertinent, un sous-bloc **Tech** précise les briques d’implémentation (infra, sécurité, dépendances). Une dernière section regroupe la **plateforme transverse** (CI/CD, observabilité, etc.) sans pendant produit.

Pour le **découpage par version** :
- Roadmap produit → [roadmap-product.md](roadmap-product.md)
- Roadmap tech → [roadmap-tech.md](roadmap-tech.md)

> **Convention de lecture**
> Chaque domaine présente d’abord les **fonctionnalités** (côté user). Les **briques techniques** propres au domaine viennent juste après dans un encart **Tech** quand elles existent. Les exigences techniques **transverses** (CI/CD, observabilité, qualité…) sont regroupées en fin de fichier dans la section **Plateforme transverse**.

---

## 1. Création et gestion des soirées

- **Créer une soirée** : titre, date, heure, **lieu** (optionnel : adresse ou lien Google Maps), description (optionnelle).
- **Lien de partage** : URL unique par événement (ex. `https://app.com/e/abc123`) à envoyer par message.
- **Aperçu du lien partagé** (messageries, réseaux) : balises **Open Graph / Twitter Cards** (titre, description, image) pour un extrait lisible lors du collage de l’URL. Une SPA qui sert le même `index.html` pour toutes les routes donne souvent un aperçu **générique** ; un aperçu **dynamique** (titre de la soirée, éventuellement compteur de participants) suppose HTML généré par URL. **Confidentialité** : tout indicateur dans l’aperçu (ex. nombre de participants) doit être **explicitement acceptable** pour l’hôte / la visibilité de l’événement.
- **Lien « Copier le lien »** : bouton qui copie l'URL de la soirée dans le presse-papier pour partager en un clic.
- **QR code** : génération d'un QR code pointant vers l'URL de la soirée ; affichage sur la page (hôte et participants) pour rejoindre facilement depuis le téléphone.
- **Modifier une soirée** : titre, date, heure, lieu, description (par le créateur).
- **Supprimer une soirée** (par le créateur).
- **Voir la liste de mes soirées** (créées ou auxquelles j'ai participé).
- **Historique** : page « Soirées passées » ou filtre « terminées » ; pour chaque soirée clôturée, affichage du film gagnant et de la liste des films en lecture seule.

**Tech**
- **Aperçu OG dynamique (volet infra)** : mécanisme **serveur ou edge** (HTML minimal ou injection de meta) servant des meta **par URL** d’événement aux crawlers ; sinon OG statiques + limite documentée. Endpoint **résumé événement** lisible par les crawlers (titre, description, image, indicateurs filtrés selon option hôte).
- **Expiration / lecture seule** : blocage des écritures côté API une fois la soirée terminée ; lecture seule garantie post-clôture sur tous les endpoints concernés.
- **Identifiants d’URL** : slug court (id opaque) pour `/e/:slug`, sans information sensible.

---

## 2. Compte utilisateur

- **Créer un compte** : inscription (email, mot de passe, éventuellement pseudo par défaut). **V1** : la **création d’une soirée** exige un compte ; **rejoindre** une soirée reste possible **sans compte** (pseudo par soirée uniquement).
- **Se connecter / Se déconnecter** : connexion par email + mot de passe ; déconnexion depuis le menu ou la page profil.
- **Mot de passe oublié** : lien « Réinitialiser le mot de passe » sur la page de connexion ; envoi d'un email avec lien sécurisé pour définir un nouveau mot de passe.
- **Avec un compte** : la liste « Mes soirées » (créées ou auxquelles j'ai participé) est persistante et synchronisée sur tous les appareils ; l'hôte peut être reconnu via son compte en plus du lien avec token ; possibilité de pré-remplir le pseudo avec le pseudo du compte quand on rejoint une soirée.
- **Sans compte** : usage inchangé (lien de partage, pseudo par soirée, token pour l'hôte) ; les soirées sont associées au navigateur / session jusqu'à déconnexion ou expiration.

**Tech**
- **Hash mots de passe** : bcrypt / Argon2 (ou équivalent), jamais en clair.
- **Session** : cookie sécurisé (`HttpOnly`, `SameSite`, durée raisonnable).
- **Routes auth** : inscription, connexion, déconnexion ; **rate limit dédié** sur le login.
- **Reset mot de passe** : transport email transactionnel, lien sécurisé à TTL court, invalidation après usage.
- **Suppression / export (RGPD)** : endpoints dédiés pour purge des données personnelles (email, pseudo) ; politique de conservation des soirées créées (anonymisation possible).

---

## 3. Rôle « hôte » et configuration de la soirée

- **Rôle « hôte »** : seul le créateur de la soirée est l'hôte (identifié par un token dans l'URL, un cookie de session, ou son compte s'il est connecté) ; lui seul peut lancer la roue, clôturer l'événement et **configurer la soirée**.
- **Configuration par l'hôte** : l'hôte peut paramétrer sa soirée comme il le souhaite, avant ou pendant l'événement (selon les options) :
  - **Thème de la soirée** : tag ou catégorie (ex. « Horreur », « Comédie », « SF », « Noël ») pour l'ambiance ; affichage d'un bandeau ou d'une couleur selon le thème.
  - **Expiration du lien** : date de fin de validité (date de la soirée, ou X jours après création).
  - **Limite de propositions** : nombre max de films par participant (ex. 1, 3, 5 ou illimité).
  - **Plage de votes** : votes ouverts jusqu'à une heure avant la soirée, ou jusqu'au lancement de la roue (configurable).
  - **Roue** : mode « aléatoire strict » ou « pondéré » (plus de chance pour les mieux notés).
  - **Séries OK / pas OK** : toggle « Accepter les séries » ; si désactivé, seuls les films sont acceptés (type film/série fourni par l'API TMDB/OMDB) ; affichage du type (film ou série) sur chaque proposition.
  - **Limite de participants** : nombre max de participants (optionnel, ex. 10 ou illimité) ; au-delà, message « Soirée complète » ou refus d'inscription.
- **Page « Paramètres » ou « Config »** : accessible uniquement à l'hôte depuis la page de la soirée.

**Tech**
- **Identification de l’hôte** : cohérence des trois canaux (token URL `?host=...`, cookie de session, compte connecté) côté API ; un seul autorise les actions sensibles (lancer la roue, PATCH config, clôturer).
- **Endpoints PATCH config** + validation API ; modèle extensible pour V1.1 (limite participants, plage votes) sans refacto.

---

## 4. Participation

- **Rejoindre un événement** : en cliquant sur le lien, sans compte obligatoire. Si l'utilisateur a un compte et est connecté, son pseudo par défaut peut être proposé (modifiable).
- **Pseudo par soirée** : en rejoignant (ou en ouvrant la soirée), chaque participant choisit un **pseudo** affiché à côté de ses propositions et votes pour cette soirée uniquement.
- **Voir les détails de la soirée** : titre, date, **lieu** (si renseigné), thème, liste des films proposés, votes, marqueurs « déjà vu », bouton « Lancer la roue » (visible uniquement pour l'hôte).
- **Compte à rebours** : affichage « Dans X jours » ou « Dans X heures » jusqu'à la date/heure de la soirée (et éventuellement « C'est ce soir » / « En cours »).
- **Rappels / notifications** : alerter avant la soirée (ex. « dans 1 h »). Les canaux possibles vont du **léger** (bannière **in-app** tant que l’utilisateur a la soirée ouverte) au **calendrier** (fichier .ics avec rappel géré par l’OS) jusqu’au **push navigateur** ou **e-mail**, qui supposent **consentement**, infra et en général **compte / e-mail**. Fiabilité : date, heure et **fuseau** (ou convention explicite) de l’événement.
- **Lien « Ajouter au calendrier »** : bouton qui génère un fichier .ics (ou lien Google Calendar / Outlook) pour ajouter la soirée à son agenda (titre, date, heure, lieu).
- **Mise à jour en direct** : les nouvelles propositions, votes et marqueurs « déjà vu » s'affichent sans recharger la page (WebSocket ou polling) ; idem pour le résultat de la roue quand l'hôte la lance.

**Tech**
- **Rate limiting** join (par IP/minute) pour éviter le spam.
- **Couche live** isolée côté front : polling en MVP, prête à passer en SSE / WebSocket sans toucher aux composants consommateurs.
- **Calendrier .ics (V1.1)** : génération côté API ou edge ; stockage en UTC, affichage local.
- **Push web / e-mail (backlog)** : file d’envoi (queue), jobs planifiés, transport push web (VAPID) et e-mail transactionnel ; **consentement** stocké par utilisateur.

---

## 5. Films

- **Proposer un film** : titre (recherche ou saisie) → **infos film automatiques** (poster, année, résumé, **note moyenne**, **bande-annonce**) via API (TMDB / OMDB).
- **Note moyenne** : note du film (ex. TMDB / IMDb) affichée sur chaque proposition (étoiles ou score sur 10) pour aider au vote.
- **Bande-annonce** : lien vers la bande-annonce (YouTube ou autre) récupéré via l'API quand disponible ; affiché sur la fiche du film (miniature cliquable ou bouton « Voir la bande-annonce »). Si non disponible, rien n'est affiché.
- **Qui a proposé** : pour chaque film, affichage du **pseudo** du participant qui l'a proposé ; badge « C'est moi » sur ses propres propositions.
- **Doublons** : détection des films déjà proposés (même titre ou même ID TMDB) ; message « Déjà proposé » et blocage ou avertissement si quelqu'un tente d'ajouter un doublon.
- **Disponibilité streaming / VOD légale** : pastilles ou liens via TMDB *watch providers* (région ex. FR) sur la recherche ou la fiche film ; mention que l’info est indicative.
- **Déjà vu par d’autres participants** : lors de l’ajout d’un film, indication si des participants de la soirée l’ont déjà marqué comme vu (marqueur « déjà vu » serveur, neutre pour la roue).
- **Liste des films proposés** : affichage avec poster, titre, année, type (film ou série si « Séries OK » activé), note moyenne, bande-annonce, qui a proposé (pseudo), score (up/down), marqueur « déjà vu » (compteur + pseudos).
- **Upvote / Downvote** : chaque participant peut voter une fois par film (selon la config de l'hôte). Ce score alimente la pondération de la roue.
- **Déjà vu** (neutre pour la roue) : chaque participant peut **marquer / démarquer** un film comme « déjà vu », indépendamment de son vote up/down. Un compteur et la liste des pseudos sont affichés ; ce marqueur **n'influence pas** la pondération de la roue.
- **Retirer sa proposition** (par celui qui a proposé, tant que la roue n'a pas été lancée).

**Tech**
- **Clé API films (TMDB/OMDB)** côté **serveur uniquement** (pas d’exposition au client).
- **Cache des posters** : bucket (ou BDD) avec TTL, remplissage au premier hit, pour limiter les appels et accélérer l’affichage des films déjà vus.
- **Watch providers TMDB** : endpoint API qui agrège la disponibilité par région (FR par défaut), cache court (par film, par région) ; texte indicatif côté UI.
- **Doublons** : détection par **id API** (TMDB) en priorité, fallback titre normalisé.
- **Agrégat « déjà vu »** (`seenMarks`) côté API : compteur + liste de pseudos par film de la soirée, neutre pour la roue.
- **Deep links streaming (backlog)** : table de mapping schemes natifs par provider et plateforme, fallback web automatique en cas d’échec du scheme.

---

## 6. Roue

- **Lancer la roue** (réservé à l'hôte) : prise en compte des films (filtrés selon la config : ex. score > 0 ou top N).
- **Animation** : roue qui tourne et s'arrête sur un film gagnant.
- **Résultat** : affichage du film choisi ; l'hôte peut relancer (sans le gagnant) ou clôturer la soirée.
- **Cas particuliers** : si aucun film n'est proposé, message « Aucun film pour l'instant » et la roue ne peut pas être lancée ; si un seul film, affichage direct comme gagnant (sans animation) ou tirage quand même au choix.

**Tech**
- **Tirage côté serveur** : atomique, idempotent (un seul résultat persisté par lancement) ; pondération pilotée par la config soirée (mode aléatoire strict vs pondéré).
- **Blocage post-clôture** : aucune mutation acceptée sur les films / votes après la clôture ; lecture seule garantie côté API.

---

## 7. Sécurité et durée de vie

- **Expiration du lien** : configurée par l'hôte ; après expiration, lecture seule ou message « Soirée terminée ».

**Tech**
- **HTTPS** systématique (front + API).
- **CORS** piloté par variable `ALLOWED_ORIGINS` (pas de `*` en prod).
- **Rate limiting** par IP sur les endpoints sensibles (création soirée, join, recherche films, login, mutations).
- **Secrets** via **GCP Secret Manager** (pas de valeurs en clair en prod).
- **En-têtes de sécurité** : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc.

---

## 8. Interface et confort

- **Favicon et onglet** : **icône du site** (favicon) visible dans l’onglet du navigateur et les favoris, plutôt que l’icône générique ; **titre de page** (`document.title`) cohérent par route (accueil, soirée, etc.).
- **Internationalisation (i18n)** : plusieurs **langues d’interface** ; formats date/nombre selon la locale ; alignement des métadonnées **TMDB** sur la langue choisie quand c’est pertinent. **Planification** : éviter les chaînes en dur dans le nouveau code (clés / fichiers de traduction) pour limiter le coût d’ajout d’une langue ; livraison d’une **deuxième langue** (ex. anglais) peut suivre une fois les libellés du MVP stabilisés.
- **Mode sombre / clair** : toggle dans l'interface (préférence stockée en local, ou sur le compte si connecté).
- **Vue grille / liste** : bascule entre affichage en **grille** (posters, cartes) et en **liste** (texte compact, moins d'images) pour la liste des films de la soirée.
- **Mode hors-ligne léger** : mise en cache de la dernière vue de la soirée (données + assets) ; affichage basique possible sans réseau (lecture seule, avec indication « Données en cache »). En mode hors-ligne, pas de mise à jour en direct ; les données affichées sont celles du dernier chargement.
- **Usage principal sur mobile** : le site est pensé d'abord pour le **téléphone** ; voir section UX/UI – Mobile first ci-dessous.

**Tech**
- **Identité navigateur** : favicon (dossier `public/` ou assets Vite), `document.title` cohérent par route — base SEO et partage basique.
- **i18n technique** : convention **clés / fichiers de traduction** dès l’écriture du code V1 ; pas de chaînes en dur sur les nouveaux écrans ; hook / lib unifiée côté front, gestion locale (date/nombre) selon la locale active ; métadonnées **TMDB** alignées sur la langue choisie quand pertinent.
- **Mode sombre** : tokens CSS / variables ; persistance préférence locale ou compte.
- **Mode hors-ligne léger (V1.1)** : Service Worker minimal ou IndexedDB ; bandeau « Données en cache » ; pas de mutation hors-ligne.
- **Vue grille / liste** : composants découplés pour basculer le rendu sans refetch.

---

## 9. UX/UI – Mobile first (usage principal sur téléphone)

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

**Tech**
- **Breakpoints** définis d'abord pour mobile (≈ 375 px), puis adaptations tablette / desktop.
- **Performance front** : images optimisées, **lazy load**, placeholders posters ; pas de dépendance au survol (hover) pour les infos importantes.
- **Lighthouse** sur build : budgets perf / accessibilité / SEO en CI (non bloquant si retenu).

---

## 10. Cas limites et messages utilisateur

- **Lien invalide ou soirée supprimée** : page 404 ou message clair « Cette soirée n'existe pas ou a été supprimée » avec lien vers l'accueil.
- **Soirée terminée / expirée** : message « Soirée terminée » ou « Cette soirée est terminée » ; affichage en lecture seule (film gagnant, liste des films).
- **Soirée complète** : si limite de participants atteinte, message « Soirée complète » ou « Le nombre max de participants est atteint » à l'ouverture du lien.
- **API films indisponible** : lors de la recherche de film, message « Service temporairement indisponible » ; possibilité de saisir le titre à la main sans infos auto (poster, note, bande-annonce optionnels).
- **Roue** : aucun film ou un seul film (voir section Roue).
- **Validation des données** : champs obligatoires (titre de la soirée, date, heure) ; format email à l'inscription ; mot de passe avec contraintes minimales (longueur, etc.) ; pseudo non vide par soirée.

**Tech**
- **Erreurs JSON homogènes** côté API (format unique : code, message, correlation ID).
- **Error boundary** global côté front (pas d’écran blanc en cas d’exception non capturée).
- **UX chargement** : indicateurs explicites + action **« Réessayer »** sur les vues serveur (pas de liste vide silencieuse).

---

## 11. À considérer (optionnel)

- **Suppression du compte** : depuis la page profil, option « Supprimer mon compte » avec confirmation ; suppression des données personnelles (email, pseudo), les soirées créées peuvent être conservées en anonyme ou supprimées selon le choix.
- **Pages d'erreur** : 404 (soirée ou page inexistante), 500 (erreur serveur) avec message clair et lien vers l'accueil.
- **Crédits / attribution API** : les APIs TMDB et OMDB imposent souvent une attribution (ex. « Données fournies par TMDB ») ; prévoir un lien ou une mention en bas de page ou sur les fiches films.
- **Cookies et confidentialité** : si des cookies (session, préférences) sont utilisés, prévoir une mention dans les mentions légales ou un bandeau d'information ; cookies strictement nécessaires au fonctionnement peuvent être exemptés de consentement selon la réglementation.

**Tech**
- **Accessibilité étendue** : audit global (axe + manuel), navigation au clavier, labels systématiques pour les lecteurs d’écran, contraste validé en mode sombre **et** clair, focus visible cohérent ; tests automatisés en CI sur pages clés.
- **CMP (bandeau de consentement)** : implémentation opérationnelle (choix granulaire, persistance, lien « Modifier mes préférences ») ; conditionne le **chargement effectif** de l’analytics et de tout SDK non strictement nécessaire (Sentry, etc., à arbitrer selon base légale).

---

## 12. Plateforme transverse (sans pendant produit direct)

Briques techniques qui ne sont pas rattachées à un domaine métier : socle d’ingénierie, qualité, exploitation. Le découpage par version est dans [roadmap-tech.md](roadmap-tech.md).

### Stack & architecture
- **Front** : React + Vite + TypeScript strict + TanStack Query — `apps/web/`.
- **API** : ASP.NET Core (.NET 10), MongoDB, TMDB — `apps/api-dotnet/` (solution `MoviePicker.slnx`, projet principal `MoviePicker.Api/`).
- **Repo** : pnpm + Turborepo à la racine ; configs partagés sous `configs/` si présents.
- **Préfixe API** : routes publiques sous **`/api/v1`** ; le client front utilise `VITE_API_URL` (voir `apps/web/.env.example`).

### CI/CD & infra / déploiement
- **GitHub Actions** : lint, tests, build, image Docker API, déploiement.
- **API** : image Docker → **GCP Cloud Run** ; secrets via **GCP Secret Manager** ; **Artifact Registry** pour les images.
- **Front** : statique → **AWS S3** + **CloudFront** (SPA, fallback `index.html`).
- **Variables et secrets** documentés via les fichiers `.env.example` et la config CI/CD.
- **Vérification locale** : **`pnpm run verify:local`** à la racine après `pnpm install`.

### Qualité code
- **Front** : ESLint + Prettier ; `pnpm audit` en CI.
- **API .NET** : `dotnet format` + analyzers ; warnings traités comme erreurs sur les nouveaux projets.
- **Conventions communes** : pas de chaînes en dur dans le nouveau code (préparation i18n) ; pas de secret en repo (cf. `mp-guardrails`).

### Tests
- **API .NET** : unitaires + intégration + **contrat OpenAPI** (`OpenApiContractTests`) ; couverture **Coverlet** en CI.
- **Front** : **Vitest** + Testing Library + couverture ; **axe** sur pages clés (accessibilité automatisée).
- **E2E** : **Playwright** en local (hors CI ou non bloquant).

### API .NET — conventions
- Préfixe **`/api/v1`**.
- **Swagger** en dev + **export OpenAPI** en CI (artefact, base du contrat front).
- **Validation config** au démarrage en prod (fail-fast si variables manquantes).
- **Logging structuré**, **correlation ID**, **erreurs JSON** homogènes.

### Front — solidité
- **TanStack Query** (ou équivalent) pour les données serveur (cache, retries, invalidations).
- **Error boundary** global.
- Couche **« live »** isolée (polling MVP → SSE/WebSocket V1+) pour ne pas re-câbler les composants.

### Données
- **MongoDB** (collections `events`, `participants`, `movies`, `votes`, à V1 `users`, `seenMarks`).
- **Indexes** alignés sur les patterns d’accès (lecture soirée par slug, votes par film, etc.).

### Observabilité & monitoring
- **Logs** structurés côté API (Cloud Logging), corrélation par requête.
- **Métriques** minimales Cloud Run / CloudFront (latence, erreurs, RPS).
- **Monitoring applicatif** (Sentry ou équivalent, backlog) : exceptions front + back, sampling, contexte release/env — voir [roadmap-tech.md](roadmap-tech.md) § Backlog.
