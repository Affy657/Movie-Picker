# Plan : app navigable sans compte

Statut : livré, testé (front + API), sur la branche `v1.4.1`. Non poussé.
Version cible : v1.4.1.
Créé le 2026-09-03.

## Objectif

Un visiteur non connecté doit pouvoir se promener dans l'application au lieu de se heurter à un mur de connexion. Les fonctionnalités restent réservées aux comptes : quand le visiteur atteint une page dont il ne peut rien tirer, elle affiche un message explicite et un appel à créer un compte ou se connecter, pas une redirection sèche.

La landing page ne demande plus de se connecter, elle redirige vers l'application. Elle sera retravaillée plus tard pour présenter le nouveau contenu.

## Périmètre

Ce chantier ouvre uniquement la navigation. Il ne rouvre pas le mode invité : aucun visiteur anonyme ne peut rejoindre une soirée, proposer un film, voter ni posséder de watchlist. Ces deux paliers (participer, posséder) sont explicitement hors périmètre.

Conséquence directe : **aucune modification de la couche d'autorisation de l'API**. Les données restent fermées par les attributs `[Authorize]` existants, aucune surface d'attaque n'est rouverte. La seule modification côté serveur concerne le sitemap, pour cause de déplacement de la landing.

## État de départ

Trois constats issus de l'analyse du code.

Le blocage principal est `AppShell`. Quand `user` est nul, la liste des items de navigation est vide et tout est masqué : nav desktop, nav mobile, cloche de notifications, menu utilisateur. Ouvrir des routes sans traiter ce point ne servirait à rien, il n'y aurait aucun lien pour y accéder.

`AccountPage` gère déjà le cas visiteur. La branche `!user` contient une section de préférences (langue, thème, couleur d'accent) et les deux appels à l'action. `AccountPreferencesPage` masque déjà le sélecteur d'échelle de notes en l'absence de compte. Un test axe « AccountPage (visiteur) » existe. C'est du code dormant, rendu inatteignable par le `ProtectedRoute`.

Le Footer est rendu pour tout le monde et pointe déjà vers Mes soirées, Nouvelle soirée et Ma liste. Les points d'entrée existent en partie, ils butent simplement sur le mur.

## Décisions actées

| Sujet | Décision |
| --- | --- |
| Landing | Vraie redirection de route, pas un simple changement d'appel à l'action |
| Home de transition | `/my-events` fait office de home jusqu'à la home V1.5 |
| Réglages | Ouvrir ce qui peut l'être, la branche visiteur existante prend le relais |
| Mode invité | Hors périmètre, définitivement |
| Livraison | Les huit chantiers sont développés et livrés en un seul lot |
| Version cible | v1.4.1, sur la branche `v1.4.1` |

## Livraison

Les huit chantiers partent ensemble. **Aucun ne doit être mergé isolément**, car pris séparément plusieurs dégradent le produit :

- C1 seul enverrait la racine du site vers `/my-events`, encore protégé, donc vers `/login`. La racine deviendrait un formulaire de connexion et la landing serait inatteignable.
- C2 seul afficherait une navigation dont les trois liens rebondissent sur `/login`.

Ordre de développement interne, pour que les dépendances techniques soient respectées :

1. C3, gardes de requêtes, préalable technique.
2. C4, état déconnecté partagé.
3. C5, ouverture des routes.
4. C2, shell navigable.
5. C1, redirection de la landing.
6. C6, C7 et C8, mesure, recette puis documentation.

## Conséquences assumées

Entre cette livraison et l'arrivée de la home V1.5, la racine `/` n'est plus une page indexable. `/decouvrir` prend le relais comme page publique de présentation. Les liens externes existants vers `/` continuent de fonctionner grâce à la redirection côté client.

Pendant la même période, la première page vue par un visiteur qui tape le domaine est « Mes soirées » à l'état déconnecté. Le soin apporté au contenu de cet état conditionne donc la première impression du produit, il ne peut pas se contenter d'un message générique.

---

## C1 : redirection de la landing

Supprimer `HomeRoute`. La route racine rend `<Navigate to={ROUTES.myEvents} replace />`. Effet de bord bienvenu : plus d'appel `useAuth` sur `/`, donc plus de flash « Chargement » à l'arrivée sur le site.

Déplacer `LandingPage` sur une nouvelle route `ROUTES.discover = '/decouvrir'`, pour qu'elle reste atteignable et indexable. Sans ce déplacement, elle devient du code mort et le site perd sa seule page indexable jusqu'à la home V1.5.

Suivre le SEO dans le même lot, faute de quoi la redirection casse le chantier SEO existant :

- `usePageSeo` de `LandingPage` : canonical vers `${SITE_URL}/decouvrir`.
- `apps/web/index.html` : `og:url` (ligne 25) et `<link rel="canonical">` (ligne 45) vers `/decouvrir`, plus relecture du JSON-LD (ligne 47).
- `GetSitemapXmlHandler.cs` ligne 45 : l'URL statique `/` devient `/decouvrir`, priorité 1.0 conservée. Deux suites de tests à reprendre, `GetSitemapXmlHandlerTests` et `SitemapEndpointTests`. C'est la seule modification API du chantier.

### Audit des retours vers l'accueil

`ROUTES.home` est utilisé à 15 endroits. Deux ne sont pas des liens à traiter : `App.tsx:84` est la déclaration de route elle-même, et `routes.ts:38` est une comparaison interne à `withReturnTo`. Un troisième, `ProtectedRoute.tsx:35`, disparaît avec le composant en C5. Restent 12 liens à trancher, essentiellement des boutons « Retour à l'accueil » qui enverraient tous sur Mes soirées. Trois sont franchement mauvais et doivent être repointés vers `/decouvrir` :

- `NotFoundPage.tsx:18` et `ServerErrorPage.tsx:34` : un visiteur anonyme en erreur clique sur « Retour à l'accueil » et tombe sur une demande de connexion.
- `AccountSecurityPage.tsx:295` : après suppression de compte, la navigation renvoie sur « Mes soirées, connecte-toi », juste après que l'utilisateur a supprimé son compte.
- `EventDetailHeader.tsx:212` : même situation après avoir quitté une soirée.

Les autres usages (Footer, AppShell, DonatePage, LegalContentPage, AuthPageShell, ProfileQueryStates, EventDetail) sont à trancher un par un. Introduire une constante distincte, par exemple `ROUTES.discover`, plutôt que de réutiliser `ROUTES.home` partout.

Cas particulier du Footer : le lien « Accueil » pointe sur `ROUTES.home`, qui redirige désormais vers Mes soirées, juste au-dessus du lien « Mes soirées ». Le repointer vers `/decouvrir` ou le retirer.

Cas particulier de `withReturnTo` : la fonction traite `ROUTES.home` comme « pas de retour à mémoriser », et `safeReturnTo` renvoie `/` comme valeur de repli. Les deux restent corrects après la redirection, mais sont à couvrir par un test.

### PWA

`start_url: '/'` dans `vite.config.ts:146`. Après la redirection, l'application installée démarre sur une redirection, ce qui fonctionne mais provoque un flash. Le faire pointer directement sur `/my-events`. Conséquence à assumer : un utilisateur non connecté qui installe l'application démarre sur l'état déconnecté.

### Point non vérifiable depuis le dépôt

`/decouvrir` dépend de la custom error response 403/404 vers `index.html` de la distribution CloudFront. Le dossier `infra/` ne contient qu'un fichier de politique Artifact Registry, la distribution est configurée à la main. La règle existe forcément puisque `/e/:slug` fonctionne, mais à vérifier explicitement après déploiement plutôt qu'à supposer.

**Fichiers** : `App.tsx`, `routes.ts`, `LandingPage.tsx`, `index.html`, `vite.config.ts`, les fichiers de l'audit ci-dessus, `GetSitemapXmlHandler.cs`.

## C2 : shell navigable en anonyme

`AUTHENTICATED_NAV_ITEMS` devient `NAV_ITEMS`. Les navigations desktop et mobile sont rendues dans les deux cas.

Zone d'actions du header : connecté, la cloche et le menu utilisateur comme aujourd'hui ; anonyme, deux boutons « Se connecter » et « Créer un compte » portant le `returnTo` de l'URL courante. Vérifier la largeur en mobile, entre la marque, la navigation et deux boutons il faudra peut-être n'en garder qu'un en dessous d'un certain seuil.

`clearMobileNav` du Footer passe à `true` dans les deux cas, la navigation mobile est désormais toujours présente.

Restent réservés aux connectés : la modale des nouveautés, le bouton Proposer une idée (il appelle un endpoint `[Authorize]`) et la cloche.

Ajouter un lien « Réglages » dans le Footer. Sans lui, `/settings` reste sans point d'entrée pour un anonyme puisque le menu utilisateur est masqué. Reste à trancher : le montrer à tout le monde, au risque de doubler l'entrée déjà présente dans le menu utilisateur, ou le réserver aux anonymes.

`/notifications` n'obtient volontairement aucun point d'entrée. La page est ouverte défensivement, pour le cas d'une URL tapée ou d'un signet, mais une boîte de notifications n'est pas une destination pour quelqu'un qui n'en reçoit pas.

Nouvelles clés i18n françaises et anglaises pour les deux boutons du header.

**Fichiers** : `AppShell.tsx`, `AppShell.module.css`, `Footer.tsx`, locales `fr.ts` et `en.ts`.

## C3 : gardes de requêtes

Préalable technique à C5. Objectif mesurable : zéro requête 401 pour un visiteur anonyme, à vérifier dans l'onglet réseau en navigation privée.

`/auth/me` est déjà couvert : `fetchAuthMeForSession` court-circuite sur `hasSessionHint()` et n'émet aucune requête sans indice de session. Restent les trois requêtes de page.

- `WatchlistPage` : passer `useWatchlist({ enabled: !!user })`, le hook accepte déjà l'option.
- `NotificationsPage` : la page n'a aucune notion d'authentification aujourd'hui. Ajouter `useAuth`, conditionner la requête paginée et neutraliser les deux mutations.
- `MyEventsPage` : rien à ajouter, les requêtes sont déjà conditionnées sur `user`. Seul l'effet de redirection vers `/login` est à retirer.

**Fichiers** : `WatchlistPage.tsx`, `NotificationsPage.tsx`, `MyEventsPage.tsx`.

## C4 : état déconnecté partagé

Créer un composant `SignedOutState` dans `shared/components/`, bâti sur le `EmptyState` existant qui accepte déjà un slot `actions` : icône, titre, message, et les deux appels à l'action portant le `returnTo` de la page courante.

Brancher sur `MyEventsPage`, `WatchlistPage`, `NotificationsPage` et `CreateEvent`.

Pour `CreateEvent`, le formulaire est remplacé par l'état déconnecté. On ne conserve pas de brouillon de saisie pour l'instant.

Un message spécifique par page, pas un texte générique. C'est d'autant plus important pour `MyEventsPage`, qui devient la première page vue par un visiteur arrivant sur le domaine. Clés i18n françaises et anglaises.

Distinguer l'état déconnecté de l'échec de vérification de session : n'afficher `SignedOutState` que si `!isLoading && !user && !authCheckFailed`, sinon montrer l'écran d'erreur avec bouton Réessayer, aujourd'hui dans `ProtectedRoute` et à extraire en composant partagé. Le risque est faible en pratique, `fetchAuthMeForSession` avalant déjà les 401 pour renvoyer `null` sans lever d'erreur, mais la garde évite de masquer une panne d'API derrière une invitation à créer un compte.

**Fichiers** : `shared/components/SignedOutState.tsx` et son module CSS, écran d'erreur extrait de `ProtectedRoute.tsx`, les 4 pages, locales.

## C5 : ouverture des routes

Retirer `ProtectedRoute` de `/new`, `/my-events`, `/watchlist`, `/notifications` et `/settings/*` dans `App.tsx`.

`/settings/*` ne demande aucun travail supplémentaire, la branche visiteur existe déjà. Préciser ce que cela produit exactement, pour éviter de le prendre pour un défaut en recette : la branche visiteur d'`AccountPage` court-circuite le `<Routes>` imbriqué, donc `/settings`, `/settings/preferences` et `/settings/securite` rendent tous la même page visiteur plate. On n'ouvre pas la sous-page Préférences, on ouvre une page visiteur unique contenant trois préférences (langue, thème, couleur d'accent).

À la marge, cette section de préférences visiteur et `AccountPreferencesPage` dupliquent les trois mêmes champs, c'est l'occasion de factoriser sans que ce soit bloquant.

`ProtectedRoute` n'a alors plus aucun appelant. Après extraction de son écran d'erreur en C4, il se supprime avec son fichier de test.

**Fichiers** : `App.tsx`, suppression de `ProtectedRoute.tsx` et de son test.

## C6 : conversion et mesure

Poser un event analytics au clic sur un appel à l'action de `SignedOutState`, avec la page d'origine en propriété. Sans cette mesure, on ne saura pas si l'ouverture transforme réellement des visiteurs en comptes, ce qui est pourtant l'objectif du chantier.

Vérifier que le `returnTo` ramène bien sur la page d'origine après connexion et après inscription, les deux parcours.

Anticiper un artefact de mesure : PostHog capture les pageviews sur history change, et la redirection depuis `/` produira systématiquement deux pageviews, avec un `/` à 100 % de rebond. À garder en tête au moment de lire les chiffres, ce n'est pas une régression.

## C7 : tests et recette

Tests front à écrire ou à reprendre :

- `App.test.tsx` : redirection de la racine.
- `LandingPage.test.tsx` : nouvelle route.
- Les 4 pages en variante déconnectée.
- Un test `AppShell`, qui n'existe pas aujourd'hui : navigation visible en anonyme, boutons du header.
- `routes.ts` : `withReturnTo` et `safeReturnTo` après le changement de rôle de `/`.

`a11y.test.tsx` : ajouter les 4 écrans déconnectés au balayage axe, sinon les nouveaux écrans échappent à la couverture accessibilité. La vue LandingPage y figure déjà, à ajuster à la nouvelle route.

`InviteLinkRedirect.test.tsx` : le flux lien d'invitation passe par `/e/:slug` qui reste public, aucun impact attendu, mais à relancer, c'est un flux qui a déjà cassé une fois.

E2E : les 4 spécifications passent toutes par un login, à relire pour vérifier qu'aucune ne s'appuie sur la redirection vers `/login`.

API : uniquement les deux suites sitemap.

### Critère de recette

La livraison est considérée finie quand, en navigation privée et sans compte :

1. Les cinq pages de destination (`/decouvrir`, `/my-events`, `/new`, `/watchlist`, `/settings`) sont atteignables depuis la navigation ou le footer, sans passer par une URL tapée à la main. `/notifications` est vérifiée séparément, par URL directe, elle n'a pas de point d'entrée par choix.
2. L'onglet réseau ne montre aucune réponse 401 sur l'ensemble du parcours.
3. La console ne montre aucune erreur.
4. Depuis chacune des quatre pages à état déconnecté, le CTA mène à la connexion puis ramène sur la page d'origine.
5. La racine `/` redirige, et le retour « accueil » depuis une 404 mène à `/decouvrir`.
6. La règle CloudFront sert bien `/decouvrir` après déploiement.

Vérification manuelle avant le push, en gardant en tête le service worker obsolète sur localhost qui casse les appels `/api/v1/*`.

### Couverture et format

Lancer `pnpm test:coverage` et pas seulement `pnpm test` : les seuils front sont à lignes 82, fonctions 76, branches 74 (`vitest.config.ts:45`), et le chantier supprime `ProtectedRoute` avec son test tout en ajoutant plusieurs composants et branches conditionnelles.

Passer `prettier --write` sur chaque fichier TypeScript créé, en les listant un par un, puis `pnpm format:check` avant le commit, sinon le hook de pre-push bloque. Les modules CSS ne sont pas couverts par `format:check`.

## C8 : documentation

`CHANGELOG.md` : entrée de version pour l'ouverture de la navigation sans compte.

`docs/roadmap-product.md` : la section V1.5 décrit une home « accessible sans compte » dont ce chantier est le préalable technique. Ajouter la ligne correspondante et marquer l'ouverture de la navigation comme livrée.

Pas d'entrée What's New : la modale n'est montrée qu'aux utilisateurs connectés, alors que la nouveauté s'adresse aux visiteurs anonymes.

Version cible : v1.4.1, sur la branche `v1.4.1` déjà ouverte. La dernière release déclarée dans `whatsNew.ts` reste `1.4.0` et n'est pas à toucher, puisque aucune entrée What's New n'est prévue.
