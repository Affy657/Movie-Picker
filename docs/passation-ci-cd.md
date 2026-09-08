# Passation — chantier CI/CD & sauvegarde

> Écrit le **2026-09-06** à l'attention de quiconque, humain ou agent, reprend ce travail.
> Ce document est autonome : état constaté, décisions actées, gestes restants et façon de vérifier.
>
> **Deux gestes externes sont en attente** (§ 3). Tant qu'ils ne sont pas faits, la sauvegarde
> échoue chaque nuit — volontairement bruyante plutôt que silencieusement inutile.

---

## 1. Où on en est, en une minute

| | |
|--|--|
| **Branche** | `claude/terraform-feature-split-62jckg`, en avance sur `master` (`git log --oneline origin/master..HEAD`) |
| **Pull request** | [#85](https://github.com/Affy657/Movie-Picker/pull/85) — ouverte, non fusionnée. Une PR fusionnée ne se réutilise pas : tout travail ultérieur repart de `master` |
| **Contenu** | 2 commits de roadmap (découpage Terraform en 8 lots), 2 commits de CI/CD livrés, ce document |
| **État CI** | jamais exécutée : les workflows modifiés ne tournent qu'une fois sur `master` ou en PR |
| **Reste** | 2 gestes GCP (§ 3), puis un `workflow_dispatch` manuel de la sauvegarde |

Ce qui est **livré et vérifiable dans le dépôt** :

- `.github/workflows/backup-mongo.yml` — sauvegarde quotidienne, restaurée et vérifiée avant publication.
- `.github/workflows/ci-cd.yml` — déploiement API sans trafic puis promotion sur validation, déploiement
  par digest, smoke tests sur les domaines publics, archive du build front, porte `lint-workflows`.
- `.github/workflows/rollback.yml` — en-tête corrigé (procédure de restauration front, épinglage du trafic).

Ce qui est **planifié mais pas commencé** : les 8 lots Terraform de
[`roadmap-tech.md`](roadmap-tech.md), dont la migration du front d'AWS vers GCP.

---

## 2. La seule chose à comprendre avant de toucher au déploiement

Le déploiement API **ne suit plus** le schéma « déployer, vérifier, revenir en arrière ». Il suit
« déployer sans trafic, valider, promouvoir ». C'est délibéré, et le revenir en arrière casserait la prod.

```
gcloud run deploy --no-traffic --tag "s-<sha7>"   →  la révision existe, personne ne la voit
   ↓  sondes /health et /health/ready sur l'URL taguée
gcloud run services update-traffic --to-latest    →  promotion, seulement si vert
   ↓  vérification post-promotion + domaine public
gcloud run services update-traffic --remove-tags  →  nettoyage (if: always())
```

**Pourquoi pas un retour arrière automatique**, qui semble plus naturel : une première version en
avait un, et il portait deux défauts qui pouvaient casser la production en silence.

1. `update-traffic --to-revisions REV=100` **épingle** le trafic — il retire `latestRevision: true`.
   Rien ne le rebranchait. Après un seul retour arrière, chaque déploiement suivant aurait créé une
   révision à 0 % de trafic, pendant que les smoke tests, répondus par l'ancienne révision épinglée,
   seraient restés **verts**. La prod aurait cessé de se mettre à jour sans aucun signal rouge.
2. Il visait `status.latestReadyRevisionName`, qui est la dernière révision **prête**, pas celle qui
   **sert**. Après un premier retour arrière, un second aurait basculé la prod sur la révision déjà
   jugée mauvaise.

Le schéma actuel supprime les deux à la racine, plus la fenêtre d'exposition (35–90 s pendant
lesquelles les utilisateurs touchaient la mauvaise révision) et le cas du job annulé sur *timeout*,
où `if: failure()` ne s'exécute pas et aucun rattrapage n'avait lieu. `--to-latest` désépingle au
passage un service figé par un `rollback.yml` manuel.

**Corollaire** : `rollback.yml` n'est plus le filet du déploiement. Il sert les cas que la chaîne ne
peut pas voir — régression constatée après coup, incident sans rapport avec un déploiement.

---

## 3. Les deux gestes en attente — aucun agent ne peut les faire

Aucun MCP GCP n'est disponible, et le MCP GitHub n'expose pas l'API des variables de dépôt. Ces
commandes demandent un `gcloud` authentifié ; elles sont à passer à la main, une fois.

```bash
gcloud storage buckets create gs://movie-picker-backups --location=europe-west1 \
  --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://movie-picker-backups --versioning
printf '{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}' > /tmp/lifecycle.json
gcloud storage buckets update gs://movie-picker-backups --lifecycle-file=/tmp/lifecycle.json

gcloud secrets add-iam-policy-binding MONGODB_URI --member="serviceAccount:<SA_CI>" \
  --role=roles/secretmanager.secretAccessor
gcloud storage buckets add-iam-policy-binding gs://movie-picker-backups \
  --member="serviceAccount:<SA_CI>" --role=roles/storage.objectAdmin
```

Puis GitHub → Settings → Secrets and variables → Actions → Variables :
`BACKUP_BUCKET = movie-picker-backups`.

**Ensuite, lancer `backup-mongo.yml` à la main** (`workflow_dispatch`) plutôt que d'attendre 02:31 UTC :
c'est le seul moyen d'observer le cycle complet, qui n'a jamais tourné en vrai (§ 6).

Le bucket contient des données personnelles (adresses e-mail, empreintes de mots de passe) : accès
public interdit, et l'archive n'est jamais publiée en artefact GitHub.

---

## 4. Deux pièges trouvés dans l'existant, **non corrigés**

Ils préexistaient au chantier. Aucun ne casse quoi que ce soit aujourd'hui, et corriger l'un des deux
sans pouvoir le tester serait plus risqué que de le documenter.

### 4.1 `ci-cd.yml` — un pseudo-ternaire qui ne fait pas ce qu'il dit

```yaml
base: ${{ github.ref == 'refs/heads/master' && '' || 'master' }}
```

`''` est *falsy* : la branche « vraie » ne peut jamais gagner, l'expression vaut **toujours**
`'master'`. Ça ne casse rien parce que `dorny/paths-filter` traite spécialement le cas « base ==
branche poussée » et compare alors au commit précédent — le comportement voulu est donc obtenu par
accident. **Ne pas corriger à l'aveugle** : ça touche le calcul de ce qui se déploie.

### 4.2 La migration `www` n'a jamais été exécutée

`docs/runbook-migration-domaine-www.md` décrit une migration `web.` → `www.` annoncée « à exécuter ».
Constat du 2026-09-06, mesuré :

| Hôte | Réalité |
|---|---|
| `web.movie-picker.fr` | CNAME → CloudFront, **200** — c'est le front live |
| `www.movie-picker.fr` | A `213.186.33.5` (redirection OVH), **ne répond pas** |
| `api.movie-picker.fr` | **200**, `{"status":"ok","service":"movie-picker-api"}` |

Les mentions de `www` dans le dépôt sont **toutes dans le runbook** plus une ligne commentée de
`.env.example` : rien en production ne pointe vers un domaine mort.

Conséquence pour la CI : les smoke tests de domaine public ne réécrivent **pas** ces valeurs. L'API est
dérivée de `secrets.VITE_API_URL`, le front de la première entrée de `vars.ALLOWED_ORIGINS`. Les deux
restent justes après la migration sans qu'on ait à y toucher — c'était le but.

---

## 5. Ce qui a été écarté volontairement

Ne pas les reprendre pour « finir le travail » sans relire la raison.

| Écarté | Raison |
|---|---|
| Factoriser `auth`+`setup-gcloud` (5 copies) et les smoke tests en actions composites | Juste sur le fond, mais ça touche 4 workflows dont 2 hors périmètre. À faire dans un lot dédié, pas en fin de diff. |
| `mongodump --oplog` (cohérence transactionnelle) | Impose un dump de l'instance entière et des droits supplémentaires. **La limite est écrite dans l'en-tête de `backup-mongo.yml`** : la vérification prouve que l'archive se restaure, pas qu'elle est cohérente entre collections. |
| 4 mentions devenues obsolètes dans `docs/RNCP/` | Décision du propriétaire du dépôt : le dossier RNCP est hors périmètre de ce chantier. C'est un choix, pas un oubli. |
| Descendre zizmor au seuil `low` | 9 constats cosmétiques (`self-repository`, `template-injection` de confiance basse). Le seuil `medium` est vert aujourd'hui et n'attrape que du sérieux. |

---

## 6. Vérifier — et ce qui n'a pas pu l'être

Les workflows ne sont couverts par **aucune étape de `verify:local`** : `check:architecture` ne lit que
`apps/` et `e2e/`, Prettier ignore `.github/`. Les vraies portes sont celles du job `lint-workflows`,
qu'on peut rejouer à la main aux versions exactes épinglées dans `ci-cd.yml` et `backup-mongo.yml` :

```bash
# actionlint 1.7.7 — délègue aux blocs run: à shellcheck (0.10.0), à avoir dans le PATH
actionlint
# zizmor 1.30.0, seuil identique à la CI
zizmor --offline --no-progress --min-severity medium --format plain .github/workflows/
# parsing YAML des 5 workflows
for f in .github/workflows/*.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))"; done
```

Au 2026-09-06 : **0 constat** sur les trois, et `check:architecture` passe.

Ce qui a été testé pour de vrai, hors syntaxe : extraction du nom de base depuis l'URI Mongo sur
4 formes (un nom de machine est bien rejeté), dérivation du préfixe de mois sur un horodatage à
cheval sur un changement de mois, lecture `jq` de l'URL taguée sur ses cas limites, première origine
de `ALLOWED_ORIGINS`, et le script de vérification de restauration rejoué sur base pleine / base
parasite seule / base vide.

**Ce qui n'a pas pu être testé**, et qu'il faut donc observer au premier run :

- le cycle `mongodump` → envoi → relecture → `mongorestore` complet — pas de Docker ni d'accès Atlas
  dans une session web ;
- le comportement réel de `--no-traffic --tag` et de `--to-latest` sur le service — pas de `gcloud`
  authentifié. En cas d'erreur, la chaîne **échoue en sécurité** : le déploiement rate et la
  production reste sur la révision précédente.

Le tier du cluster Atlas n'a pas pu être confirmé non plus (accès MCP désactivé au niveau des
organisations). La conclusion « aucune sauvegarde » repose sur la documentation MongoDB — le palier
gratuit ne fournit pas de snapshot — et sur l'absence totale de mécanisme dans le dépôt
(`git grep -niE "mongodump|mongorestore|backup"` ne renvoyait rien avant ce chantier).

---

## 7. La porte Lighthouse bloque `master` — diagnostic et état

> Ajouté le **2026-09-08**. C'est le sujet ouvert le plus urgent de ce document.

### 7.1 Ce qui se passe

Le 2026-09-07 à 21:26, la fusion du sélecteur de thème (V1.5.0) a rendu `master` rouge
([run 34163165678](https://github.com/Affy657/Movie-Picker/actions/runs/34163165678)) :

```
Lighthouse front (seuils bloquants)   ✗   my-events 83 < 85   watchlist 79 < 80
Garde-fou déploiement (master)        ✗   « Le front a changé mais Deploy Front est
                                            'skipped' : la production n'est pas à jour. »
```

Conséquence directe : **`deploy-front` ne s'exécute plus, et le front fusionné n'atteint pas la
production.** Un `workflow_dispatch` manuel ne contourne rien — `deploy-front` dépend de
`lighthouse`, qui tournerait et échouerait pareil. Le garde-fou fait exactement son travail :
il refuse de laisser croire que la prod est à jour.

Ce n'est pas du bruit de mesure. Sur trois exécutions du 2026-09-07 avec un front identique au
bit près, `watchlist` a donné 83, 79, 79. La médiane sur 5 passages (`LH_RUNS`) a stabilisé la
mesure et confirmé un déficit réel.

### 7.2 La cause, mesurée

Décomposition du LCP sur `watchlist` (rapports du run de `master`, téléchargés et lus) :

| | watchlist | my-events | home |
|--|--|--|--|
| FCP | 1,5 s ✅ | 1,4 s ✅ | 1,4 s |
| **LCP** | **4,8 s** (score 0,31) | **4,3 s** (0,42) | 2,7 s |
| CLS / Speed Index | parfaits | parfaits | parfaits |

Une seule métrique coule ces pages. Et sa décomposition est sans ambiguïté : `time to first byte`
5 ms, **aucune phase de chargement de ressource**, puis 590 ms de « element render delay ».
L'élément le plus grand n'est pas une image tardive — c'est du DOM qui attend l'exécution du JS.

Ce JS arrivait en **79 requêtes dont 51 scripts** pour une seule page mobile, avec 56 chunks sous
2 Ko (`x-HtGcU3QY.js` : 154 octets ; `pluralizeCount` : 77 octets). Sous l'étranglement mobile
simulé de Lighthouse, chacun paie un aller-retour réseau complet.

### 7.3 Ce qui a été fait — et ce qui a été essayé puis retiré

`apps/web/vite.config.ts` regroupe désormais les **icônes** en un chunk `icons-vendor` : les
81 icônes `lucide-react`, utilisées dans 102 fichiers, tenaient en une quarantaine de micro-chunks
parce que Rollup les extrait dès qu'elles sont partagées entre deux routes paresseuses. Elles
tiennent maintenant en 34 Ko. Mesure locale, médiane de **5** passages :

```
watchlist   82 -> 84    my-events   86 -> 88    register  87 -> 87    login  96 -> 96
```

Un second regroupement — toute la couche `shared/` en un chunk — **a été essayé puis retiré**.
Il divisait les requêtes par deux (76 → 43 sur `watchlist`) mais ne gagnait aucun point, et il
coûtait cher là où on ne regardait pas :

```
                avant   icônes   icônes + shared
  watchlist        82       84        85
  my-events        86       88        88
  register         87       87        84   ← sous le plancher de 85
  login            96       96        94
```

Regrouper `shared/` la rend *eager* : une page d'authentification, qui n'utilise qu'une poignée de
composants, télécharge alors les 92 Ko de la couche entière. **Les pages lourdes y gagnent, les
pages légères y perdent** — et la porte restait rouge, simplement sur une autre page. La leçon vaut
pour toute tentative future : mesurer les pages légères autant que les lourdes.

**Attention à deux pièges qui ont été évités et qu'il ne faut pas réintroduire :**

1. `preloadCriticalAssetsPlugin` cherche `App-[hash].js`, `App-[hash].css` et `i18n-[hash].js`
   dans le bundle. Tout regroupement qui renomme ou absorbe ces chunks fait disparaître les
   préchargements **en silence**, et le LCP empire.
2. `@sentry`, `posthog-js`, `canvas-confetti` et `react-qr-code` sont chargés à la demande.
   Les placer dans un chunk partagé avec du code eager les rendrait eager à leur tour.

### 7.4 Ce qui reste — le levier suivant, chiffré

**Ce regroupement ne suffit pas.** Reporté en CI (la machine locale note ~3 points au-dessus des
runners), il donne environ 81 et 85 pour des planchers de 80 et 85 : la porte repasserait au vert,
mais de justesse, et resterait à la merci de la variance.

Le chemin critique mesuré, c'est environ **470 Ko de JS chargés au démarrage** :

| chunk | poids | part |
|--|--|--|
| `react-vendor` | 220 Ko | 47 % |
| **`i18n`** | **185 Ko** | **39 %** |
| `App` | 47 Ko | 10 % |
| `icons-vendor` | 34 Ko | 7 % |

`i18n` est l'anomalie : `src/shared/i18n/locales/fr.ts` (112 Ko) **et** `en.ts` (100 Ko) sont tous
deux importés statiquement par `locales/index.ts`. Chaque visiteur télécharge et exécute les deux
langues alors qu'il n'en lit qu'une. Retirer la langue inactive du chemin critique enlèverait
environ 90 Ko de JS à parser avant le premier rendu — précisément le « element render delay » qui
coule ces pages.

Ce n'est pas un simple changement de *bundling* : rendre une locale paresseuse rend son chargement
asynchrone et touche `LocaleContext`. Une piste à moindre risque : garder `fr` (la locale par
défaut, `lang: 'fr'` dans le manifeste) en statique et ne charger `en` qu'au changement de langue.
Le chemin par défaut n'attend alors jamais.

**Ce qu'il ne faut pas faire pour débloquer** : baisser un seuil, retirer une page de la porte, ou
la passer en non bloquante. Le déficit est réel et mesuré ; desserrer la barre reviendrait à
supprimer la seule garde qui a détecté que la production ne se déployait plus.

### 7.5 Rejouer la porte en local

```bash
pnpm install --filter web...
CHROME_PATH=<binaire chrome> LH_ONLY=watchlist,my-events LH_RUNS=3 pnpm run lighthouse
```

`LH_ONLY` (liste de *slugs* séparés par des virgules) et `LH_RUNS` existent déjà dans
`scripts/lighthouse-run.mjs` : ils évitent de rejouer les 14 pages à chaque itération.

Deux précautions apprises en le faisant :

- **ne rien exécuter d'autre pendant la mesure.** Lighthouse mesure du temps ; un `pnpm test` en
  parallèle décale les scores de plusieurs points.
- **une machine de développement note plus haut qu'un runner GitHub** — environ 3 points d'écart
  constatés. Comparer des écarts avant/après, jamais un score local à un seuil de CI.
- dans un environnement **au réseau sortant restreint**, la page `profile` échoue
  `best-practices: 96 < 100` sur `errors-in-console` : l'avatar `api.dicebear.com` répond
  `ERR_CONNECTION_RESET`. C'est un artefact local, pas une régression — en CI la page est à 100.

### 7.6 `home` a rejoint les pages malades — constat du 2026-09-08

Depuis `d7c3e7e`, la page d'accueil échoue à son tour : **78–79 en CI pour un plancher de 85**, de
façon reproductible (deux exécutions successives à 5 passages). Ce n'est pas de la variance.

**Ce n'est pas le regroupement des chunks.** A/B sur le *même* code fusionné, seule la configuration
Vite changeant, médiane de 5 passages : `home` donne **83** avec la configuration de `master` et
**84** avec le regroupement. Le regroupement fait un point de mieux.

La bascule s'est produite dans `master` entre `23382f6` et `d7c3e7e`, qui touche `HomePage.tsx`,
`HomePage.module.css`, `App.tsx`, `Tabs.tsx`, `MoviePreviewRow.module.css` et ajoute `ScrollToTop`.

**Le mécanisme, mesuré.** La décomposition du LCP de `home` a changé de nature :

| | avant (`23382f6`) | après (`d7c3e7e`) |
|--|--|--|
| LCP | 2,5 s | **4,5 s** |
| `time to first byte` | 34,6 ms | 5,7 ms |
| `resource load delay` + `duration` | 44,6 + 88,3 ms | **absentes** |
| `element render delay` | 52,4 ms | **532,7 ms** |

Avant, l'élément le plus grand était une **image** (une affiche) : elle se chargeait en parallèle du
JS. Après, il n'y a plus aucune phase de chargement de ressource — l'élément le plus grand est du
**DOM rendu par le JS**, donc il attend l'exécution du bundle. C'est exactement la signature de
`watchlist` et `my-events`, décrite au § 7.2.

Le reste des métriques est sain : FCP 1,7 s, Speed Index 1,7 s, CLS 0,006, TBT 100 ms, aucune tâche
longue au-delà de 50 ms. Une seule métrique coule la page, et c'est toujours le LCP.

**Piste à explorer en premier** : `MoviePreviewRow.module.css` perd 18 lignes et
`HomePage.module.css` 10 dans ce diff. Si la rangée d'affiches a été réduite, masquée ou déplacée
sous la ligne de flottaison, l'élément le plus grand devient le bloc de texte au-dessus — et le LCP
bascule du réseau vers l'exécution. Vérifier quel élément Lighthouse désigne désormais comme LCP
avant de changer quoi que ce soit.

**Conséquence pour `master`** : son run sur `d7c3e7e` est passé, mais le même code mesure 83 chez
moi pour un plancher de 85. `master` va rougir sur `home` au premier échantillon défavorable — et
cette fois sur la page publique indexée, pas sur une vue authentifiée.
