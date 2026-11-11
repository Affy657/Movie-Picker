---
name: dev-feature
description: Flow de dev complet d'une feature roadmap Movie Picker, de la lecture du scope à la mise en production. Déclenché avec « /dev-feature <nom de la feature> ». L'argument est le nom (ou un extrait) d'une feature présente dans la roadmap (docs/roadmap.md).
---

# /dev-feature : flow de dev d'une feature

Orchestre le cycle complet d'une feature, du scope à la mise en production, en flux continu : une branche courte partie de `master`, fusionnée et mise en ligne le jour où la feature est prête, avec sa propre version. L'argument `$ARGUMENTS` est le nom de la feature à développer.

Les règles de style et de workflow du repo (zéro commentaire, CI de master comme porte, jamais skip les hooks) sont dans [AGENTS.md](../../../AGENTS.md) : les respecter, ne pas les redéfinir ici.

**Trois règles qui structurent tout le flow :**
- Le test est écrit avant le code : la phase de dev (étape 5) est en TDD, et le compte rendu fonctionnel (étape 3) fournit la liste des tests.
- Les suites de tests lourdes se lancent **juste avant le commit** (étape 8), jamais à la fin du dev.
- Le commit et le push n'ont lieu **qu'après** que l'utilisateur a testé la feature lui-même et donné son go. Ce go vaut aussi pour la mise en production : la feature validée part en ligne dans la foulée (étape 9).

Chaque **STOP** est un vrai arrêt : terminer le message, ne rien coder ni continuer le flow, reprendre uniquement quand l'utilisateur a répondu.

## Étape 1. Lire la feature

- Chercher `$ARGUMENTS` dans [docs/roadmap.md](../../../docs/roadmap.md), sections planifiées puis backlogs.
- Si rien ne correspond, ne pas inventer : lister les entrées approchantes trouvées et demander laquelle.
- Avant d'écrire quoi que ce soit, se placer sur une branche courte partie de `master` à jour : `git fetch origin` puis `git switch -c feat/<slug> origin/master` (dans un worktree, la branche du worktree fait l'affaire si elle part de `origin/master`). Aucune branche de version : la feature rejoint `master` à l'étape 8 et part en production à l'étape 9.

## Étape 2. Cadrage

La roadmap ne donne qu'un titre et une à deux phrases : poser les questions nécessaires pour partir dans la bonne direction. Lire d'abord le code existant de la zone touchée pour ne pas poser de question dont la réponse s'y trouve, et les sections Contraintes et Impasses de `docs/technical-debt.md` si la feature touche la coquille de démarrage, le prérendu ou la home. Reformuler brièvement ce qui a été compris, puis poser les questions ouvertes : UX, comportement aux limites, scope, interactions avec une autre feature.

**Découper avant de construire.** Une entrée `L` ou `XL` ne se développe pas d'un bloc : proposer un découpage en tranches qui ont chacune un sens pour l'utilisateur et partent en production seules, la plus petite utile d'abord. La première tranche devient le périmètre de ce flow, les suivantes restent dans la roadmap sous forme d'entrées plus petites. Une tranche qui n'a pas de sens visible seule (un modèle de données sans écran) se livre quand même si elle ne change rien pour l'utilisateur, sinon elle se fond dans la tranche suivante.

**STOP.** Attendre les réponses.

## Étape 3. Compte rendu fonctionnel

Une fois les réponses du cadrage obtenues, rédiger dans le chat un compte rendu fonctionnel de la feature. Il sert de contrat : c'est de lui que sortent les tests de l'étape 5, et la maquette de l'étape 4 le met en image. Charger `product-management:write-spec` pour ses guides d'écriture (user stories, critères d'acceptation, hors périmètre), sans rejouer son questionnaire, le cadrage est déjà fait, et réduit aux sections qui comptent pour une feature de cette taille :

1. **Ce que fait la feature** : le comportement nominal, écrit du point de vue de l'utilisateur, rôle par rôle quand ils diffèrent (hôte et participant dans une soirée, connecté et visiteur sans compte sur les pages publiques).
2. **Cas à la marge**, un par ligne, avec le comportement attendu pour chacun. Passer systématiquement la liste : état vide, valeur limite (minimum, maximum, doublon), droits (qui peut, qui ne peut pas, et ce que voit celui qui ne peut pas), soirée déjà clôturée ou expirée, action concurrente de deux participants, échec réseau ou API en cours d'action, mobile, FR et EN, données existantes créées avant la feature.
3. **Hors périmètre** : ce que la feature ne fait volontairement pas, une ligne chacun, pour couper court aux « tant qu'on y est ».
4. **Critères d'acceptation** en Given / When / Then, un par comportement, cas à la marge compris. Chaque critère doit être testable seul : c'est la liste des tests à écrire.
5. **Questions ouvertes**, seulement celles que le cadrage n'a pas tranchées.

Rester sur le comportement, jamais sur l'implémentation (pas de nom de composant, d'endpoint ni de schéma). Le compte rendu vit dans le chat, pas dans le dépôt : ses critères d'acceptation deviennent les tests de l'étape 5, qui en sont la trace versionnée.

**STOP.** Attendre la validation du compte rendu, itérer dessus jusqu'au go.

## Étape 4. Maquettage (conditionnel)

Décider d'abord si l'étape s'applique. **Sauter le maquettage** dans ces cas :
- la feature ne touche pas au front (API seule, infra, CI, script) ;
- le changement front est petit et localisé (un libellé, un champ de plus dans un formulaire existant, un bouton dans un composant déjà en place) ;
- l'utilisateur a déjà décrit précisément le rendu attendu, ou fourni une maquette ou une capture annotée.

Sinon (nouvel écran, refonte de page, nouveau composant structurant, changement de hiérarchie visuelle), produire une maquette **avant** d'écrire du code :
- Charger `artifact-design`, puis publier une page HTML autonome en Artifact, reprenant les jetons de design du projet (`apps/web/src/styles/01-foundation.css`) pour que la maquette ressemble à l'app et pas à un wireframe générique.
- Couvrir les deux formats, PC et mobile, chaque écran maquetté dans les deux : ce n'est pas la même mise en page réduite, c'est la navigation, la barre du bas et les feuilles mobiles (`Sheet`) qui changent.
- Montrer les états qui comptent (vide, chargé, hôte / participant), pas seulement le cas nominal : les cas à la marge du compte rendu disent lesquels.
- Réutiliser les composants existants de l'app plutôt que d'en inventer : vérifier dans `apps/web/src/shared/components/` et dans la feature la plus proche s'il existe déjà une pastille, un menu ou un bouton pour ce besoin.
- Les libellés de la maquette sont les libellés définitifs : les passer par `design:ux-copy` (ton, longueur, message d'erreur, état vide), en FR, l'EN suivant au dev.
- Avant de la présenter, la passer au crible de `design:design-critique` (et `design:accessibility-review` pour un nouvel écran) et corriger ce qui en sort. Annoter les partis pris restants et lister explicitement les points à trancher, en proposant des variantes quand un choix est ouvert plutôt que d'imposer une option.

**STOP.** Terminer le message avec le lien de la maquette et attendre les retours. Itérer jusqu'à ce que l'utilisateur valide.

## Étape 5. Dev en TDD

Le test est écrit avant le code, et le compte rendu de l'étape 3 dit lesquels : chaque critère d'acceptation devient un test avant de devenir du code.

1. **Plan de tests.** Avec `engineering:testing-strategy`, dériver du compte rendu la liste des tests et la couche de chacun : domaine ou use case (`apps/api-dotnet/MoviePicker.Api.Tests`), endpoint HTTP (`MoviePicker.Api.IntegrationTests`), hook ou composant front (`*.test.ts(x)` à côté du fichier), parcours Playwright (`e2e/`) seulement pour un parcours multi-pages que les tests de composant ne peuvent pas observer, sur le modèle des specs existantes. Chaque cas se teste au niveau le plus bas capable de l'observer, pas de test e2e pour ce qu'un test unitaire couvre. Poser ce plan en quelques lignes dans le chat et enchaîner, sans STOP.
2. **Cycle rouge, vert, refacto, un critère à la fois.** Écrire le test, le lancer et le voir échouer pour la bonne raison (une assertion qui décrit le comportement attendu, pas une erreur de compilation ni d'import), écrire le minimum qui le fait passer, le relancer vert, refactoriser sans changer le comportement. Jamais d'implémentation avant son test, y compris pour un bug rencontré en route : le test reproduit d'abord le symptôme.
3. **Ordre des couches.** API d'abord (domaine, use case, endpoint), puis `pnpm run openapi:export && pnpm run openapi:types` pour que le front voie le contrat, front ensuite. Pour une feature front seule, commencer par la logique pure ou le hook, finir par le composant.
4. **Lancers ciblés uniquement** : `pnpm --filter web exec vitest run <chemin>`, `dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj --filter "FullyQualifiedName~<Classe>"` (même forme pour `IntegrationTests`), `pnpm --filter web exec tsc --noEmit`, `pnpm exec eslint <fichiers touchés>` depuis la racine. Pas de suite complète, pas de `test:coverage`, pas de `verify:local` : la CI de master joue tout.
5. **Règles du repo les plus coûteuses à rattraper** : primitives de `shared/components/` avant tout CSS ou composant local, éditer l'existant plutôt que créer, aucun commentaire, tout libellé utilisateur dans les deux locales (`fr.ts`, `en.ts`) et passé par `design:ux-copy` s'il n'a pas été fixé à la maquette.

## Étape 6. Lancer front + back pour test manuel

Démarrer les deux serveurs en tâche de fond (config dans [.claude/launch.json](../../launch.json), procédure et pièges dans `/verify`) :
- **web** : `pnpm --filter web dev` (http://localhost:5173)
- **api** : `dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj` (http://localhost:4000)

Vérifier que les deux démarrent sans erreur (logs), puis **tester la feature à la main avant de rendre la main**, dans le Browser pane avec le compte `dev@test.local`, sur PC puis sur mobile (`resize_window`), et ne passer à l'utilisateur qu'après avoir contrôlé les cinq points :
1. **rien d'oublié** : reprendre les critères d'acceptation du compte rendu un par un et jouer chacun, cas à la marge compris, pas seulement le parcours nominal ;
2. **conforme à la maquette** : mêmes écrans, mêmes états, mêmes libellés, mêmes positions, capture à l'appui sur les écrans qui ont été maquettés ;
3. **pas d'affichage bizarre** : texte coupé ou débordant, élément décalé ou mal centré, espace vide, défilement horizontal, état de survol collé sur mobile, thème sombre, et console du navigateur sans erreur ;
4. **composants de l'app** : relire le diff front et vérifier que chaque bouton, pastille, champ, modale, menu ou état de page passe par la primitive de `apps/web/src/shared/components/` (tableau dans AGENTS.md) ou par un composant existant de la feature, pas par un équivalent local réécrit pour l'occasion. Un composant parallèle se remplace avant de rendre la main ;
5. **iPhone** : rejouer chaque écran mobile touché dans WebKit avec Playwright, capture à l'appui, comme le décrit AGENTS.md § Compatibilité iPhone et iPad, et passer sa liste de pièges sur le diff. Le Browser pane ne montre que Chromium.

Corriger ce qui sort de ces contrôles (par un test d'abord quand c'est du comportement), puis donner les URLs à l'utilisateur, lui dire ce qu'il y a à tester et laisser les serveurs allumés.

**STOP.** Si l'utilisateur signale un problème : écrire d'abord le test qui le reproduit (règle TDD), corriger, relancer les serveurs, lui demander de re-tester, et STOP à nouveau. Un `dotnet test` pendant que l'API de dev tourne meurt sur le verrou du binaire (MSB3027) : arrêter l'API avant, la relancer après. Si la cause n'est pas évidente, dérouler `engineering:debug` (reproduire, isoler, diagnostiquer) plutôt que d'essayer des correctifs au hasard. Répéter jusqu'à ce qu'il donne explicitement son go.

## Étape 7. Revue et roadmap

- Invoquer `engineering:code-review` (bugs de correctness) puis `/simplify` (réutilisation, simplification) ; `/security-review` en plus dès que la feature touche l'authentification, les droits, un nouvel endpoint ou une entrée utilisateur. Appliquer les retours pertinents (un bug relevé en revue passe par un test qui le reproduit d'abord), relancer les tests ciblés, et rejouer les cinq contrôles de l'étape 6 si le diff a bougé de façon notable ; si le comportement visible a changé, redonner la main à l'utilisateur pour re-tester, avec STOP, avant de continuer.
- Retirer la feature de `docs/roadmap.md` : une entrée livrée sort du fichier, le CHANGELOG et git portent l'historique. Une tranche livrée réécrit l'entrée sur ce qui reste à faire, taille comprise. Mettre à jour le poids du titre de section qui la portait.
- Ajouter la ligne de la feature sous `## [Non publié]` de `CHANGELOG.md`, dans la bonne rubrique (`Added` pour une nouveauté, `Changed`, `Fixed`, `Security`), au format des lignes voisines : `- **Ce que l'utilisateur obtient** : précision.`, côté utilisateur, sans détail d'implémentation. C'est cette rubrique qui fixe la version à l'étape 8 : `Added` donne une version mineure, le reste un correctif.
- « Quoi de neuf » (`apps/web/src/shared/whatsNew.ts`) ne s'enrichit que pour une nouveauté qui mérite d'interrompre l'utilisateur à sa prochaine visite : une nouvelle version dans `WHATS_NEW` rouvre la fenêtre chez tout le monde. L'écrire sous la version mineure qui suit `APP_VERSION` de `origin/master`, l'étape 8 corrigeant ce numéro si `release` en annonce un autre ; jamais au-delà de `APP_VERSION` une fois la release faite (test `whatsNew.test.ts`). Un correctif ou une retouche n'y va pas.
- Une dette repérée en route va dans `docs/technical-debt.md`, jamais dans la roadmap ni en mémoire.

## Étape 8. Tests, version, fusion dans master

Dans cet ordre, et seulement une fois le go de l'utilisateur obtenu à l'étape 6 :

- Arrêter les serveurs de dev et fermer l'onglet du Browser pane avant de lancer les suites : les laisser tourner sature le CPU, provoque de faux échecs par timeout, et le binaire verrouillé fait mourir le build API (MSB3027).
- Commit de la feature sur sa branche (code, tests, roadmap et ligne de CHANGELOG en un seul commit, message en anglais au format Conventional Commits `feat(<scope>): …` d'AGENTS.md).
- Intégrer à `master` à jour : `git fetch origin`, `git switch -c integrate/<slug> origin/master`, `git merge --no-ff feat/<slug>` (depuis le checkout principal, `git switch master && git pull` puis la même fusion). La version se calcule toujours sur `master` à jour, jamais avant : deux sessions qui livrent en parallèle obtiennent ainsi deux numéros distincts sans conflit.
- `pnpm run release` : il lit `## [Non publié]`, annonce la version (`Added` donne une mineure, le reste un correctif, rien de listé aucune version) et réécrit `CHANGELOG.md` et `APP_VERSION`. Corriger au besoin le numéro de la version ajoutée à `WHATS_NEW` à l'étape 7, puis commit `chore(release): X.Y.Z`. `pnpm run release -- --major` seulement sur décision de l'utilisateur.
- Pas de `verify:local` : les lancers ciblés de l'étape 5 et le hook pre-push suffisent avant le push, la CI de master joue le reste (AGENTS.md). Jamais skip les hooks. Dans un worktree neuf ou ancien, `pnpm install --frozen-lockfile` d'abord, sinon le hook bute sur un `node_modules` périmé.
- `git fetch origin` puis `git push origin HEAD:master`. Si `origin/master` a bougé entre-temps (push refusé, `cannot lock ref`), repartir d'une nouvelle branche d'intégration et relancer `release` : jamais deux commits de release empilés.

## Étape 9. Mise en production

Le go de l'étape 6 couvre la mise en ligne : la feature part le jour même, seule, recette d'abord. Ne rien grouper : une livraison, une version.

1. Attendre que le run `ci-cd.yml` du SHA poussé soit vert (`gh run watch <id> --exit-status`, en arrière-plan, une trentaine de minutes). Rouge : le corriger avant toute autre chose, par un nouveau commit sur `master` qui suit la même étape 8.
2. Noter la release que la prod sert (`release` de `https://api.movie-picker.fr/health/ready`), c'est la cible d'un éventuel retour arrière.
3. Dérouler `engineering:deploy-checklist` (migrations `IDataMigration` idempotentes et compatibles avec la version d'avant, secrets attendus, critère de retour arrière), puis :

```bash
rtk gh workflow run deploy.yml --ref master -f stage=staging -f target=all
```

   Suivre le run jusqu'au bout, `deploy-guard` vert, recette qui sert le SHA (`https://api.staging.movie-picker.fr/health/ready`, `<meta name="release">` de `https://staging.movie-picker.fr/`). Le parcours de la feature se rejoue une fois en recette.
4. Même commande avec `-f stage=production`. La prod doit servir le SHA (`/health/ready` de l'API, `<meta name="release">` de `https://www.movie-picker.fr/`), et le job `publish-release` doit avoir créé le tag `vX.Y.Z` et sa release GitHub quand l'étape 8 a annoncé une version.
5. Dans l'heure, aucune issue Sentry nouvelle sur cette release et pas de hausse des 5xx. Sinon, retour arrière vers la release notée au point 2 (`rollback.yml` et `rollback-front.yml`, commandes dans AGENTS.md), puis le dire à l'utilisateur.

Terminer en donnant la version mise en ligne et le lien de sa release.
