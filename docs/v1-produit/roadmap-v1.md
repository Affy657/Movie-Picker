# Movie Picker – Roadmap V1 (carte de suivi)

Suite de tâches pour livrer la **V1 produit** après le MVP et la migration API .NET.

**Règle** : ne cocher une case que quand la tâche est **terminée** (y compris ce que l’humain doit faire sur les cloud). Un doc tutoriel seul ne suffit pas.

Cocher au fur et à mesure. Une autre IA ou un humain peut reprendre en suivant l’ordre des sections.

**Ordre logique** : cadrage (§ 1) → modèle de données (§ 2) → API auth puis « mes soirées » / hôte compte (§ 3–4) → config hôte avant marqueur « déjà vu » (§ 5–6) → enrichissement films & posters côté API (§ 7–8) → shell, auth et pages front (§ 9–14) → live, rappels (§ 15–16) → **§ 16 bis — parcours créateur & watch providers** → OG (§ 17) → **utilisateurs de test / seed local (§ 18)** → i18n (§ 19) → qualité, déploiement, recette (§ 20–22) → sécurité CI : Sonar (§ 23), NuGet (§ 24), image Docker (§ 25), secrets (§ 26).

> **Hors périmètre V1** (cf. features list du dépôt) : mot de passe oublié par e-mail (**V2**), lieu / description soirée avancée, .ics / compte à rebours dédié (**V2**), vue grille-liste / hors-ligne (**V2**), **limite de participants** et **plage de votes** configurables (**V2**).

---

## 1. Prérequis et cadrage

> **Base** : parcours MVP opérationnel (front + API .NET + MongoDB + déploiement), y compris fin de carte MVP / migration .NET (§ 16–17 de la carte MVP du dépôt).

- [x] Valider le **choix auth** (sessions cookie serveur vs JWT stateless, durée de session) et le documenter (code, README ou doc technique du dépôt)
- [x] Prévoir **secrets** : clé de signature / cookie (Data Protection) dans **GCP Secret Manager** + Cloud Run (procédures équipe / console cloud)
- [x] Lister les **nouveaux endpoints** et impacts **OpenAPI** / `OpenApiContractTests` avant implémentation massive

---

## 2. Données – Utilisateurs et lien avec les soirées

- [x] Créer la collection / modèle **`users`** (email unique, hash mot de passe, pseudo par défaut, dates création / MAJ)
- [x] Étendre **`events`** : `creatorUserId` (ou équivalent) optionnel, tout en conservant la compatibilité **hôte par token** pour les utilisateurs sans compte
- [x] Étendre **`participants`** : `userId` optionnel (liaison compte ↔ participation à une soirée)
- [x] Champs **préférences compte** (si retenu) : ex. **thème UI** clair / sombre / système — pour la persistance « locale ou compte » (features list § V1 *Interface*)
- [x] Index MongoDB pertinents (email, `creatorUserId`, `userId` + event) et règles de cohérence (un user ne double pas la même soirée sans intention produit)

---

## 3. API – Inscription, connexion, déconnexion

- [x] **POST** inscription : email, mot de passe, pseudo par défaut — validation (email, complexité mot de passe), réponse sans fuite d’infos inutiles
- [x] **POST** connexion : émission session / token selon le choix § 1
- [x] **POST** déconnexion : invalidation côté serveur si sessions stockées, ou stratégie documentée si JWT
- [x] **GET** profil minimal (pseudo, email masqué si besoin) pour le front ; **PATCH** profil si besoin (ex. pseudo par défaut, **préférence thème** — aligné § 2)
- [x] **Rate limiting** sur routes auth (compléter la politique MVP) — anti brute-force
- [x] Mettre à jour **Swagger** (`ProducesResponseType`) et **tests** unitaires / intégration sur ces routes

> **Hors V1** : réinitialisation mot de passe par e-mail → **V2** (features list).

---

## 4. API – « Mes soirées » et reconnaissance hôte par compte

- [x] **POST** création d’événement : si **Authorization** / session valide, renseigner **`creatorUserId`** (sans casser la création anonyme MVP)
- [x] **POST** rejoindre : si utilisateur connecté, renseigner **`participants.userId`** (pseudo soirée toujours requis ou prérempli — règle produit)
- [x] **GET** liste des soirées pour l’utilisateur connecté : créées **et** auxquelles il a participé (pagination ou limite raisonnable)
- [x] Lors du **détail event** : si `creatorUserId` correspond au user connecté, traiter comme **hôte** (en plus du `hostToken` / cookie existant)
- [x] Documenter la **précédence** token hôte vs compte (cas : utilisateur connecté mais pas le créateur, lien avec `?host=` d’un autre — règle métier claire)

---

## 5. API – Configuration de la soirée (hôte)

- [x] Définir / figer le schéma **`events.config`** (JSON) : **thème / tag** d’ambiance (affichage côté front : bandeau ou couleur — § 12), expiration du lien (si distincte de la logique MVP actuelle), **limite de propositions** par participant, **mode roue** (aléatoire strict vs pondéré). Le marqueur « déjà vu » est **toujours disponible** (pas de config hôte).
- [x] **GET** config (lecture) : accessible selon règles produit (hôte + participants pour transparence, ou hôte seul pour certains champs — à trancher)
- [x] **PATCH** ou **PUT** config : **réservé hôte** ; validation des valeurs ; refus si soirée terminée / roue déjà lancée selon règles choisies
- [x] Adapter la **logique métier** existante : ajout de film, votes, lancement roue pour respecter **limites** et **mode roue**
- [x] Tests ciblés (unitaires + intégration) sur les garde-fous config

---

## 6. API – Marqueur « déjà vu »

- [x] Modèle **`seenMarks`** : event, film, participant, horodatage ; contrainte **un marqueur unique** par (event, movie, participant) — indépendant du vote up/down
- [x] **POST** `/events/{slug}/movies/{movieId}/seen` (marquer) / **DELETE** (démarquer) — toujours disponible, pas de gating par config hôte
- [x] Agrégats par film (compteur `seenCount`, `seenByPseudos`) exposés dans la liste des films pour alimenter le front
- [x] **Indicateur « déjà vu » (autres participants)** : le front déduit « autres » à partir de `seenByPseudos` (vs participant courant). **Neutre pour la roue** : `WheelWinnerPicker` n’utilise que `Score` (up/down).

---

## 7. API – Films enrichis (TMDB)

- [x] **Watch providers** (région ex. **FR**) : enrichir recherche ou détail film avec pastilles / liens ; **cache** ou TTL pour limiter les appels TMDB
- [x] Champs additionnels si déjà partiellement là : **note moyenne** TMDB sur la carte (si pas déjà satisfaisant côté MVP)
- [x] Mention **indicative** pour l’utilisateur (copy UI + doc) — conformité / attribution TMDB (backlog crédits features list si besoin)
- [x] **Front** : afficher **pastilles ou liens** watch providers sur la **recherche** et/ou la **carte film** (données § 7), avec le même ton « indicatif »

---

## 8. API – Cache des posters

- [x] Stratégie : **bucket** (S3 ou GCS) ou **stockage Mongo** (références URL) — choix documenté
- [x] À l’**ajout** ou au premier affichage : récupération, stockage, URL servie par l’API ou CDN
- [x] Politique d’**expiration** / taille / types MIME ; pas d’exposition de la clé TMDB côté client

---

## 9. Front – Navigation et shell V1

- [x] Ajouter les entrées **Compte** / **Connexion** / **Inscription** et **Mes soirées** (menu ou barre basse, **mobile-first** — UX features list)
- [x] Routes protégées : redirection vers connexion si action réservée au compte
- [x] Conserver le parcours **sans compte** (lien + pseudo) inchangé pour les invités

---

## 10. Front – Auth (pages et états)

- [x] Pages **Inscription** et **Connexion** (formulaires accessibles, messages d’erreur API via `ApiError` / convention existante)
- [x] **Déconnexion** depuis le menu / profil
- [x] Persistance session (cookie httpOnly gérée par le navigateur ou stockage token selon choix API) — cohérent avec le client `fetchApi`
- [x] **Pré-remplissage pseudo** à la jointure d’une soirée si connecté (pseudo compte modifiable)
- [x] **Thème clair / sombre** : le MVP a déjà un mode sombre — en V1, **persister la préférence** « local **ou** compte » (features list) : lecture au chargement, sauvegarde sur le profil si connecté (API § 3 / modèle § 2)

---

## 11. Front – Mes soirées

- [x] Page liste : soirées **créées** et **rejointes**, états visuels (à venir, en cours, terminée)
- [x] Liens vers `/e/:slug` ; rappel du rôle hôte si applicable

---

## 12. Front – Paramètres hôte (config soirée)

- [x] Page ou panneau **Paramètres** accessible **uniquement** à l’hôte depuis le détail soirée
- [x] Formulaires : thème, expiration, limite propositions, mode roue
- [x] **Reflet visuel pour tous** : bandeau, couleur d’accent ou libellé du **thème de soirée** sur la page détail (lecture **GET** config ou champs déjà dans le détail event)
- [x] Sauvegarde via API § 5 ; feedback succès / erreur ; désactivation si soirée non modifiable

---

## 13. Front – Bouton « Déjà vu » et affichage agrégé

- [x] Bouton **Déjà vu** sur chaque carte film (toggle), à côté des boutons up/down ; compteur `seenCount`
- [x] Affichage **« déjà vu par d’autres »** à l’ajout ou sur la carte (à partir de `seenByPseudos`, § 6)
- [x] États loading / erreur alignés sur TanStack Query + couche live existante
- [x] **Neutre pour la pondération de la roue** — indiqué visuellement (libellé / tooltip), aucun impact sur le score

---

## 14. Front – Partage : QR code

- [x] Génération **QR code** pointant vers l’URL de la soirée (librairie légère, test mobile)
- [x] Visible pour **hôte et participants** (cf. spec) — emplacement UI sans encombrer le mobile

---

## 15. Front – Mise à jour « live »

- [x] Remplacer ou compléter le **polling** actuel par **SSE** ou **WebSocket** si la charge / UX le justifie ; sinon **affiner** l’intervalle et l’invalidation React Query — *mémo V1 : polling affiné par phase (à venir / en cours), pas de SSE sans endpoint API*
- [x] Synchroniser **marqueurs « déjà vu »**, **votes**, **films**, **résultat roue** sans rechargement manuel — *polling + invalidations après mutations ; roue : sync `winnerMovie` depuis le détail événement*
- [x] Isoler dans la couche **`useEventLive`** (ou équivalent) pour limiter les régressions

---

## 16. Front – Rappels légers in-app

- [x] Bannière ou message lorsque l’heure de début est proche (**utilisateur sur la page soirée** — pas de push / e-mail en V1) — *`EventStartReminderBanner` : fenêtre 30 min, minuteur léger*
- [x] Gestion fuseau / affichage cohérent avec date-heure stockée — *`utils/eventScheduled` : même instant UTC que l’API ; en-tête + rappel en heure locale navigateur*

---

## 16 bis. Parcours créateur (compte obligatoire) / lien hôte / fournisseurs streaming « abonnement »

> **But** : simplifier le produit pour la création de soirée (compte requis) et clarifier le partage ; n’afficher que les offres de visionnage *abonnement* (SVOD / flatrate TMDB), pas location ni achat.

- [x] **Création de soirée** : **compte obligatoire** ; après **POST** création réussie, l’utilisateur est **automatiquement participant** (pseudo = pseudo compte ou règle documentée) — pas d’écran « rejoindre » pour le créateur.
- [x] **API** : **POST** `/api/v1/events` réservé aux utilisateurs authentifiés (**401** sinon) ; réponse incluant **`creatorParticipant`** pour le front (session / stockage local).
- [x] **Lien « hôte » à partager** : ne plus afficher de lien « réservé hôte » dans l’UI ; `hostToken` **conservé en base** pour l’instant (roue / détail inchangés côté API si lien ancien) ; actions hôte via **session** quand `creatorUserId` correspond.
- [x] **Front** : route **Créer une soirée** protégée ; après création, redirection `/e/:slug` **sans** `?host=` ; stockage participant créateur ; QR / copie **uniquement** sur l’URL invité.
- [x] **Watch providers TMDB** : uniquement **`flatrate`** (abonnement), exclusion **`rent`** / **`buy`** côté API ; tests .NET ajustés.

---

## 17. Open Graph / Twitter Cards dynamiques

> **Contrainte** : une SPA seule sert souvent les mêmes meta — pour un aperçu **riche par URL**, prévoir HTML ou meta **par route** (SSR, prerender, **fonction edge**, sous-domaine dédié, etc.). SEO / redirection racine : traiter avec l’infra déployée (apex, CORS, Search Console).

- [x] Choisir l’**approche infra** (CloudFront Function, Lambda@Edge, petite page serveur, autre) et la consigner pour l’équipe (ex. fichier dans `docs/v1-produit/` ou README déploiement).
- [x] Endpoint ou page **résumé événement** lisible par les crawlers (titre, description courte, image marque ou visuel fixe)
- [x] **Option confidentialité** (hôte) : autoriser ou non des indicateurs sensibles (ex. nombre de participants) dans l’aperçu — **défaut prudent** pour soirée « privée par lien »
- [x] Si l’infra dynamique n’est pas prête : **rester sur OG statiques** et tracer la limitation (pas de régression SEO racine)

---

## 18. Utilisateurs de test et données de démo en local (seed Development)

> **But** : accélérer les tests manuels et les parcours V1 sans enchaîner inscription / création de soirées à la main. **Uniquement** en environnement **Development** ; jamais exécuté en Production.

- [x] **Seed au démarrage API** : compte principal configurable + **deux utilisateurs additionnels** (ex. Alice / Bob) via `appsettings.Development.json` / variables `DevelopmentSeed__*`
- [x] **Soirées d’exemple** pour le compte principal (titres préfixés) et **scénarios démo** idempotents : hôte + invités connectés, config d’événement (thème, limite propositions, mode roue, partage riche), films TMDB, votes, marqueurs « déjà vu », retrait de film, tirage roue + soirée clôturée avec gagnant
- [x] **Documentation** : README (identifiants et description des scénarios), `.env.example` ; tests d’intégration sans pollution (désactivation partielle du seed lourd dans `MoviePickerApplicationFactory`)

---

## 19. Préparation i18n

- [x] Convention : **pas de chaînes en dur** sur les **nouveaux** écrans V1 (clés + fichier de traduction ou hook préparatoire) — *`shared/i18n/` : locale FR (`locales/fr.ts`), fonction typée `t()` avec dot-notation et interpolation `{{var}}`, tests unitaires ; convention documentée dans le header du fichier locale*
- [x] Langue UI **FR** livrée ; **deuxième langue** reportée en **V2** (features list) — *locale FR exhaustive couvrant common, nav, auth, events, movies, errors, theme ; migration des écrans existants progressive, V2 ajoutera react-intl ou i18next*
- [x] **V2 — Deuxième langue UI (anglais)** — *`locales/en.ts` : traduction complète miroir de `fr.ts` ; type `Locale` élargi via `DeepStringify` pour accepter les valeurs EN ; registre `locales/index.ts` (`LocaleCode`, `LOCALE_LABELS`, `SUPPORTED_LOCALES`)*
- [x] **V2 — Sélecteur de langue** — *`LocaleContext.tsx` : React Context + Provider avec détection `navigator.language` ; `useTranslation.ts` : hook `t()` lié au contexte ; `LanguageSelector.tsx` : `<select>` intégré dans le header AppShell ; `<html lang>` synchronisé*
- [x] **V2 — Persistance préférence** — *localStorage (`moviepicker-locale`) lu au montage, écrit à chaque changement ; détection navigateur comme fallback ; préparé pour sync compte (backend à venir)*
- [x] **V2 — TMDB aligné sur la locale** — *`tmdbLanguage` (ex. `fr-FR`, `en-US`) exposé par `useLocale()` ; `searchMovies()` transmet `?lang=` au backend ; `AddMovieForm` utilise `tmdbLanguage` pour chaque recherche*

---

## 20. Tests, contrat et qualité

- [x] **Tests .NET** : nouveaux handlers (auth, config, marqueur « déjà vu », agrégats watch providers / cache posters si testables)
- [x] **Tests intégration** : parcours connexion → création soirée liée au compte → config → marquer « déjà vu »
- [x] **OpenAPI** : schémas à jour ; **export CI** et `OpenApiContractTests`
- [x] **Front** : Vitest / RTL sur pages auth, mes soirées, paramètres hôte, composants bouton « Déjà vu » / QR / **watch providers** / **thème soirée** / **préférence thème UI**
- [x] **`pnpm run verify:local`** avant merge majeur V1

---

## 21. Déploiement et observabilité

- [x] Variables d’environnement et secrets (auth, bucket posters si applicable) documentés pour l’équipe (README, `.env.example`, procédure secrets)
- [x] **CORS** / `ALLOWED_ORIGINS` si nouvelles origines (ex. sous-domaine OG)
- [x] **Cookies / sessions** (si cookie auth) : attributs **Secure**, **HttpOnly**, **SameSite** ; politique **CSRF** si cookie en cross-site — à documenter avec le choix auth
- [x] **Rate limiting** : revoir les plafonds pour les **nouveaux endpoints** (auth, config, marqueur « déjà vu », TMDB enrichie) — prolongement note « technique » features list § V1
- [x] Logs structurés : corrélation sur les routes auth et config (prolongement MVP § 29)

---

## 22. V1 terminée

- [x] Parcours **compte** : inscription → connexion → créer / rejoindre → **Mes soirées**
- [x] Parcours **hôte** : config (thème, limites, roue) → invités avec marqueur « déjà vu » / **bandeau ou style thème soirée** / watch providers / affichage posters (cache si activé)
- [x] **QR code** + **rappel in-app** validés sur mobile
- [x] **OG dynamiques** : livrés **ou** explicitement reportés avec doc de la limite
- [x] Mettre à jour la features list du dépôt et tout index roadmaps par version si le dépôt en contient un

---

## 23. Sécurité CI — Sonar (analyse statique)

> **Objectif** : qualité / SAST sur le code via **SonarCloud** ou **SonarQube**, avec **quality gate** sur les PR ou `master`.

- [ ] Créer le projet Sonar (organisation / clé projet SonarCloud ou instance SonarQube) et lier le dépôt GitHub
- [ ] Déposer **`SONAR_TOKEN`** (et si besoin **`SONAR_HOST_URL`** pour SonarQube) dans **GitHub → Secrets** ; ne jamais committer de jetons — noter les noms de secrets où l’équipe suit la CI
- [ ] Ajouter l’analyse en CI (`.github/workflows/ci-cd.yml` ou job dédié) : **SonarScanner** / action **SonarCloud** pour le **monorepo** — au minimum **API .NET** (`apps/api-dotnet`) et **front** (`apps/web`), ou configuration multi-module selon la doc Sonar
- [ ] Brancher les **rapports de couverture** (**`dotnet test`** / **Vitest**) vers Sonar si la gate doit inclure la couverture
- [ ] Définir une **Quality Gate** : la CI **échoue** si la gate est rouge (bugs, vulnérabilités, security hotspots selon seuils retenus)
- [ ] Documenter brièvement (branche analysée, secrets Sonar, comportement sur PR) pour l’équipe (README ou doc interne)

---

## 24. Sécurité CI — Dépendances NuGet (API .NET)

> **Objectif** : détecter les paquets .NET vulnérables en CI — **complète** `pnpm audit` côté Node (**déjà** en job `lint`) ; **distinct** de Sonar.

- [ ] Après **`dotnet restore`** sur la solution, exécuter **`dotnet list package --vulnerable`** (ajouter **`--include-transitive`** si l’équipe veut couvrir les transitifs)
- [ ] **Faire échouer** le job si des vulnérabilités **high/critical** (ou seuil documenté) ; noter la politique avec la doc CI du dépôt (ex. `.github/workflows/ci-cd.yml`)

---

## 25. Sécurité CI — Image Docker (API)

> **Objectif** : réduire les CVE dans l’image poussée vers Artifact Registry / Cloud Run.

- [ ] Après **`docker build`** de l’API, lancer un **scan CVE** (**Trivy**, **Grype** ou équivalent) sur l’image taguée localement
- [ ] **Faire échouer** le pipeline au-delà du seuil retenu **avant** `docker push` ; documenter seuil et outil choisi (README / procédure CI)

---

## 26. Sécurité CI — Secrets et anti-fuite

> **Objectif** : limiter les secrets commités et réagir vite si fuite.

- [ ] Activer ou vérifier **GitHub Secret scanning** (et **push protection** si disponible) sur le dépôt ; définir une **procédure de rotation** si alerte
- [ ] Option CI : **Gitleaks** ou **TruffleHog** sur le dépôt ou le diff PR — **échec** si finding confirmé ; complément au scanning hébergé GitHub

---

## Après coup (souvent non prévu au départ)

- [ ] Refactor / dette : simplifier `EventDetail` si la complexité a cru malgré le découpage MVP
- [ ] Ajustements **rate limiting** après mesure trafic auth / TMDB
- [ ] Petites features opportunistes : copy UX, accessibilité ciblée, crédits TMDB visibles

