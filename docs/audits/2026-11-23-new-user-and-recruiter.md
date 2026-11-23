# Audit du 2026-11-23 : premier compte, regard d'un recruteur, mesures et robustesse

Suite de [l'audit du visiteur non connecté](2026-11-23-signed-out-visitor.md) du même jour. Ses constats V01 à V16 ne sont pas répétés ici.

Question posée : qu'est-ce qui abîme l'impression d'un nouvel utilisateur, et celle d'un recruteur qui regarde la plateforme, la teste et juge la qualité du travail ?

## Périmètre et méthode

- **Version** : la prod 1.29.1 (`a77aedb6`), master en `390ae31e` (un commit de documentation de plus).
- **Quatre axes**, menés en parallèle :
  1. **Premier compte (N)** : sur la stack locale (base de dev), un hôte sur ordinateur et un invité sur iPhone 13 qui arrive par le lien. Inscription, pages vides, première soirée, invitation, vote, roue, notifications, mot de passe oublié, notation, groupe et lien d'invitation, suppression des comptes. La recherche a été revérifiée sur la prod.
  2. **Recruteur (R)** : README, site, `/tech`, dépôt GitHub vu sans session, profil GitHub, en 5 à 15 minutes.
  3. **Mesures (M)** : Lighthouse 13.5 en mobile et bureau (deux passages par page), axe-core sur 20 pages en clair et en sombre, parcours au clavier, WebKit sur iPhone et iPad, largeurs 320 et 2 560 px, en-têtes HTTP, Mozilla Observatory, HTML brut sans JavaScript, première visite, hors ligne. PageSpeed Insights a refusé (quota), donc aucune donnée de terrain.
  4. **Robustesse (C)** : 30 scénarios Playwright sur la stack locale : saisies extrêmes, doubles clics, plusieurs onglets, session expirée, pannes simulées (500, 503, 429, lenteur, hors ligne), règles métier aux limites, clavier, mobile.
- Les constats de gravité haute ont été revérifiés à la main, par une mesure ou par la lecture du code.
- Les comptes créés pour l'audit ont été supprimés par l'application. Des soirées de test restent dans la base de dev.
- Chaque constat porte un identifiant ; un constat corrigé reçoit une ligne `Corrigé en <version>`. État à la date de l'audit : **rien n'est corrigé**.

## À corriger d'abord

1. **N01** : la recherche de films ne trouve pas « Rocky », « Amélie » ou « Léon », la filmographie d'un acteur prend leur place.
2. **N02** : l'invité qui crée son compte depuis le lien revient sur la soirée sans y être inscrit.
3. **N03** : l'hôte seul sur sa soirée n'est jamais poussé à inviter ses amis.
4. **C01** : une faute de frappe sur l'année dans les paramètres termine la soirée pour de bon.
5. **R01** : deux des six chiffres de l'en-tête de `/tech` sont faux (commits, mois).
6. **R02** : la CI de master est rouge un run sur trois, surtout sur les commits de version.
7. **R03** : le README ne dit pas qui l'a écrit ni que son auteur cherche un poste.
8. **M01** et **M03** : la fiche film saute de 160 px au chargement sur mobile, et la porte Lighthouse ne mesure ni les affiches ni ces pages.
9. **C03** : n'importe quel participant peut donner au film qu'il propose le titre qu'il veut, repris dans les notifications de tous.
10. **N08** et **M09** : les liens partagés d'un groupe, d'une liste ou d'un profil s'affichent comme l'accueil dans une messagerie.

---

## N : premier compte et soirée à deux

### N01 La recherche de films ne trouve pas les titres qui sont aussi des prénoms

- **Gravité** : haute
- **Constat** : sur la prod, « amelie » met Hunger Games en premier et Le Fabuleux Destin d'Amélie Poulain au 19e rang. « leon » et « matilda » donnent la filmographie d'un acteur ou d'une actrice qui porte ce prénom, sans le film. En local, « Rocky », « Carrie », « Elvis », « Lucy » et « Annie » ne renvoient jamais le film : les 20 places sont prises. Même défaut dans « Proposer un film ». À côté, « dune » remonte « Anatomie d'une chute », « La Revanche d'une blonde » et « Journal intime d'une nymphomane » (TMDB en français rapproche « dune » de « d'une »).
- **Où** : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Tmdb/TmdbMovieSearch.Search.cs`. `FindBestMatchingPersonAsync` retient une personne dont le nom contient la requête en mot entier, puis `MergeTitleAndCreditMatches` place ses crédits devant les titres (`LeadsResults`).
- **Piste** : un titre égal à la requête passe toujours en tête, les crédits d'une personne ne prennent jamais plus de la moitié des places, et les résultats se reclassent par ressemblance au titre.

### N02 L'invité qui crée son compte depuis le lien n'est pas inscrit à la soirée

- **Gravité** : haute
- **Constat** : depuis la carte « Rejoindre la soirée », « Créer un compte » puis l'inscription ramènent bien sur la soirée, mais l'invité doit encore cliquer « Rejoindre ». Il a pourtant cliqué dans une carte qui s'appelle « Rejoindre la soirée ». Même chose après une connexion.
- **Où** : `apps/web/src/features/events/components/JoinForm.tsx` (liens avec `returnTo`), `apps/web/src/features/auth/pages/RegisterPage.tsx`, `LoginPage.tsx`.
- **Piste** : un `returnTo` qui porte l'intention de rejoindre et l'exécute au retour.

### N03 L'hôte seul sur sa soirée n'est pas poussé à inviter

- **Gravité** : haute
- **Constat** : la fenêtre « Soirée créée » donne bien le lien. Mais une fois sur la soirée, l'hôte seul lit « Proposez le premier film, la roue viendra ensuite. », le même texte que pour un invité, et le partage n'est qu'une icône sans libellé en haut à droite. Or une soirée sans invités n'a pas de sens.
- **Où** : `apps/web/src/features/events/pages/event-detail/EventMoviesSection.tsx` (`movies.list.emptyParticipant`), `EventDetailHeader.tsx`.
- **Piste** : tant que l'hôte est seul, un encart « Invitez vos amis » avec le lien et un bouton Copier ou Partager.

### N04 Aucun accueil après l'inscription

- **Gravité** : moyenne
- **Constat** : après « Créer mon compte », on retombe sur l'accueil, identique à celui d'un visiteur. Rien ne souhaite la bienvenue ni ne dit par quoi commencer. L'onboarding est déjà au backlog de la roadmap.
- **Piste** : en attendant l'onboarding, une ligne de bienvenue et « Créer ma première soirée » mis en avant à la première visite.

### N05 « Pseudo » veut dire deux choses

- **Gravité** : moyenne
- **Constat** : l'inscription demande un « Pseudo » qui devient en fait le nom affiché (« Camille Audit »). Le vrai pseudo (`@camille_audit`) est généré sans le dire. Les paramètres parlent de « Nom » et de « Pseudo », la suppression du compte de « handle ».
- **Où** : `apps/web/src/shared/i18n/locales/fr.ts` (`auth.register.pseudoLabel` ligne 451, `deleteAccountConfirmationLabel` ligne 650).
- **Piste** : « Nom affiché » à l'inscription, montrer le pseudo généré juste après, « pseudo » partout au lieu de « handle ».

### N06 Le profil est public par défaut, sans que l'inscription le dise

- **Gravité** : moyenne
- **Constat** : un compte neuf a son profil, sa liste À voir et ses films vus publics. Le formulaire d'inscription ne le signale pas et n'a aucun lien vers la politique de confidentialité.
- **Piste** : décision à prendre (protection des données dès la conception, RGPD article 25) : privé par défaut, ou une ligne sous le formulaire qui le dit, avec le lien vers la politique.

### N07 Les invités ne voient pas la roue tourner

- **Gravité** : moyenne
- **Constat** : seul l'hôte voit l'animation. Chez l'invité, le gagnant apparaît d'un coup environ 4 s plus tard. En tirage selon les votes, Parasite (0 vote) a battu Dune (1 vote) sans que rien n'explique les chances de chacun.
- **Où** : `apps/web/src/features/events/components/WheelModal.tsx`, `useEventWheel.ts`.
- **Piste** : rejouer l'animation chez les invités à l'arrivée du gagnant, et afficher les chances de chaque film sur la roue.

### N08 Les liens partagés s'affichent mal dans une messagerie

- **Gravité** : moyenne
- **Constat** :
  - Lien de soirée (`/e/`) : l'aperçu ne nomme pas l'hôte. Avec le titre proposé par défaut, titre et description se répètent (« Soirée du lundi 23 novembre » puis « Soirée ciné le lundi 23 novembre à 20h »). Le texte du partage natif donne « Je t'invite à Soirée du lundi 23 novembre le … ».
  - Liens d'invitation à un groupe (`/g/`) ou à une liste (`/l/`) : aperçu générique du site, avec l'adresse de l'accueil. Rien sur le groupe ni sur qui invite. Même défaut pour les profils (M09).
- **Où** : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/EventInvitation/GetEventInvitationDocumentHandler.cs`, `ServerCopy.SharePreviews.Invitation`, `fr.ts` (`events.share.shareText` ligne 1012), `infra/firebase-hosting.json` (seuls `/e`, `/r`, `/film` et `/serie` passent par l'API).
- **Piste** : « {hôte} vous invite » dans l'aperçu d'une soirée, et un document serveur pour `/g/` et `/l/`.

### N09 Un hôte qui supprime son compte laisse une soirée orpheline

- **Gravité** : moyenne
- **Constat** : l'hôte devient « Compte supprimé ». Plus personne ne peut régler la soirée ni relancer la roue, et les invités ne sont pas prévenus.
- **Piste** : transmettre le rôle d'hôte au plus ancien participant, ou prévenir les participants.

### N10 Les résultats de recherche ne montrent que des affiches

- **Gravité** : moyenne
- **Constat** : sur `/films/recherche`, aucun titre sous les affiches. Une affiche étrangère ou sans texte ne dit pas de quel film il s'agit.
- **Piste** : titre et année sous l'affiche dans la variante recherche.

### N11 L'hôte est notifié de son propre tirage

- **Gravité** : basse
- **Constat** : après avoir lancé la roue, l'hôte reçoit « Le verdict est tombé : ce sera Parasite ! ».

### N12 Après le tirage, « Proposer un film » reste l'action principale de l'invité

- **Gravité** : basse
- **Constat** : la barre du bas montre « Film choisi » à côté d'un bouton « Proposer un film », alors que le film est choisi.

### N13 Un tutoiement de plus

- **Gravité** : basse
- **Constat** : « Confirme le mot de passe » sur la page de réinitialisation (`fr.ts` ligne 500). Il complète la liste de V09, et la garde de DEBT-099 ne le voit pas.

### N14 Le seul e-mail envoyé n'a pas d'identité visuelle

- **Gravité** : basse
- **Constat** : l'e-mail de réinitialisation n'a ni logo ni couleurs du site, et c'est le seul e-mail du produit (pas d'e-mail de bienvenue).
- **Où** : `ServerCopy.PasswordResetEmail`.

### N15 Détails de la première soirée

- **Gravité** : basse
- **Constat** : la fenêtre « Règles » affiche « Partir de : Par défaut », seul choix pour un compte qui n'a aucun modèle. En vue tableau, la colonne des titres s'appelle « Ajout ».

### N16 Pas de message après « Rejoindre » ni après la suppression du compte

- **Gravité** : basse
- **Constat** : rejoindre une soirée ne confirme rien. Supprimer son compte ramène à l'accueil sans dire que c'est fait.

### N17 L'invitation à un groupe a le même bouton principal que V01

- **Gravité** : basse
- **Constat** : la page d'invitation à un groupe est claire (« Alice vous invite à rejoindre ce groupe »), mais « Se connecter » y est le bouton principal, comme sur la soirée.
- **Où** : `apps/web/src/features/groups/pages/JoinGroupPage.tsx`.

---

## R : ce que voit un recruteur

En résumé : en 30 secondes, un RH voit un produit mais pas de candidat. En 3 minutes, un développeur tombe sur deux chiffres faux dans l'en-tête de `/tech`. En 15 minutes, il trouve une CI rouge un run sur trois, des tags qui ne pointent pas sur leur version, et 86 % des commits co-signés par un agent IA dont le README ne parle pas. À l'inverse, le code ouvert au hasard est propre et SonarCloud est irréprochable.

### R01 Les chiffres de l'en-tête de `/tech` sont faux

- **Gravité** : haute
- **Constat** : l'en-tête affiche « 1 383 commits » et « 6 mois de développement ». Le dépôt en compte 2 092, sur 8 mois. La page dit pourtant « chiffres relevés au build » et « mesurés, pas estimés ». « 324 000 lignes de code » compte les lignes vides, environ 150 000 lignes de tests et 14 000 générées, alors que SonarCloud, public, affiche 108 138 lignes.
- **Où** : `apps/web/scripts/generate-tech-metrics.mjs` (lignes 52 à 91) reprend l'ancienne valeur quand le clone est superficiel ; le job de build du front de `.github/workflows/deploy.yml` fait un checkout sans `fetch-depth: 0`. Valeurs figées depuis le 2026-10-02 dans `apps/web/src/app/pages/tech/generated/techMetrics.ts`.
- **Piste** : `fetch-depth: 0` et un échec franc au lieu de la reprise ; préciser la part de tests dans le total de lignes.

### R02 La CI de master est rouge un run sur trois

- **Gravité** : haute
- **Constat** : sur 30 jours, 39 échecs, 72 succès et 4 annulations. 23 commits de version sur 40 sont rouges : la version est poussée, puis réparée par un commit « clear the SonarCloud issues ». 12 runs Dependabot sur 21 sont rouges. La page où mène le badge CI du README montre 11 runs rouges sur 25.
- **Où** : `.github/workflows/ci-cd.yml`, le script `pnpm run release`.
- **Piste** : rejouer Sonar, `dotnet format` et le build Release avant `pnpm run release`.

### R03 Le README ne présente pas son auteur

- **Gravité** : haute
- **Constat** : ni nom, ni métier, ni ville, ni recherche de poste, ni lien LinkedIn ou CV. « Projet solo » n'apparaît que dans la section Licence.
- **Piste** : trois lignes sous la bannière : auteur, « développeur backend .NET », ce que le projet montre, liens, disponibilité.

### R04 Le site ne mène pas au code

- **Gravité** : moyenne
- **Constat** : le lien GitHub du pied de page va au profil, pas au dépôt (`Footer.tsx` ligne 103). `/tech` n'a aucun lien vers le dépôt, et l'auteur n'y est nommé qu'en bas de page.
- **Piste** : un lien « Code source » dans l'en-tête de `/tech` et dans le pied de page.

### R05 La part de l'agent IA se voit partout, sauf dans le README

- **Gravité** : moyenne (question de lecture, pas un défaut)
- **Constat** : 86 % des commits sont co-signés par Claude (97 % depuis septembre). « claude » est le deuxième contributeur affiché, 83 fusions viennent de branches `claude/...`, et la racine montre `.claude/`, `AGENTS.md` (77 Ko de règles) et `CLAUDE.md`. Des chemins du poste personnel figurent dans `AGENTS.md` et dans un skill. Certains y liront une pratique avancée, d'autres se demanderont ce que le candidat a écrit lui-même : la découverte se fait par l'historique, pas par l'auteur.
- **Piste** : un paragraphe assumé dans le README qui renvoie à la section de `/tech` sur l'agent ; retirer les chemins personnels.

### R06 `/tech` promet une validation humaine que `/auto-maintenance` contourne

- **Gravité** : moyenne
- **Constat** : `/tech` affirme « Rien ne continue sans mon accord » (`fr.ts` ligne 4012). Le même schéma liste pourtant `/auto-maintenance`, qui fusionne, déploie et revient en arrière sans demander. 7 des 11 procédures citées ne sont pas dans le dépôt.
- **Piste** : écrire la règle réelle (ce qui part seul, ce qui attend l'accord) et marquer les procédures externes.

### R07 Les captures du README sont périmées

- **Gravité** : moyenne
- **Constat** : elles datent du 2026-09-22 et montrent l'ancienne navigation (« Ma liste »). Elles sont sombres, réduites à environ 380 px donc illisibles, et aucune ne montre la roue. Dans la capture de soirée, tous les films sont proposés par la même personne.
- **Piste** : recapturer avec le seed actuel, en clair, avec plusieurs proposants et une animation de la roue.

### R08 Les tags ne pointent pas sur leur version

- **Gravité** : moyenne
- **Constat** : v1.28.0, v1.29.0 et v1.29.1 pointent tous sur le même commit, donc `git checkout v1.28.0` donne 1.29.1. 7 commits portent plusieurs tags (jusqu'à 7). Les releases sont seulement titrées par leur numéro, et leurs notes mêlent anglais et français.
- **Piste** : taguer le commit de version et titrer chaque release.

### R09 Une faiblesse de sécurité ouverte est décrite en public depuis deux mois

- **Gravité** : moyenne
- **Constat** : DEBT-052 attend un geste humain depuis le 2026-09-21, dans un fichier lié depuis le README. Pour un candidat qui vient du paiement, c'est la durée qui sera lue.
- **Piste** : faire le geste, puis fermer l'entrée.

### R10 `/tech` est trop long pour un lecteur pressé

- **Gravité** : moyenne
- **Constat** : 6 000 mots, environ 23 écrans sur ordinateur, 15 schémas, sans résumé. Jargon et franglais : « checks », « fallback SPA », « coquille en 200 », « porte ».
- **Piste** : un encart « En une minute » de cinq puces sous l'en-tête, et des sections repliables.

### R11 Les schémas de `/tech` sont tronqués sur téléphone

- **Gravité** : moyenne
- **Constat** : sur iPhone, chaque schéma fait 832 px dans un cadre de 300 px : on en voit 36 %, avec des mots coupés et sans indice de défilement. Le plus petit texte est rendu à 10,6 px.
- **Piste** : une variante verticale sous 768 px, ou au minimum un dégradé et « faire glisser ».

### R12 `/tech` se contredit

- **Gravité** : moyenne
- **Constat** :
  - « 8 domaines », mais 7 dessinés : `groups` manque dans `FRONT_DOMAINS` (`TechDiagrams.tsx` ligne 1427) ;
  - « 8 388 tests » en tête, alors que la pyramide fait 8 441 ;
  - « Rien n'est déployé à la main » et « le déploiement se lance à la main » ;
  - « Aucune autre branche durable », alors que `feedback-attachments` existe ;
  - la Trajectoire s'arrête à V1.7 : groupes, recherche globale, classement et statistiques n'y sont pas.
- **Piste** : dériver les domaines de `features/`, afficher la vraie somme, ajouter un repère « depuis V1.7 ».

### R13 Deux affirmations vont trop loin

- **Gravité** : moyenne
- **Constat** : « six familles de fautes qu'aucun linter du marché ne sait interdire » (`fr.ts` ligne 4217) : un développeur pensera à dependency-cruiser ou NetArchTest. Le README dit « navigation clavier vérifiée par axe », alors qu'axe ne teste pas le clavier (les tests clavier existent, à part).
- **Piste** : « que les linters courants ne couvrent pas tels quels » ; « navigation clavier testée, axe sur 29 vues ».

### R14 L'architecture hexagonale tient dans un seul projet .NET

- **Gravité** : moyenne
- **Constat** : `Domain`, `Application`, `Infrastructure` et `Controllers` sont des dossiers d'un seul csproj. Les frontières sont vérifiées par un script Node qui lit les `using` (`scripts/architecture/apiLayers.mjs`), pas par des références de projets ni par NetArchTest, ce qu'un lead .NET attend. Le projet `ToolGenDpKey` n'a pas le préfixe des autres.
- **Piste** : un test NetArchTest ou ArchUnitNET, ou justifier le choix d'un seul projet dans les choix techniques de `/tech`.

### R15 GitHub classe le dépôt en TypeScript

- **Gravité** : moyenne
- **Constat** : TypeScript 44,3 %, C# 43,6 %, Python 4,6 %. Le Python vient des maquettes, et les fichiers de traduction (478 Ko) suffisent à faire passer TypeScript devant. Pour un candidat backend .NET, c'est le mauvais premier signal.
- **Piste** : `.gitattributes` : `design/mockups/**` en `linguist-documentation`, les locales en `linguist-generated`.

### R16 Les pages légales sont incomplètes

- **Gravité** : moyenne
- **Constat** : les mentions légales n'ont ni adresse ni téléphone des hébergeurs ni directeur de la publication nommé. La politique de confidentialité n'a ni responsable de traitement, ni bases légales, ni sous-traitants (Google Cloud, Atlas, Resend, Sentry, GitHub, Ko-fi), ni transferts hors UE, ni recours auprès de la CNIL. Elle dit que la suppression « efface définitivement », alors que les sauvegardes mensuelles sont gardées 400 jours (`.github/workflows/backup-mongo.yml`).
- **Piste** : compléter les deux pages avec ces rubriques.

### R17 Le profil GitHub n'est pas à jour

- **Gravité** : moyenne
- **Constat** : il affiche encore l'ancienne entreprise, n'a ni statut « disponible » ni README de profil, épingle un seul dépôt, et son lien mène à l'accueil du site plutôt qu'à `/tech`.
- **Piste** : mettre à jour l'entreprise et la bio, écrire un README de profil, épingler 3 ou 4 dépôts, pointer vers `/tech`.

### R18 Le logo TypeScript de `/tech` affiche « tts »

- **Gravité** : basse
- **Où** : `apps/web/src/app/pages/tech/TechLogos.tsx` (lignes 70 à 84, un tracé en trop).

### R19 Branches mortes et liens de session morts

- **Gravité** : basse
- **Constat** : deux branches mortes sont publiques (`claude/confident-hypatia-6p17vi`, `auto-maintenance/2026-10-22`). 167 commits contiennent un lien de session Claude qui répond 403.

### R20 Le README a un mois de retard

- **Gravité** : basse
- **Constat** : ni groupes, ni listes multiples, ni recherche globale, ni classement, ni statistiques. Les sections Qualité et Déploiement sont des blocs de 100 à 150 mots. Le contrat OpenAPI cité (`artifacts/openapi-v1.json`) est ignoré par git et n'est servi nulle part.
- **Piste** : liste des fonctionnalités à jour, sections en puces, contrat publié.

### R21 La version anglaise est cachée et incomplète

- **Gravité** : basse
- **Constat** : la langue du navigateur est ignorée, l'anglais ne se choisit qu'au pied de page. En anglais, les titres de films restent en français, `/tech` mélange « 8,388 » et « 7 763 », et le README n'existe qu'en français.
- **Piste** : détecter la langue du navigateur, résumé anglais du README.

### R22 Racine et outillage bruités

- **Gravité** : basse
- **Constat** : 31 entrées à la racine, dont `logs/` (un `.gitkeep`) et `archive/`. Deux étapes de CI citent « roadmap § 31 » et « § 32 », qui n'existent plus (`ci-cd.yml` lignes 261 et 265). Le gabarit de PR et `CONTRIBUTING.md` demandent `verify:local`, qu'`AGENTS.md` déconseille avant un push.

### R23 Apostrophes et dates mélangées sur les pages publiques

- **Gravité** : basse
- **Constat** : CHANGELOG, releases et `/tech` mélangent apostrophes droites et courbes ; trois formats de date selon la page ; « recap » sans accent.

### R24 Le ton de `CONTRIBUTING.md`

- **Gravité** : basse (choix assumé)
- **Constat** : « tous droits réservés », et `CONTRIBUTING.md` ouvre sur « Les pull requests ne sont pas examinées ». Certains lecteurs y verront un ton défensif.

### R25 Alertes CodeQL ouvertes

- **Gravité** : basse (non visibles du public)
- **Constat** : 18 alertes ouvertes : 17 `cs/log-forging` et une `cs/exposure-of-sensitive-information` dans `UsageRecorder.cs`.

---

## M : mesures sur la production

### Scores Lighthouse

Deux passages par page séparés par « / ». Mobile : Moto G Power émulé, 4G lente. L'accessibilité et les bonnes pratiques sont à 100 partout ; le SEO n'échoue que sur les `noindex` voulus.

| Page | Mobile | Bureau | Ce qui pèse |
| --- | --- | --- | --- |
| `/` | 61 / 65 | 94 / 96 | LCP 11,3 / 5,9 s (une affiche) |
| `/decouvrir` | 91 / 92 | 99 / 100 | |
| `/film/1339713-obsession` | 54 / 48 | 95 / 95 | CLS 0,49 |
| `/u/ad0` | 53 / 57 | 88 / 95 | CLS 0,42 / 0,36 |
| `/tech` | 69 / 69 | 98 / 100 | TBT 833 / 757 ms |
| `/login` | 91 / 90 | 100 / 99 | |

Un seul passage en mobile : `/films/tendances` 74, `/serie/87108-chernobyl` 58 (CLS 0,49), `/u/ad0/listes` 70, `/nouveautes` 87, `/soutenir` 96. Sept pages mobiles sur onze sont sous le plancher de 85 de `configs/lighthouse-budgets.json`.

### M01 La fiche film et la fiche série sautent au chargement sur mobile

- **Gravité** : haute
- **Constat** : CLS de 0,49 sous Lighthouse, 0,37 revérifié avec le processeur ralenti 4 fois (la limite « mauvais » est 0,25). Tout le contenu descend d'environ 160 px quand les genres, les notes, les plateformes et les actions arrivent. Sur un ordinateur rapide, rien ne bouge.
- **Où** : `apps/web/src/app/pages/movie/MovieHero.tsx` (`HeroTitle`, bloc `details`), `MoviePage.tsx`.
- **Piste** : réserver la hauteur de ces blocs pendant le chargement, ou rendre le héros depuis les données que le document servi par l'API connaît déjà.

### M02 Le profil public saute aussi, selon les passages

- **Gravité** : moyenne
- **Constat** : CLS de 0,06 à 0,42 sur mobile selon les passages, jusqu'à 0,19 sur ordinateur. La section des films, chargée à part, s'insère au-dessus des statistiques déjà affichées.
- **Où** : `apps/web/src/features/profile/pages/ProfilePage.tsx` (`lazy(ProfileMoviesSection)` dans un `Suspense` sans fallback).
- **Piste** : un squelette à la hauteur de la section, ou un import statique.

### M03 La porte Lighthouse mesure une production qui n'existe pas

- **Gravité** : haute
- **Constat** : c'est le premier chiffre qu'un recruteur obtient en lançant Lighthouse sur le site, et la CI ne peut pas le voir. Le stub de `scripts/lighthouse-run.mjs` donne `posterPath: null` à tous les films (l'accueil n'a aucune affiche), le profil mesuré est vide, et `URLS` ne contient ni `/tech`, ni `/decouvrir`, ni fiche film, ni catalogue. M01, M02, M04, M08 et M10 lui sont invisibles par construction.
- **Piste** : de vraies affiches et un profil rempli dans le stub, `/tech`, une fiche film et `/films/tendances` dans `URLS`. Ne pas desserrer la porte (I4).

### M04 Sur mobile, l'élément LCP de l'accueil est une affiche, pas le titre de la coquille

- **Gravité** : moyenne
- **Constat** : le titre peint par la coquille arrive en premier, puis une affiche plus grande le remplace comme élément LCP (5,9 à 11,3 s). Le gain de la contrainte C2 ne tient qu'avec le stub sans affiches.
- **Où** : `apps/web/index.html`, `apps/web/src/features/movies/components/ShowcaseMovieCard.tsx`.
- **Piste** : mesurer d'abord avec de vraies affiches (M03), puis choisir une première rangée moins haute que le titre sur mobile ou une affiche annoncée dès le document.

### M05 Les affiches relayées par l'API sont toujours en w500

- **Gravité** : moyenne
- **Constat** : 16 vignettes de profil pèsent 1,29 Mo ; une affiche de 500 x 750 s'affiche en 40 x 60 sur l'accueil.
- **Où** : `apps/api-dotnet/MoviePicker.Api/Application/Posters/TmdbPosterUrlNormalizer.cs` (`PreferredPosterSize`), `apps/web/src/shared/utils/posterUrl.ts` (ne réécrit que `image.tmdb.org`).
- **Piste** : accepter w92, w185 et w342 dans le relais et demander la taille d'affichage par un `srcset`.

### M06 Le service worker précharge 869 Ko pendant le premier chargement

- **Gravité** : moyenne
- **Constat** : 277 fichiers dès 0,4 s, en concurrence avec les affiches. On y trouve Sentry (124 Ko), l'image de partage (97 Ko), PostHog (84 Ko, même quand l'audience est refusée), l'anglais (51 Ko), les notes de version, et 5 doublons.
- **Où** : `apps/web/vite.config.ts` (`VitePWA`, `globPatterns`, `includeAssets`), `apps/web/src/app/components/PwaAutoUpdate.tsx`.
- **Piste** : enregistrer le worker après le chargement des images, et exclure ces fichiers par `globIgnores`.

### M07 La première visite de l'accueil pèse 2,5 Mo pour 460 requêtes sur mobile

- **Gravité** : moyenne
- **Constat** : 74 images avant tout défilement ; 2,9 Mo et 489 requêtes sur ordinateur. Le nombre de scripts est un compromis mesuré (I1, I10), le poids des images ne l'est pas.
- **Piste** : charger les rangées sous la ligne de flottaison à l'approche, et des vignettes à leur taille (M05).

### M08 `/tech` bloque le fil principal sur mobile

- **Gravité** : moyenne
- **Constat** : TBT de 760 à 830 ms, 2 943 éléments, une tâche de 646 ms. C'est la page qu'ouvre un recruteur technique.
- **Piste** : différer le rendu des sections hors écran, ou ne pas hydrater le contenu statique prérendu.

### M09 Le HTML brut des profils et des catalogues annonce l'accueil

- **Gravité** : moyenne
- **Constat** : sans JavaScript, `/u/*`, `/nouveautes` et `/films/collection|streaming|theme|similaires` portent le titre, la description, `og:url` et le canonical de l'accueil. 28 adresses du sitemap sont concernées, et un profil partagé sur WhatsApp ou LinkedIn s'affiche comme l'accueil.
- **Où** : `apps/web/index.html` (canonical et `og:url` en dur), `infra/firebase-hosting.json`.
- **Piste** : servir `/u/*` par l'API comme `/film/*`, ou au minimum retirer le canonical et `og:url` de la coquille générique.

### M10 L'image LCP est chargée en différé sur les catalogues et les listes

- **Gravité** : moyenne
- **Constat** : `loading="lazy"` sur la première affiche de `/films/tendances` (mobile 74) et de `/u/*/listes` (mobile 70), alors que l'accueil la charge déjà en priorité.
- **Où** : `apps/web/src/app/pages/ShowcaseListPage.tsx`, `MovieBrowseCard.tsx`, `apps/web/src/features/movies/components/MovieCollectionCard.tsx` (ligne 105).
- **Piste** : faire comme `HomeForYou` (`eagerCount`).

### M11 Preconnect inutile vers TMDB, absent vers l'API

- **Gravité** : basse
- **Constat** : `crossorigin` sur le preconnect de `image.tmdb.org` le rend inutile ; Lighthouse estime 340 ms de gain avec un preconnect vers l'API.
- **Où** : `apps/web/index.html` (lignes 8 et 9).

### M12 Zones défilantes inaccessibles au clavier sur mobile

- **Gravité** : basse
- **Constat** : axe signale `scrollable-region-focusable` sur la distribution de la fiche film et sur les 15 figures de `/tech`. Ce sont les seules violations axe de l'audit.
- **Où** : `apps/web/src/app/pages/movie/MovieSections.tsx` (ligne 180), `apps/web/src/app/pages/tech/TechBlocks.tsx` (`Figure`).
- **Piste** : `tabIndex={0}`, `role="region"` et un libellé.

### M13 La bande-annonce ne se ferme plus avec Échap

- **Gravité** : basse
- **Constat** : une fois le focus dans le lecteur YouTube, Échap ne ferme plus la fenêtre (l'iframe capte la touche).
- **Où** : `apps/web/src/features/movies/components/TrailerModal.tsx`.
- **Piste** : un bouton « Fermer » atteignable juste après le lecteur.

### M14 `/login` et `/register` : un `noindex` que Google ne verra jamais

- **Gravité** : basse
- **Constat** : `robots.txt` bloque ces deux pages, donc leur `noindex` n'est jamais lu, et elles peuvent être indexées sans contenu.
- **Où** : `apps/web/public/robots.txt`.

### M15 `<meta charset>` après le 1 024e octet

- **Gravité** : basse
- **Constat** : la meta CSP est insérée avant le charset, sur la coquille et les documents de l'API.
- **Où** : `apps/web/vite.config.ts` (`cspMetaPlugin`).

### M16 Titres et métadonnées

- **Gravité** : basse
- **Constat** : « Soutenir Movie Picker | Movie Picker » répète la marque ; la connexion, l'inscription, le mot de passe oublié et les pages légales partagent une description générique ; la fiche film a `og:type=website` et une affiche portrait dans une carte `summary_large_image`, recadrée par X.

### M17 Pas de `security.txt`

- **Gravité** : basse
- **Constat** : `/.well-known/security.txt` répond 200 avec la coquille HTML, alors que `SECURITY.md` existe.
- **Piste** : publier un `security.txt` (RFC 9116) dans `apps/web/public/.well-known/`.

### M18 HSTS `preload` annoncé, jamais soumis

- **Gravité** : basse
- **Constat** : le domaine est éligible mais absent de la liste.
- **Piste** : le soumettre, ou retirer `preload`.

### M19 Petits écarts de l'API

- **Gravité** : basse
- **Constat** : pas de `Vary: Origin` sur des réponses CORS mises en cache ; `http` redirige en 302 ; pas de `robots.txt` sur `api.movie-picker.fr` ; un 400 rendu en HTML vide au lieu du JSON d'erreur ; `/health/ready` public, qui fait un ping MongoDB à chaque appel anonyme.

### M20 CSP sans canal de rapport, COOP et CORP absents

- **Gravité** : basse
- **Constat** : `style-src 'unsafe-inline'`, ni `report-to` ni `report-uri`, pas de `Cross-Origin-Opener-Policy`. Observatory donne quand même A+ aux deux domaines.

### M21 Manifeste PWA

- **Gravité** : basse
- **Constat** : `orientation: portrait` imposée, ni `id` ni `screenshots`, `start_url` sur `/my-events` (l'état déconnecté pour qui installe avant de s'inscrire), `theme_color` sombre alors que la meta est claire.
- **Où** : `apps/web/vite.config.ts` (bloc `manifest`).

### M22 Sentry envoie une session avant tout choix de consentement

- **Gravité** : basse
- **Constat** : une enveloppe de session part environ 10 s après le chargement d'une première visite. Aucun cookie n'est posé, mais la politique de confidentialité ne parle que d'erreurs.
- **Où** : `apps/web/src/shared/observability/sentry.ts`, `fr.ts` (ligne 3375).
- **Piste** : mentionner sessions et traces dans la politique, ou couper `browserSessionIntegration`.

### M23 `/nouveautes` fait 82 000 px de haut sur mobile

- **Gravité** : basse
- **Constat** : 572 entrées sur une seule page.
- **Piste** : les dernières versions, le reste replié.

### M24 Une soirée introuvable fait un appel inutile

- **Gravité** : basse
- **Constat** : `/e/<inconnu>` interroge aussi `/movies` et laisse 3 erreurs dans la console.

### M25 Rendus extrêmes

- **Gravité** : basse
- **Constat** : l'image de fond de la fiche film (w780, sans `srcset`) est étirée 3,3 fois à 2 560 px ; à cette largeur, 57 % de l'écran reste vide ; sur iPad en portrait, la carte de la roue de l'accueil est tassée.
- **Où** : `apps/web/src/app/pages/movie/movieView.ts` (`backdropSrc`).

### M26 Lighthouse « Agentic Browsing » à 50

- **Gravité** : basse (information)
- **Constat** : nouvelle catégorie de Lighthouse 13.5 ; pas de `llms.txt`.

### Déjà connus, revérifiés en production

DEBT-043 (soft 404), DEBT-048 (CAA et DMARC), DEBT-054 (le certificat a été renouvelé le 2026-11-22 : l'entrée est à mettre à jour), DEBT-007, DEBT-006, C15, I1 et I10, et V04, V05, V10, V11, V14, V15 (10 profils vides sur 28 dans le sitemap) et V16 (l'élision manque aussi dans les descriptions).

---

## C : ce que trouve un développeur qui essaie de casser l'application

### C01 Une faute sur l'année dans les paramètres termine la soirée pour de bon

- **Gravité** : haute
- **Constat** : en hôte, saisir `04/12/2025` au lieu de 2026 dans « Paramètres de la soirée ». Le champ affiche une simple aide (« Soirée prévue il y a 11 mois »), enregistre tout seul et prévient les participants. La soirée passe « Terminée », sans roue ni proposition, et le bouton des paramètres disparaît. Impossible de revenir en arrière : l'API répond 409.
- **Où** : `apps/web/src/features/events/components/HostEventDateField.tsx` (aucun `min`), `useHostEventSettingsDraft.ts`, `apps/api-dotnet/MoviePicker.Api/Application/UseCases/EventConfiguration/PatchEventConfigHandler.cs` (`EnsurePatchAllowed` ne regarde que l'état d'avant le changement).
- **Piste** : refuser côté API une nouvelle date qui termine une soirée à venir, et afficher une erreur dans le champ.

### C02 Créer une soirée datée de plus de 7 jours en arrière donne une soirée morte-née

- **Gravité** : moyenne
- **Constat** : une date tapée au clavier contourne le `min` du calendrier. La création réussit avec « vos amis rejoignent la soirée », puis « options non enregistrées », et la page affiche « Terminée ». L'API accepte aussi l'an 1900 et l'an 9999 (« Commence dans 2912116 j »).
- **Où** : `create-event/CreateEventWhen.tsx`, `apps/web/src/features/events/lib/createEventValidation.ts`, `CreateEventHandler.cs`.
- **Piste** : erreur bloquante avant la fenêtre de clôture automatique, bornes d'année côté API.

### C03 Le titre d'un film proposé est celui qu'envoie le navigateur

- **Gravité** : moyenne
- **Constat** : un participant peut envoyer `tmdbId: 550` avec le titre et l'année de son choix (jusqu'à 500 caractères). Ce texte s'affiche dans la liste, sur la roue et dans la notification envoyée à tous les participants, push compris. Rien ne s'exécute (React échappe), mais n'importe qui fait dire ce qu'il veut à l'application.
- **Où** : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/AddMovie/AddMovieHandler.cs` (prend `request.Title` et `request.Year`), `Application/DTOs/TmdbTitleRequest.cs`.
- **Piste** : relire titre, année et affiche chez TMDB à partir du `tmdbId`, comme le prévoit DEBT-072 pour les favoris.

### C04 Un caractère de contrôle dans un nom retourne le texte de l'application

- **Gravité** : moyenne
- **Constat** : un nom affiché qui commence par U+202E retourne la phrase de la notification (« 🎉 ! eérios al erdniojer ed tneiv … »). Un titre fait de caractères de largeur nulle crée une soirée sans titre visible.
- **Où** : `AuthInputValidation.cs` (`ValidateDisplayName`), validation des noms de groupe et des titres de soirée, `NotificationsPage.tsx` (aucun `<bdi>`).
- **Piste** : retirer les contrôles bidirectionnels côté serveur, refuser un texte vide après retrait des caractères invisibles, entourer les noms de `<bdi>`.

### C05 Une session expirée n'est jamais annoncée

- **Gravité** : moyenne
- **Constat** : un vote après expiration affiche « Authentification requise. » avec un « Réessayer » qui échoue à chaque fois ; l'en-tête garde l'avatar. Sur « Modifier le profil », la page bascule sur l'état déconnecté et la bio tapée est perdue.
- **Où** : `apps/web/src/app/appQueryClient.ts` (`recheckSessionOn401` n'écoute que React Query), `useEventMovieVoting.ts`, `ProfileEditPage.tsx`.
- **Piste** : détecter tout 401 dans `fetchApi`, et un message « Votre session a expiré » qui garde `returnTo` et le brouillon.

### C06 La recherche sans résultat parle d'une « sélection »

- **Gravité** : moyenne
- **Constat** : « Aucun film dans cette sélection pour le moment. Revenez plus tard… », le texte des vitrines d'Explorer. Et la boîte de recherche de la page filtre les 20 films chargés au lieu de relancer la recherche (« 1 films sur 20 »).
- **Où** : `apps/web/src/app/pages/ShowcaseListStates.tsx`, `ShowcaseListPage.tsx`.
- **Piste** : des états vide et erreur propres à la recherche, et une boîte qui relance la recherche.

### C07 Un vote lent ne montre rien

- **Gravité** : moyenne
- **Constat** : pendant 10 s, ni bouton enfoncé ni indicateur ; un second clic renvoie ou annule le vote selon le moment de la réponse.
- **Où** : `eventMovieCardParts.tsx` (`VoteBar`), `useEventMovieVoting.ts`.
- **Piste** : état optimiste qui réutilise `pendingVote`, annulé en cas d'échec.

### C08 Les textes longs sans espace débordent

- **Gravité** : basse
- **Constat** : fenêtre « Soirée créée », sous-titre de « Proposer un film », notifications, pastille de participant, en-tête de « Modifier le profil », titre « Résultats pour « … » ».
- **Piste** : `overflow-wrap: anywhere` sur tout texte saisi par un utilisateur.

### C09 Un participant retiré n'est pas prévenu et peut revenir aussitôt

- **Gravité** : basse
- **Où** : `EventParticipantsList.tsx`, cas d'usage `RemoveParticipant` et `JoinEvent`.

### C10 Le brouillon de « Nouvelle soirée » disparaît à l'actualisation

- **Gravité** : basse
- **Où** : `create-event/CreateEventDialog.tsx`.

### C11 La roue : focus perdu, et 10 s de tirage pour un seul film

- **Gravité** : basse
- **Constat** : après le résultat, le focus tombe sur `body`. Avec un seul film, la roue tourne 10 s sur une part unique, sans moyen de passer.
- **Où** : `WheelModal.tsx`, `EventWheelActions.tsx`.

### C12 Une date absurde s'affiche « Enregistré » sans l'être

- **Gravité** : basse
- **Constat** : une année à six chiffres donne « Soirée prévue dans 200 494 ans » et le badge « Enregistré », sans envoi ni erreur.
- **Où** : `HostEventDateField.tsx`, `hostEventSettingsDraft.ts`.

### C13 Formulaires de compte inégaux

- **Gravité** : basse
- **Constat** : bulles natives du navigateur (dans sa langue) à côté des messages de l'application ; un pseudo fait d'espaces donne une erreur générique ; une adresse sans domaine de premier niveau est acceptée (lié à DEBT-065) ; aucun bouton pour afficher le mot de passe.
- **Où** : `RegisterPage.tsx`, `LoginPage.tsx`, `AuthInputValidation.cs`.

### C14 Un lien de réinitialisation invalide ne se signale qu'après la saisie

- **Gravité** : basse
- **Constat** : le formulaire s'affiche, puis « Lien invalide ou expiré » arrive après avoir tapé deux fois le mot de passe. Sans jeton : « aucun token fourni ».
- **Où** : `apps/web/src/features/auth/pages/ResetPasswordPage.tsx`.

### C15 `Retry-After` ignoré, 503 de la plateforme mal nommé

- **Gravité** : basse
- **Constat** : un 429 avec `Retry-After: 30` propose de réessayer tout de suite ; un 503 en HTML (forme d'une erreur Cloud Run) s'affiche comme une erreur serveur.
- **Où** : `apps/web/src/shared/api/client.ts` (`handleErrorResponse`, `statusMessage`).

### C16 Le retour après connexion perd l'ancre de la page

- **Gravité** : basse
- **Constat** : `/settings/profil#favoris` ramène à `/settings/profil`.
- **Où** : `SignedOutState.tsx`, `SessionGate.tsx`.

### C17 L'avertissement de suppression du compte n'annonce pas tout

- **Gravité** : basse
- **Constat** : il ne parle ni des listes, ni des groupes, ni de la liste À voir, ni des films vus.
- **Où** : `fr.ts` (`deleteAccountDescription`).

### C18 Deux onglets de l'hôte : le second affiche le gagnant et une erreur

- **Gravité** : basse
- **Constat** : « Modifié entre-temps. Rechargez la page et réessayez. » au-dessus d'un gagnant déjà reçu.
- **Où** : `EventActionErrorBanner.tsx`, `useEventWheel.ts`.

### C19 L'heure d'une soirée ne dit pas son fuseau

- **Gravité** : basse
- **Constat** : depuis un navigateur réglé sur New York, l'heure affichée est celle de Paris, sans le dire.
- **Où** : `apps/web/src/shared/utils/eventScheduled.ts`. Voisin de DEBT-041.
- **Piste** : « heure de Paris » quand le fuseau du navigateur est différent.

### C20 Accords et mots techniques

- **Gravité** : basse
- **Constat** : « 1 films sur 20 » (`filteredCount`), « 20 résultat(s) » (`a11yResultsCount`, ligne 1435), « Afficher 4 plateforme(s) supplémentaire(s) » (`showMoreAria`, ligne 1604), « Voir le profil de Alice » sans élision, « token » et « handle » dans des textes publics.
- **Où** : `apps/web/src/shared/i18n/locales/fr.ts`.

---

## Ce qui va bien

- **Le parcours principal fonctionne de bout en bout** : création de soirée claire (dates en un clic, nom prérempli), fenêtre « Soirée créée » avec lien, calendrier et proposition, présence « 2 en ligne », notifications justes, accueil « Votre prochaine soirée », notation en demi-étoiles, création de groupe et invitation par lien.
- **Comptes** : lien de réinitialisation à usage unique, comptes Google et GitHub détachés annoncés, messages identiques pour un mauvais mot de passe et un e-mail inconnu, `autocomplete` correct, export JSON complet, suppression qui anonymise sans casser les soirées des autres.
- **Robustesse** : un seul envoi sur tous les doubles clics (soirée, rejoindre, proposer, liste, groupe, roue), échappement partout (titres, notifications, roue, aperçus, `.ics`), messages d'erreur en français avec « Réessayer », votes mis en file hors ligne puis rejoués, mise à jour en direct entre onglets, `returnTo` qui refuse les redirections externes, pseudos qui refusent les homoglyphes, limites de soirée appliquées et expliquées.
- **Clavier et accessibilité** : Lighthouse à 100, aucune violation axe sur 18 pages sur 20, lien d'évitement, focus visible sur 274 arrêts, fenêtres qui gardent le focus et le rendent, gagnant annoncé aux lecteurs d'écran, notation au clavier.
- **Sécurité HTTP** : Mozilla Observatory A+ sur `www` et `api`, TLS 1.2 et 1.3, HTTP/2 et 3, CSP des scripts par empreintes, CORS strict, aucun cookie sur une réponse publique, PostHog jamais chargé sans accord.
- **Rendu** : aucun débordement à 320 px, sur iPhone et iPad en WebKit, ni à 2 560 px ; aucune erreur console hors `/e/<inconnu>` ; bureau entre 88 et 100 en performance.
- **Qualité du code vue par un recruteur** : SonarCloud A partout, aucune issue, 0,0 % de duplication, 92,5 % de couverture ; aucun `TODO`, contrôleurs minces, `CancellationToken` propagé, limitation de débit sur chaque route ; 96 % des commits au format Conventional Commits ; chaîne de livraison sérieuse (recette, identités sans clé, Terraform, sauvegardes vérifiées, CodeQL, gitleaks, Trivy) ; `SECURITY.md`, gabarits d'issue, CHANGELOG, `/nouveautes` ; README dont les 26 liens répondent, démarrage local avec un compte de démo.

## Non vérifié

- Le clavier virtuel sur mobile : sur iPhone 13, « Créer la soirée » est en bas de la feuille et risque d'être masqué si la feuille ne suit pas `visualViewport`.
- Le rechargement hors ligne avec le vrai service worker (bloqué pendant les tests locaux).
- Le texte réel des notifications push (déduit du code pour C03 et C04).
- Les données de terrain (CrUX) et le démarrage à froid de Cloud Run.
