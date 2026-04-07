# Movie Picker – Roadmap V1 (carte de suivi)

Suite de tâches pour livrer la **V1 produit** après le MVP et la migration API .NET.  
Références : [01-spec-technique.md](../01-spec-technique.md), [03-features-list.md](../03-features-list.md) (§ *V1 – Features*), [02-architecture-api-dotnet.md](../02-architecture-api-dotnet.md).

Tutoriel **actions humaines** (GCP, GitHub, `.env`) : [02-deploiement-secrets-et-ci-v1.md](02-deploiement-secrets-et-ci-v1.md).  
**Règle** : ne cocher une case que quand la tâche est **terminée** (y compris ce que l’humain doit faire sur les cloud). Un doc tutoriel seul ne suffit pas.

Cocher au fur et à mesure. Une autre IA ou un humain peut reprendre en suivant l’ordre des sections.

**Ordre logique** : cadrage (§ 1) → modèle de données (§ 2) → API auth puis « mes soirées » / hôte compte (§ 3–4) → config hôte avant réactions (§ 5–6) → enrichissement films & posters côté API (§ 7–8) → shell, auth et pages front (§ 9–14) → live, rappels (§ 15–16) → OG / i18n transverses (§ 17–18) → qualité, déploiement, recette (§ 19–21).

> **Hors périmètre V1** (cf. features list) : mot de passe oublié par e-mail (**V2**), lieu / description soirée avancée, .ics / compte à rebours dédié (**V2**), vue grille-liste / hors-ligne (**V2**), **limite de participants** et **plage de votes** configurables (**V2**).

---

## 1. Prérequis et cadrage

> **Base** : parcours MVP opérationnel (front + API .NET + MongoDB + déploiement). Voir [mvp/01-roadmap-mvp.md](../mvp/01-roadmap-mvp.md) § 16–17.

- [x] Valider le **choix auth** (sessions cookie serveur vs JWT stateless, durée de session) et le documenter dans [02-architecture-api-dotnet.md](../02-architecture-api-dotnet.md)
- [x] Prévoir **secrets** : clé de signature / cookie (Data Protection) dans **GCP Secret Manager** + Cloud Run — [02-deploiement-secrets-et-ci-v1.md](02-deploiement-secrets-et-ci-v1.md)
- [x] Lister les **nouveaux endpoints** et impacts **OpenAPI** / `OpenApiContractTests` avant implémentation massive

---

## 2. Données – Utilisateurs et lien avec les soirées

- [x] Créer la collection / modèle **`users`** (email unique, hash mot de passe, pseudo par défaut, dates création / MAJ)
- [x] Étendre **`events`** : `creatorUserId` (ou équivalent) optionnel, tout en conservant la compatibilité **hôte par token** pour les utilisateurs sans compte
- [x] Étendre **`participants`** : `userId` optionnel (liaison compte ↔ participation à une soirée)
- [x] Champs **préférences compte** (si retenu) : ex. **thème UI** clair / sombre / système — pour la persistance « locale ou compte » ([03-features-list.md](../03-features-list.md) § V1 *Interface*)
- [x] Index MongoDB pertinents (email, `creatorUserId`, `userId` + event) et règles de cohérence (un user ne double pas la même soirée sans intention produit)

---

## 3. API – Inscription, connexion, déconnexion

- [x] **POST** inscription : email, mot de passe, pseudo par défaut — validation (email, complexité mot de passe), réponse sans fuite d’infos inutiles
- [x] **POST** connexion : émission session / token selon le choix § 1
- [x] **POST** déconnexion : invalidation côté serveur si sessions stockées, ou stratégie documentée si JWT
- [x] **GET** profil minimal (pseudo, email masqué si besoin) pour le front ; **PATCH** profil si besoin (ex. pseudo par défaut, **préférence thème** — aligné § 2)
- [x] **Rate limiting** sur routes auth (compléter la politique MVP) — anti brute-force
- [x] Mettre à jour **Swagger** (`ProducesResponseType`) et **tests** unitaires / intégration sur ces routes

> **Hors V1** : réinitialisation mot de passe par e-mail → **V2** ([03-features-list.md](../03-features-list.md)).

---

## 4. API – « Mes soirées » et reconnaissance hôte par compte

- [x] **POST** création d’événement : si **Authorization** / session valide, renseigner **`creatorUserId`** (sans casser la création anonyme MVP)
- [x] **POST** rejoindre : si utilisateur connecté, renseigner **`participants.userId`** (pseudo soirée toujours requis ou prérempli — règle produit)
- [x] **GET** liste des soirées pour l’utilisateur connecté : créées **et** auxquelles il a participé (pagination ou limite raisonnable)
- [x] Lors du **détail event** : si `creatorUserId` correspond au user connecté, traiter comme **hôte** (en plus du `hostToken` / cookie existant)
- [x] Documenter la **précédence** token hôte vs compte (cas : utilisateur connecté mais pas le créateur, lien avec `?host=` d’un autre — règle métier claire)

---

## 5. API – Configuration de la soirée (hôte)

- [x] Définir / figer le schéma **`events.config`** (JSON) : **thème / tag** d’ambiance (affichage côté front : bandeau ou couleur — § 12), expiration du lien (si distincte de la logique MVP actuelle), **limite de propositions** par participant, **mode roue** (aléatoire strict vs pondéré), **ensemble des réactions autorisées** (liste ids ou clés)
- [x] **GET** config (lecture) : accessible selon règles produit (hôte + participants pour transparence, ou hôte seul pour certains champs — à trancher)
- [x] **PATCH** ou **PUT** config : **réservé hôte** ; validation des valeurs ; refus si soirée terminée / roue déjà lancée selon règles choisies
- [x] Adapter la **logique métier** existante : ajout de film, votes, lancement roue pour respecter **limites** et **mode roue**
- [x] Tests ciblés (unitaires + intégration) sur les garde-fous config

---

## 6. API – Réactions

- [x] Modèle **`reactions`** (ou embed selon choix d’archi) : event, film, participant, type de réaction, contrainte **une ou plusieurs par film** selon spec / config hôte
- [x] **POST** / **DELETE** (ou toggle) réaction — respect de la liste **autorisée** par l’hôte
- [x] **GET** agrégats par film (compteurs, éventuellement pseudos) pour alimenter le front
- [x] **Indicateur « déjà vu » (autres participants)** : exploiter les réactions (ou agrégat dédié) pour exposer un booléen / compteur lors de l’**ajout** ou sur la fiche film — comme décrit en [03-features-list.md](../03-features-list.md) *(compteur `already_seen` + pseudos dans `reactions[]` sur liste films / GET agrégats ; le front peut déduire « autres » par rapport au participant courant)*

---

## 7. API – Films enrichis (TMDB)

- [x] **Watch providers** (région ex. **FR**) : enrichir recherche ou détail film avec pastilles / liens ; **cache** ou TTL pour limiter les appels TMDB
- [x] Champs additionnels si déjà partiellement là : **note moyenne** TMDB sur la carte (si pas déjà satisfaisant côté MVP)
- [x] Mention **indicative** pour l’utilisateur (copy UI + doc) — conformité / attribution TMDB ([03-features-list.md](../03-features-list.md) backlog crédits si besoin)
- [x] **Front** : afficher **pastilles ou liens** watch providers sur la **recherche** et/ou la **carte film** (données § 7), avec le même ton « indicatif »

---

## 8. API – Cache des posters

- [ ] Stratégie : **bucket** (S3 ou GCS) ou **stockage Mongo** (références URL) — choix documenté
- [ ] À l’**ajout** ou au premier affichage : récupération, stockage, URL servie par l’API ou CDN
- [ ] Politique d’**expiration** / taille / types MIME ; pas d’exposition de la clé TMDB côté client

---

## 9. Front – Navigation et shell V1

- [ ] Ajouter les entrées **Compte** / **Connexion** / **Inscription** et **Mes soirées** (menu ou barre basse, **mobile-first** — [03-features-list.md](../03-features-list.md) UX)
- [ ] Routes protégées : redirection vers connexion si action réservée au compte
- [ ] Conserver le parcours **sans compte** (lien + pseudo) inchangé pour les invités

---

## 10. Front – Auth (pages et états)

- [ ] Pages **Inscription** et **Connexion** (formulaires accessibles, messages d’erreur API via `ApiError` / convention existante)
- [ ] **Déconnexion** depuis le menu / profil
- [ ] Persistance session (cookie httpOnly gérée par le navigateur ou stockage token selon choix API) — cohérent avec le client `fetchApi`
- [ ] **Pré-remplissage pseudo** à la jointure d’une soirée si connecté (pseudo compte modifiable)
- [ ] **Thème clair / sombre** : le MVP a déjà un mode sombre — en V1, **persister la préférence** « local **ou** compte » ([03-features-list.md](../03-features-list.md)) : lecture au chargement, sauvegarde sur le profil si connecté (API § 3 / modèle § 2)

---

## 11. Front – Mes soirées

- [ ] Page liste : soirées **créées** et **rejointes**, états visuels (à venir, en cours, terminée)
- [ ] Liens vers `/s/:slug` ; rappel du rôle hôte si applicable

---

## 12. Front – Paramètres hôte (config soirée)

- [ ] Page ou panneau **Paramètres** accessible **uniquement** à l’hôte depuis le détail soirée
- [ ] Formulaires : thème, expiration, limite propositions, mode roue, **sélection des réactions** disponibles
- [ ] **Reflet visuel pour tous** : bandeau, couleur d’accent ou libellé du **thème de soirée** sur la page détail (lecture **GET** config ou champs déjà dans le détail event)
- [ ] Sauvegarde via API § 5 ; feedback succès / erreur ; désactivation si soirée non modifiable

---

## 13. Front – Réactions et affichage « déjà vu »

- [ ] UI réactions sur chaque film (icônes / compteurs) selon config
- [ ] Affichage **« déjà vu par d’autres »** à l’ajout ou sur la carte (données § 6)
- [ ] États loading / erreur alignés sur TanStack Query + couche live existante

---

## 14. Front – Partage : QR code

- [ ] Génération **QR code** pointant vers l’URL de la soirée (librairie légère, test mobile)
- [ ] Visible pour **hôte et participants** (cf. spec) — emplacement UI sans encombrer le mobile

---

## 15. Front – Mise à jour « live »

- [ ] Remplacer ou compléter le **polling** actuel par **SSE** ou **WebSocket** si la charge / UX le justifie ; sinon **affiner** l’intervalle et l’invalidation React Query
- [ ] Synchroniser **réactions**, **votes**, **films**, **résultat roue** sans rechargement manuel
- [ ] Isoler dans la couche **`useEventLive`** (ou équivalent) pour limiter les régressions

---

## 16. Front – Rappels légers in-app

- [ ] Bannière ou message lorsque l’heure de début est proche (**utilisateur sur la page soirée** — pas de push / e-mail en V1)
- [ ] Gestion fuseau / affichage cohérent avec date-heure stockée

---

## 17. Open Graph / Twitter Cards dynamiques

> **Contrainte** : une SPA seule sert souvent les mêmes meta — pour un aperçu **riche par URL**, prévoir HTML ou meta **par route** (SSR, prerender, **fonction edge**, sous-domaine dédié, etc.). Voir [mvp/07-redirection-racine-et-referencement.md](../mvp/07-redirection-racine-et-referencement.md).

- [ ] Choisir l’**approche infra** (CloudFront Function, Lambda@Edge, petite page serveur, autre) et la documenter **dans ce dossier** (ex. section § 6 de [02-deploiement-secrets-et-ci-v1.md](02-deploiement-secrets-et-ci-v1.md) ou nouveau fichier `03-…` ici). Contexte SEO / redirection : lecture seule [mvp/07-redirection-racine-et-referencement.md](../mvp/07-redirection-racine-et-referencement.md)
- [ ] Endpoint ou page **résumé événement** lisible par les crawlers (titre, description courte, image marque ou visuel fixe)
- [ ] **Option confidentialité** (hôte) : autoriser ou non des indicateurs sensibles (ex. nombre de participants) dans l’aperçu — **défaut prudent** pour soirée « privée par lien »
- [ ] Si l’infra dynamique n’est pas prête : **rester sur OG statiques** et tracer la limitation (pas de régression SEO racine)

---

## 18. Préparation i18n

- [ ] Convention : **pas de chaînes en dur** sur les **nouveaux** écrans V1 (clés + fichier de traduction ou hook préparatoire)
- [ ] Langue UI **FR** livrée ; **deuxième langue** reportée en **V2** ([03-features-list.md](../03-features-list.md))

---

## 19. Tests, contrat et qualité

- [ ] **Tests .NET** : nouveaux handlers (auth, config, réactions, agrégats watch providers / cache posters si testables)
- [ ] **Tests intégration** : parcours connexion → création soirée liée au compte → config → réaction
- [ ] **OpenAPI** : schémas à jour ; **export CI** et `OpenApiContractTests`
- [ ] **Front** : Vitest / RTL sur pages auth, mes soirées, paramètres hôte, composants réactions / QR / **watch providers** / **thème soirée** / **préférence thème UI**
- [ ] **`pnpm run verify:local`** avant merge majeur V1

---

## 20. Déploiement et observabilité

- [ ] Variables d’environnement et secrets (auth, bucket posters si applicable) documentés dans [02-deploiement-secrets-et-ci-v1.md](02-deploiement-secrets-et-ci-v1.md) (§ 3–5)
- [ ] **CORS** / `ALLOWED_ORIGINS` si nouvelles origines (ex. sous-domaine OG)
- [ ] **Cookies / sessions** (si cookie auth) : attributs **Secure**, **HttpOnly**, **SameSite** ; politique **CSRF** si cookie en cross-site — documenter dans [02-architecture-api-dotnet.md](../02-architecture-api-dotnet.md)
- [ ] **Rate limiting** : revoir les plafonds pour les **nouveaux endpoints** (auth, config, réactions, TMDB enrichie) — prolongement note « technique » [03-features-list.md](../03-features-list.md) § V1
- [ ] Logs structurés : corrélation sur les routes auth et config (prolongement MVP § 29)

---

## 21. V1 terminée

- [ ] Parcours **compte** : inscription → connexion → créer / rejoindre → **Mes soirées**
- [ ] Parcours **hôte** : config (thème, limites, roue, réactions) → invités avec réactions / **bandeau ou style thème soirée** / watch providers / affichage posters (cache si activé)
- [ ] **QR code** + **rappel in-app** validés sur mobile
- [ ] **OG dynamiques** : livrés **ou** explicitement reportés avec doc de la limite
- [ ] Mettre à jour [03-features-list.md](../03-features-list.md) et le tableau des versions dans [00-roadmaps-par-version.md](../00-roadmaps-par-version.md) si besoin

---

## Après coup (souvent non prévu au départ)

- [ ] Refactor / dette : simplifier `EventDetail` si la complexité a cru malgré le découpage MVP
- [ ] Ajustements **rate limiting** après mesure trafic auth / TMDB
- [ ] Petites features opportunistes : copy UX, accessibilité ciblée, crédits TMDB visibles

---

## Références rapides

| Sujet | Document |
|--------|-----------|
| MVP & post-MVP technique | [mvp/01-roadmap-mvp.md](../mvp/01-roadmap-mvp.md) |
| CI / déploiement **base MVP** (lecture) | [mvp/04-deploy-cicd.md](../mvp/04-deploy-cicd.md) |
| **Secrets, CI et runtime — V1** (procédures) | [02-deploiement-secrets-et-ci-v1.md](02-deploiement-secrets-et-ci-v1.md) |
| API .NET, couches | [02-architecture-api-dotnet.md](../02-architecture-api-dotnet.md) |
| Périmètre fonctionnel V1 | [03-features-list.md](../03-features-list.md) § *V1 – Features* |
| Index versions | [00-roadmaps-par-version.md](../00-roadmaps-par-version.md) |
