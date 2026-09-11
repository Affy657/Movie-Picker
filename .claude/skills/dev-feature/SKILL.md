---
name: dev-feature
description: Flow de dev complet d'une feature roadmap Movie Picker, de la lecture du scope au déploiement. Déclenché avec « /dev-feature <nom de la feature> ». L'argument est le nom (ou un extrait) d'une feature présente dans la roadmap (docs/roadmap.md).
---

# /dev-feature : flow de dev d'une feature

Orchestre le cycle complet d'une feature, du scope au déploiement, sur la branche de la version en cours. L'argument `$ARGUMENTS` est le nom de la feature à développer.

Les règles de style et de workflow du repo (zéro commentaire, `verify:local` avant push, jamais skip les hooks) sont dans [AGENTS.md](../../../AGENTS.md) : les respecter, ne pas les redéfinir ici.

**Trois règles qui structurent tout le flow :**
- Le test est écrit avant le code : la phase de dev (étape 5) est en TDD, et le compte rendu fonctionnel (étape 3) fournit la liste des tests.
- Les suites de tests lourdes se lancent **juste avant le commit** (étape 8), jamais à la fin du dev.
- Le commit et le push n'ont lieu **qu'après** que l'utilisateur a testé la feature lui-même et donné son go.

Chaque **STOP** est un vrai arrêt : terminer le message, ne rien coder ni continuer le flow, reprendre uniquement quand l'utilisateur a répondu.

## Étape 1. Lire la feature

- Chercher `$ARGUMENTS` dans [docs/roadmap.md](../../../docs/roadmap.md) : d'abord les features des sections de version, puis les sections **Tech** de chaque version, puis les deux backlogs en fin de fichier.
- Si rien ne correspond, ne pas inventer : lister les entrées approchantes trouvées et demander laquelle.
- Noter la version de l'entrée : c'est la branche de travail (`v1.6`, `v1.7`, …), une branche par version. S'y placer avant d'écrire quoi que ce soit (`git switch v1.x`, à créer depuis `master` pour la première feature d'une version ; depuis un worktree où elle est déjà extraite ailleurs, une branche créée depuis `v1.x` que l'étape 8 poussera en `HEAD:v1.x`). Une entrée de backlog n'a pas de version : demander sur laquelle la livrer.

## Étape 2. Cadrage

La roadmap ne donne qu'un titre et une à deux phrases : poser les questions nécessaires pour partir dans la bonne direction. Lire d'abord le code existant de la zone touchée pour ne pas poser de question dont la réponse s'y trouve, et les sections Contraintes et Impasses de `docs/technical-debt.md` si la feature touche la coquille de démarrage, le prérendu ou la home. Reformuler brièvement ce qui a été compris, puis poser les questions ouvertes : UX, comportement aux limites, scope, interactions avec une autre feature.

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
4. **Lancers ciblés uniquement** : `pnpm --filter web exec vitest run <chemin>`, `dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj --filter "FullyQualifiedName~<Classe>"` (même forme pour `IntegrationTests`), `pnpm --filter web exec tsc --noEmit`, `pnpm exec eslint <fichiers touchés>` depuis la racine. Pas de suite complète, pas de `test:coverage`, pas de `verify:local` avant l'étape 8.
5. **Règles du repo les plus coûteuses à rattraper** : primitives de `shared/components/` avant tout CSS ou composant local, éditer l'existant plutôt que créer, aucun commentaire, tout libellé utilisateur dans les deux locales (`fr.ts`, `en.ts`) et passé par `design:ux-copy` s'il n'a pas été fixé à la maquette.

## Étape 6. Lancer front + back pour test manuel

Démarrer les deux serveurs en tâche de fond (config dans [.claude/launch.json](../../launch.json), procédure et pièges dans `/verify`) :
- **web** → `pnpm --filter web dev` (http://localhost:5173)
- **api** → `dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj` (http://localhost:4000)

Vérifier que les deux démarrent sans erreur (logs), puis **tester la feature à la main avant de rendre la main**, dans le Browser pane avec le compte `dev@test.local`, sur PC puis sur mobile (`resize_window`), et ne passer à l'utilisateur qu'après avoir contrôlé les quatre points :
1. **rien d'oublié** : reprendre les critères d'acceptation du compte rendu un par un et jouer chacun, cas à la marge compris, pas seulement le parcours nominal ;
2. **conforme à la maquette** : mêmes écrans, mêmes états, mêmes libellés, mêmes positions, capture à l'appui sur les écrans qui ont été maquettés ;
3. **pas d'affichage bizarre** : texte coupé ou débordant, élément décalé ou mal centré, espace vide, défilement horizontal, état de survol collé sur mobile, thème sombre, et console du navigateur sans erreur ;
4. **composants de l'app** : relire le diff front et vérifier que chaque bouton, pastille, champ, modale, menu ou état de page passe par la primitive de `apps/web/src/shared/components/` (tableau dans AGENTS.md) ou par un composant existant de la feature, pas par un équivalent local réécrit pour l'occasion. Un composant parallèle se remplace avant de rendre la main.

Corriger ce qui sort de ces contrôles (par un test d'abord quand c'est du comportement), puis donner les URLs à l'utilisateur, lui dire ce qu'il y a à tester et laisser les serveurs allumés.

**STOP.** Si l'utilisateur signale un problème : écrire d'abord le test qui le reproduit (règle TDD), corriger, relancer les serveurs, lui demander de re-tester, et STOP à nouveau. Un `dotnet test` pendant que l'API de dev tourne meurt sur le verrou du binaire (MSB3027) : arrêter l'API avant, la relancer après. Si la cause n'est pas évidente, dérouler `engineering:debug` (reproduire, isoler, diagnostiquer) plutôt que d'essayer des correctifs au hasard. Répéter jusqu'à ce qu'il donne explicitement son go.

## Étape 7. Revue et roadmap

- Invoquer `/code-review` (bugs de correctness) puis `/simplify` (réutilisation, simplification) ; `/security-review` en plus dès que la feature touche l'authentification, les droits, un nouvel endpoint ou une entrée utilisateur. Appliquer les retours pertinents (un bug relevé en revue passe par un test qui le reproduit d'abord), relancer les tests ciblés, et rejouer les quatre contrôles de l'étape 6 si le diff a bougé de façon notable ; si le comportement visible a changé, redonner la main à l'utilisateur pour re-tester, avec STOP, avant de continuer.
- Marquer la feature livrée dans `docs/roadmap.md` : `⬜` devient `✅`, la version s'ajoute après le titre (`**Titre** (V1.6)`), et le compte « N restants » du titre de la version baisse du poids de l'item (`S` 1, `M` 3, `L` 8, `XL` 20). Une entrée venue du backlog rejoint la section de sa version, poids compris.
- Une dette repérée en route va dans `docs/technical-debt.md`, jamais dans la roadmap ni en mémoire.

## Étape 8. Tests, commit, push

Dans cet ordre, et seulement une fois le go de l'utilisateur obtenu à l'étape 6 :

- Arrêter les serveurs de dev et fermer l'onglet du Browser pane avant de lancer les suites : les laisser tourner sature le CPU, provoque de faux échecs par timeout, et le binaire verrouillé fait mourir le build API (MSB3027).
- `pnpm run verify:local` et corriger toute erreur **avant** de push (obligatoire, cf. AGENTS.md). Jamais skip les hooks. Dans un worktree neuf, `pnpm install --frozen-lockfile` d'abord. Playwright n'en fait pas partie : `pnpm run test:e2e:ci` en plus si un spec de `e2e/` a été ajouté ou touché.
- Commit sur la branche de version `v1.x` (code, tests et roadmap en un seul commit, message en français au format `feat(<scope>): …`), puis push. Depuis une branche de worktree : `git push origin HEAD:v1.x`, en prévenant que la référence locale `v1.x` reste en arrière.
- Sur une branche de version, la CI GitHub Actions n'est pas bloquante : la signaler en une ligne si elle échoue et passer à la suite. Elle redevient une porte à la fusion dans `master`.
- Relancer les serveurs avant de rendre la main.

## Étape 9. Déploiement (geste séparé, sur demande)

**Rien ne déploie tout seul.** Un push sur `v1.x` ne déploie rien ; la version part en production à sa fusion dans `master`, par le déploiement manuel ci-dessous, jamais automatiquement. La feature est livrée dans le dépôt, pas en production. Terminer en le disant à l'utilisateur, avec la commande à lancer quand il veut la mettre en ligne :

```bash
rtk gh workflow run deploy.yml --ref master -f cible=tout
```

Ne pas le déclencher soi-même sans demande explicite : grouper plusieurs features dans un seul déploiement est précisément ce que ce découpage permet, et c'est l'utilisateur qui décide du moment. Quand il le demande, dérouler d'abord `engineering:deploy-checklist` (run `ci-cd.yml` vert sur le commit visé, migrations `IDataMigration` idempotentes, secrets attendus, critère de rollback), puis lancer la commande et vérifier que la production sert bien le commit.
