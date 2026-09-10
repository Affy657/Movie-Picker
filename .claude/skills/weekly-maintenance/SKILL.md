---
name: weekly-maintenance
description: Passe de maintenance hebdomadaire du repo Movie Picker : merge des PR Dependabot mergeables, correction des issues SonarCloud de master, triage Sentry, alertes de sécurité GitHub, métriques Google Cloud et MongoDB Atlas, le tout sur une branche unique, puis vérification que la production est réellement à jour. Déclenché avec « /weekly-maintenance ».
---

# /weekly-maintenance : passe de maintenance hebdomadaire

Les règles de style et de workflow du repo (zéro commentaire, `verify:local` avant push, jamais skip les hooks) sont dans [AGENTS.md](../../../AGENTS.md) : les respecter, ne pas les redéfinir ici.

Les commandes brutes de chaque étape sont dans [references/commandes.md](references/commandes.md), à lire au moment de s'en servir.

**Trois règles qui structurent tout le flow :**

- **Les PR Dependabot déjà ouvertes et mergeables se mergent telles quelles, directement sur master, sans les rapatrier sur la branche de travail.** C'est le seul travail qui ne demande pas de go.
- **Tout le reste vit sur une branche unique**, `chore/maintenance-<AAAA-MM-JJ>`, et part en une seule PR. Elle est créée **après** le merge des PR Dependabot, pour partir d'un master à jour.
- Rien de ce qui est écrit pendant la passe ne va sur master sans le go de l'utilisateur.

Hors périmètre : corriger les bug reports GitHub. La passe les liste et les priorise, les traiter relève de `/dev-feature`.

**Lancer la passe depuis `C:\ynov\movie-picker`, jamais depuis un worktree.** Le serveur MCP `sonarqube` est déclaré par projet dans `~/.claude.json` sur ce chemin exact : depuis un worktree les outils `mcp__sonarqube__*` n'existent pas et l'étape SonarCloud est impossible. Docker Desktop doit tourner.

## Étape 1 : collecte

Sources indépendantes, à interroger en parallèle.

**1. PR Dependabot ouvertes.** Dependabot est configuré en mensuel et groupé, une PR par écosystème (voir [.github/dependabot.yml](../../../.github/dependabot.yml)) : la plupart des semaines la liste est vide, c'est normal. Une PR groupée peut mélanger patch, mineure et **majeure**, donc lire le corps de la PR pour la liste réelle des bumps, jamais le titre. `typescript >= 7.0.0` est déjà neutralisé côté config.

**2. Alertes de sécurité GitHub.** Dependabot alerts et code scanning. Croiser avec la source 1 : une alerte déjà couverte par une PR ouverte n'est pas une ligne de plus.

**3. SonarCloud.** Vérifier **d'abord la date de la dernière analyse réussie** : un Quality Gate vert ne prouve pas que l'analyse a tourné, au plafond des 50 000 lignes elle échoue côté serveur et la main reste verte sur une photo périmée. Si elle est plus ancienne que le dernier commit de master, c'est le premier point à traiter et le reste des chiffres ne veut rien dire.

Récupérer ensuite les issues ouvertes de `master`, **en séparant celles du new code period du reste** : ce sont elles qui pilotent le Quality Gate, et c'est cette distinction qui rend le volume traitable.

**4. Sentry.** Org `adrien-morand`, région UE, projets `movie-picker-web` et `movie-picker-api`. Issues non résolues des 7 derniers jours, triées par utilisateurs touchés. Une part des remontées ne vient pas de notre code (extension de navigateur, réseau coupé, bot) : celles-là se muent dans Sentry, elles n'entrent pas dans le périmètre de correction.

**5. Google Cloud.** Trafic par classe de code de réponse, latence p95, erreurs applicatives des logs Cloud Run, révision active. Croiser les erreurs de logs avec Sentry : une erreur présente ici et absente de Sentry signale un trou d'instrumentation.

**6. MongoDB Atlas.** Alertes ouvertes, occupation disque, et surtout le **Performance Advisor** : les index manquants s'accumulent silencieusement à mesure que les requêtes évoluent, et rien d'autre ne les signale.

**7. Socle.** Trois vérifications courtes, invisibles autrement : expiration du certificat, joignabilité des domaines, et dernier statut des workflows planifiés (`security-scan.yml`, `registry-cleanup.yml`). Un job planifié qui échoue ne bloque rien et n'est donc vu par personne.

**8. Scores Lighthouse.** Télécharger le dernier rapport archivé et lire les scores réels, pas seulement le vert ou le rouge. `accessibility` et `best-practices` sont à 100, donc **sans aucune marge** : lire les scores permet de voir venir la régression avant qu'elle ne bloque `deploy-front`. Le rapport vient du dernier run de `deploy.yml`, pas d'un run master : la porte est passée sur le chemin du déploiement le 2026-09-10. Comme le déploiement est manuel, la mesure peut avoir plusieurs semaines — noter sa date dans le rapport, un score de trois semaines ne dit rien du master d'aujourd'hui.

**9. Bug reports et état de la prod.** Issues `bug` ouvertes, les 3 derniers runs de master, et **l'écart entre `master` et ce qui est déployé** : le déploiement étant manuel, la prod est en retard par défaut et personne ne le signale. Comparer le SHA de la révision Cloud Run active à `git rev-parse origin/master`. Une prod déjà en retard avant la passe se traite en premier.

## Étape 2 : rapport

Rendu **dans le terminal**, rien de versionné, rien de publié.

Une ligne d'état par source, y compris quand elle ne remonte rien. Pas de section vide.

Puis, dans l'ordre :

1. ce qui part tout de suite sans go : les PR Dependabot mergeables, nommées ;
2. ce que contiendra la branche, dans l'ordre de traitement de l'étape 4 ;
3. ce qui est signalé mais pas traité : bug reports, dérives GCP ou Atlas, ressources orphelines, avec la raison.

Donner les compteurs Sonar séparément pour le new code et le code historique. Si le volume historique ne tient pas dans une passe, le dire avec un nombre et proposer où couper, plutôt que promettre le total pour en livrer la moitié.

**STOP. Terminer le message et attendre. Ne rien merger, ne rien corriger tant que l'utilisateur n'a pas donné son go.**

## Étape 3 : merger les PR Dependabot mergeables

Directement sur master, sur GitHub, sans passer par la branche de maintenance. Une PR est mergeable quand les trois conditions sont réunies :

1. `mergeable` vaut `MERGEABLE` et `mergeStateStatus` n'est ni `BLOCKED` ni `DIRTY` ;
2. tous les checks sont verts ;
3. le corps de la PR ne contient que du patch et du mineur.

Une PR qui échoue à l'une des trois n'est pas mergée : elle bascule dans le travail de la branche et on le dit.

Puis resynchroniser avant de créer la branche : `git checkout master && rtk git pull`.

## Étape 4 : la branche unique

```bash
git checkout -b chore/maintenance-<AAAA-MM-JJ>
```

Ordre de traitement, du plus rentable au moins rentable :

1. **Issues SonarCloud du new code period.** Ce sont celles qui pilotent le Quality Gate.
2. **Sentry**, les erreurs qui viennent de notre code, avec un test qui reproduit quand l'erreur est reproductible.
3. **Issues SonarCloud historiques**, `BLOCKER` et `CRITICAL` d'abord. Le reste se compte et se laisse, un code smell `MINOR` de deux ans ne fait rougir aucun gate.
4. **Montées de dépendances restantes** : majeures et PR écartées à l'étape 3, une à la fois, changelog des breaking changes lu avant de bumper.

Une issue Sonar qui est un faux positif se marque comme telle **dans SonarCloud**, jamais par un contournement dans le code ni par une exclusion ajoutée au scanner pour faire tomber le compteur.

Commits séparés par nature (`fix(sonar):`, `fix(sentry):`, `chore(deps):`) pour que l'historique reste lisible malgré la PR unique.

Suivre AGENTS.md : zéro commentaire, réutiliser les primitives de `apps/web/src/shared/components/`, jetons de design, pas de valeur littérale dans les CSS modules.

Pendant le dev, vérifications ciblées seulement : `tsc --noEmit`, `eslint`, `vitest run <chemin>`. Les suites lourdes se lancent juste avant le commit final.

## Étape 5 : PR et merge

`pnpm run verify:local` complet, avec son code de sortie donné dans le rapport. Ne jamais annoncer vert sur une vérification partielle. Si `openapi:types:check` est concerné, lancer `openapi:export` avant.

Pousser la branche, ouvrir la PR, corps listant ce qui a été corrigé par source et ce qui a été laissé.

Attendre que les checks de la PR soient verts : ce sont eux que le déploiement exigera une fois sur master.

**STOP. Attendre le go de l'utilisateur avant de merger sur master.**

## Étape 6 : déclencher le déploiement

**Merger ne déploie rien.** Le déploiement est manuel depuis le 2026-09-10, pour tenir le quota de minutes GitHub Actions. Attendre que le run `ci-cd.yml` du commit de merge soit **terminé et vert** — le workflow de déploiement le vérifie et refusera de partir sinon — puis :

```bash
rtk gh workflow run deploy.yml --ref master -f cible=tout
```

**STOP. Le déploiement met la production à jour : attendre le go de l'utilisateur avant de le déclencher.**

## Étape 7 : vérifier que le déploiement s'est bien passé

« La CI est verte » n'y suffit pas, et « le déploiement est vert » non plus.

**1. Le run de `deploy.yml` est terminé et `deploy-guard` est vert.** Ce job échoue quand une cible demandée n'est pas partie : c'est lui qui attrape le déploiement resté en `skipped`.

**2. Aucun job de déploiement en `skipped`.** `deploy-front` dépend de `lighthouse`, `deploy-api` dépend de `docker-api`, et les deux dépendent de `verifier-ci`. Un seul de ces jobs rouge laisse le déploiement en `skipped` : le run n'apparaît pas en échec et la prod reste périmée en silence. C'est comme ça que le front est resté dix jours en retard. Les autres portes (gitleaks, lint, tests, E2E, Quality Gate Sonar) ne sont plus dans ce `needs:` : elles sont exigées en bloc par `verifier-ci`, qui refuse un commit dont le run de CI n'est pas vert.

**3. La production sert bien le SHA de master.** Côté API, le signal qui fait foi est l'image de la révision Cloud Run active : elle est taguée par le SHA du commit, à comparer avec `git rev-parse origin/master`.

Côté front, `vars.AWS_CLOUDFRONT_DISTRIBUTION_ID` est posée depuis le 2026-09-08, donc l'invalidation CloudFront et les deux smoke tests tournent vraiment au lieu de sortir en `skipped`. Lire ces trois étapes une par une plutôt que la conclusion du job, et en particulier le smoke test « domaine public + version servie », qui est le seul à comparer le point d'entrée haché envoyé à celui que `web.movie-picker.fr` sert réellement.

Le pipeline enregistre aussi une release Sentry par déploiement, nommée d'après le SHA. Elle corrobore, elle ne prouve pas : les deux étapes qui la publient sont en `continue-on-error: true` et sortent sans rien faire quand `SENTRY_AUTH_TOKEN` est absent. Une release manquante ne veut donc pas dire que le déploiement a échoué.

**4. Rien de neuf après le déploiement.** Sur Sentry, les issues **apparues** dans l'heure qui suit, sur les deux projets. Côté GCP, les logs `severity>=ERROR` sur la même heure et la part de 5xx. C'est le seul signal qui dit que la passe n'a pas cassé la prod : une nouvelle erreur à volume non nul se traite tout de suite, pas à la passe suivante.

Si un de ces quatre points échoue, **ne pas conclure que c'est déployé.** Dire lequel, et proposer soit de relancer le pipeline en `workflow_dispatch` (en sachant qu'il force les deux lanes et fait sauter `sonar`, que les déploiements acceptent alors en `skipped`), soit le rollback API via le workflow `Rollback API (Cloud Run)`, révision cible vide pour revenir à la précédente.

## Étape 8 : clôture

Résumé final en terminal :

- ce qui est parti en production, avec le SHA ;
- l'état Sonar après la passe : issues restantes par sévérité, new code et historique séparés, date de la dernière analyse ;
- ce que les métriques GCP, Atlas et Lighthouse ont montré, et ce qui mérite d'être suivi ;
- ce qui reste pour la passe suivante, avec la raison.

Si la passe a mis au jour une contrainte non documentée (un gate qui bloque sans le dire, une config qui a dérivé, un outil externe cassé), l'enregistrer en mémoire, conformément à la section « Mémoire inter-sessions » d'AGENTS.md.
