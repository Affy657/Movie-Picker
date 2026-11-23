# Audit du 2026-11-23 : ce que voit un visiteur non connecté

Question posée : quand quelqu'un arrive sur Movie Picker sans compte, ce qu'il voit est-il cohérent, logique et soigné, au point de donner envie de créer un compte ?

## Périmètre et méthode

- **Version auditée** : la prod 1.29.1, identique à master au commit `a77aedb6`.
- **Pages** : 52 adresses publiques et réservées (accueil, Explorer, catalogues, fiche film et série, profils publics et leurs sous-pages, pages légales, connexion, inscription, mot de passe oublié, toutes les routes réservées, liens d'invitation invalides, pages introuvables).
- **Formats** : bureau 1440 x 900 et iPhone 13, en thème clair.
- **Visiteur** : contexte de navigateur neuf à chaque page, sans cookie, consentement déjà donné sauf pour une passe « première visite » qui garde le bandeau.
- **Soirées et récaps** : aucune n'est liée en public, elles ont été vues sur le seed local (7 pages).
- **Clics testés** : Suivre, Enregistrer une liste, Créer (barre mobile), Créer une soirée (accueil), voter, Retour, recherche de l'en-tête et de l'accueil, Créer un compte depuis une soirée.
- **Outil** : scripts Playwright hors dépôt, captures pleine page après défilement pour charger les affiches.

État à la date de l'audit : **rien n'est corrigé**. Chaque constat porte un identifiant `V01` à `V16` pour être repris un par un ; un constat corrigé reçoit une ligne `Corrigé en <version>`.

## Ce qui va bien

- Sur 52 pages et 2 formats : aucune clé de traduction brute, aucun `undefined` ni `null` affiché, aucun défilement horizontal, aucune image cassée.
- Mesuré en série sur la prod : le titre et la première affiche apparaissent entre 1,2 et 2 s. Un écran de chargement plus long vu une fois venait d'un démarrage à froid de Cloud Run.
- L'accueil, Explorer, la recherche, les profils bien remplis, la page 404 et l'invitation invalide sont soignés.
- Quand une action demande un compte, `returnTo` ramène bien à la page de départ après connexion.

## Priorité haute : l'arrivée d'un invité

### V01 « Se connecter » est le bouton principal là où le visiteur n'a pas de compte

- **Constat** : sur la page d'une soirée, la carte « Rejoindre la soirée » met « Se connecter » en bouton plein et « Créer un compte » en secondaire. Même chose dans l'état déconnecté de toutes les routes réservées. Suivre, Enregistrer et « Créer » de la barre mobile mènent tous à `/login`. L'en-tête fait l'inverse : « Créer un compte » y est le bouton plein.
- **Pourquoi c'est important** : la mesure d'usage du 2026-11-10 compte 44 passages par `/login` contre 9 par `/register`. Un invité arrive presque toujours sans compte.
- **Où** : `apps/web/src/features/events/components/JoinForm.tsx`, `apps/web/src/shared/components/SignedOutState.tsx`, `apps/web/src/app/components/AppShell.tsx` (`MobileCreateItem`), les liens Suivre et Enregistrer des profils et des listes publiques.
- **Piste** : « Créer un compte » en bouton plein partout où le visiteur est vraisemblablement nouveau, « J'ai déjà un compte » en secondaire.

### V02 La page de soirée ne dit pas qui invite ni à quoi sert de rejoindre

- **Constat** : un invité voit le titre et les films, mais ni l'hôte, ni « X vous invite », ni une phrase sur ce qu'il pourra faire (proposer, voter, la roue). Les invitations à une liste et à un groupe affichent déjà « {{name}} vous invite ». Une fois sur la connexion ou l'inscription, le contexte est perdu : le lien de retour dit « Accueil » et le sous-titre reste générique. Sur l'inscription mobile, les boutons Google et GitHub sont sous le formulaire, hors de l'écran.
- **Où** : `JoinForm.tsx` (texte `events.join.signedOutIntro`), `apps/web/src/features/auth/pages/LoginPage.tsx` et `RegisterPage.tsx`, `OAuthProviderButtons`.
- **Piste** : « {{name}} vous invite à {{titre}} » et une ligne d'explication dans la carte ; sur la connexion et l'inscription, un retour vers la soirée quand `returnTo` en vient. La chaîne `eventInvitationText` des notifications existe déjà.

### V03 Voter sans compte ne produit rien de visible

- **Constat** : le clic sur un vote appelle `promptToJoinEvent`, qui fait défiler jusqu'à `#event-join` et pose le focus sur son premier lien. Quand la carte est déjà à l'écran, rien ne bouge.
- **Où** : `apps/web/src/features/events/joinPrompt.ts`.
- **Piste** : un retour visible à chaque fois (mise en avant de la carte, message court), même sans défilement.

### V04 Sur mobile, le bandeau cookies cache la carte « Rejoindre la soirée »

- **Constat** : à la première visite, le bandeau et ses trois boutons empilés couvrent environ 40 % de l'écran, pile sur les boutons de la carte.
- **Où** : `apps/web/src/app/components/ConsentBanner.tsx`.
- **Piste** : boutons côte à côte et bandeau plus bas, ou carte qui reste visible au-dessus du bandeau.

### V05 Nom et pseudo presque illisibles sur un profil à bannière, en thème clair

- **Constat** : le fondu de la bannière reste transparent jusqu'à 38 % de sa hauteur et le contenu remonte dessus, donc le nom se pose sur l'image. Vu sur `/u/ad0`, le premier profil du sitemap.
- **Où** : `apps/web/src/shared/components/FadedBanner.module.css` (`.backdrop::after`, `.overBanner`).
- **Piste** : fondu plus opaque sous le texte, ou texte posé sous la bannière.

## Cohérence

### V06 « Retour » sur une soirée ou un récap peut faire quitter le site

- **Constat** : la règle `history.length > 1` revient en arrière dès qu'il existe un historique, même s'il vient d'un autre site. En test, le clic menait à une page blanche. La fiche film ne revient en arrière que si on vient de l'application (`fromApp`).
- **Où** : `apps/web/src/features/events/pages/event-detail/useEventBack.ts`, utilisé par `EventDetailHeader.tsx` et `NightRecapHeader.tsx` ; modèle dans `useMoviePageNavigation` de `MoviePage.tsx`.

### V07 La fiche film n'offre aucune action au visiteur

- **Constat** : seuls Bande-annonce et Partager restent. Le seul encart dit « Connectez-vous pour retrouver ce film dans vos soirées », qui ne parle pas à quelqu'un sans soirée.
- **Où** : `apps/web/src/app/pages/movie/MoviePage.tsx` (`HeroActions`).
- **Piste** : « Proposer ce film à une soirée » visible, qui mène à l'inscription avec `returnTo`.

### V08 Une soirée terminée met en avant « Se connecter pour noter »

- **Constat** : un visiteur qui n'y était pas voit ce bouton en principal, et aucun « Organisez la vôtre », contrairement au récap.
- **Où** : `apps/web/src/features/events/pages/event-detail/EventWinnerSummary.tsx` (`events.ratings.signInToRate`).

### V09 Tutoiement au milieu du vouvoiement

- **Constat** : « Organise la tienne » sur le récap, et quatre messages du mot de passe oublié (« Pense à vérifier les spams », « Réessaie dans quelques instants » deux fois, « Demande-en un nouveau »).
- **Où** : `apps/web/src/shared/i18n/locales/fr.ts`, clés `events.recap.ctaButton` et le bloc du mot de passe oublié. Le test `localeParity.test.ts` applique déjà une expression régulière de vouvoiement : elle ne voit pas ces formes.

### V10 Cinq présentations différentes pour « introuvable »

- **Constat** : la 404, le film introuvable et l'invitation invalide ont une icône bleue, un `h1` et un bouton plein. La soirée et le profil introuvables ont une icône rouge, ni titre ni `h1`, un bouton à contour et des apostrophes droites. Le récap introuvable a une icône rouge et un petit titre. Le récap et le profil introuvables gardent « Movie Picker » seul comme titre d'onglet.
- **Où** : `apps/web/src/features/events/pages/EventDetail.tsx` (`events.detail.missing`), `apps/web/src/features/events/pages/night-recap/NightRecapStates.tsx`, `apps/web/src/features/profile/components/ProfileQueryStates.tsx`.
- **Piste** : un seul état « introuvable », celui de la 404.

### V11 Le menu parle au visiteur comme à un membre

- **Constat** : « Mes soirées », « Mes listes », et dans le pied de page « Nouvelle soirée » et « Paramètres ». La page Paramètres lui dit « Connectez-vous ou créez un compte pour garder vos soirées », hors sujet. Sur mobile, « Soirées » côtoie « Mes listes ».
- **Où** : `AppShell.tsx`, `apps/web/src/app/components/Footer.tsx`, `fr.ts` (`guestLead`, `myEventsShort`, `listsShort`).

### V12 « Créer une soirée » ne mène pas au même endroit selon le bouton

- **Constat** : `/new` depuis l'accueil (puis l'état déconnecté), `/login?returnTo=/new` depuis la barre mobile.
- **Où** : `AppShell.tsx` (`MobileCreateItem`), page d'accueil.

### V13 Les pages réservées gardent le titre d'onglet de l'accueil et n'ont pas de `noindex`

- **Constat** : `SessionGate` affiche un `h1` et l'état déconnecté sans régler le titre ni le `noindex`. La carte de connexion n'a pas la même largeur d'une page à l'autre.
- **Où** : `apps/web/src/app/components/SessionGate.tsx`. Lire la contrainte C9 de `docs/technical-debt.md` avant d'y toucher.

## Mineur ou contenu

### V14 Une liste publique nommée « test » sur le profil du propriétaire

- **Constat** : titre et description « test », visible depuis `/u/ad0`. Geste sur les données, pas sur le code.

### V15 Un profil vide affiche une page blanche sous l'en-tête

- **Constat** : un compte sans film, liste ni soirée n'a rien sous son en-tête, et ces profils vides sont dans le sitemap.
- **Piste** : un état vide, et sortir du sitemap les profils sans contenu.

### V16 « Les propositions gagnantes de AD »

- **Constat** : pas d'élision devant une voyelle. `lists.public.pageTitle` passe déjà par `withElision` (`apps/web/src/features/library/utils/listMembers.ts`), `profile.winningProposals.pageTitle` n'a pas de variante élidée.

### Remarque transverse : apostrophes

`fr.ts` mélange les apostrophes droites (245) et typographiques (324), et les deux se voient côte à côte à l'écran (V10).
