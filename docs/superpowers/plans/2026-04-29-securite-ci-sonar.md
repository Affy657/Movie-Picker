# Sécurité CI — SonarCloud (§ 23) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec source :** [`../specs/2026-04-29-securite-ci-sonar-design.md`](../specs/2026-04-29-securite-ci-sonar-design.md). La spec contient les snippets complets, les décisions de design et les étapes humaines préalables. Ce plan se concentre sur l'**ordonnancement**, les **fichiers exacts** et les **commandes de vérification**.

**Goal :** Activer **SonarCloud** sur le monorepo Movie Picker (2 projets : API .NET + front), avec couverture branchée et **gate bloquante pour le déploiement** après une bascule en 2 temps (informatif → bloquant). Cible : cocher les 6 cases du § 23 de [`docs/v1-produit/livraison-v1.md`](../../v1-produit/livraison-v1.md).

**Architecture :** 2 projets SonarCloud séparés (`<ORG_KEY>_movie-picker-api` + `<ORG_KEY>_movie-picker-web`), 2 jobs CI dédiés (`sonar-api` avec scanner MSBuild + `sonar-web` avec scanner CLI) parallèles à `test-api` / `test-web`, couverture .NET unit+intégration agrégée (Cobertura), couverture front via lcov ajouté à Vitest. Mode bloquant via `sonar.qualitygate.wait=true` et `needs:` ajoutés à `docker-api` / `deploy-front`.

**Tech Stack :** SonarCloud (Free tier, repo public), `dotnet-sonarscanner` (global tool MSBuild), `SonarSource/sonarqube-scan-action@v6`, Java 17 (requis scanner .NET), Vitest v8 coverage, coverlet.collector + Cobertura.

---

## Conventions du projet à respecter

- Branche par défaut : **`master`** ; flow `1 feature = 1 branche → push → PR → CI/review → merge`
- Convention de nommage des branches : `feature/<courte-description>` (ex. `feature/sonar-init`, `feature/sonar-blocking`)
- 1 PR par tâche du plan (sauf si tâches très courtes regroupables logiquement, p. ex. les Tâches 1+2+3+4 qui sont toutes des préparatifs sans dépendance) — voir « PR plan » à la fin de chaque tâche
- Commits fréquents : 1 commit par step logique au sein d'une PR ; squash conseillé au merge pour garder un historique master propre
- Aucun secret en clair dans les commits — `SONAR_TOKEN` uniquement dans GitHub Secrets
- Aucune action cloud effectuée par l'agent (créations SonarCloud, dépôt de secrets, configuration branch protection) → **Tâche 0** (étapes 0.1 à 0.7) à exécuter par le mainteneur **avant** la Tâche 5 ; étape 0.8 (branch protection) à exécuter à la Tâche 8 (après le 1er run Sonar)
- Validation finale par `pnpm run verify:local` avant chaque push de PR
- La branch protection sur `master` exigera (à partir de la Tâche 8) que les checks `Lint`, `Tests front + couverture`, `Tests API .NET + couverture`, `SonarCloud — Front`, `SonarCloud — API .NET` soient verts pour merger

---

## File Structure

### Fichiers à créer

```
apps/web/sonar-project.properties           (config Sonar projet front)
docs/v1-produit/securite-ci.md              (doc § 23, point d'entrée pour § 24-26)
```

### Fichiers à modifier

```
.github/workflows/ci-cd.yml                                              (+2 jobs sonar-* ; +couverture intégration ; +needs deploy)
apps/web/vitest.config.ts                                                (+lcov reporter)
apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj   (+coverlet.collector)
README.md                                                                (+2 badges Sonar ; +ligne table services)
docs/v1-produit/livraison-v1.md                                          (cocher 6 cases § 23 au fur et à mesure)
```

### Aucun fichier supprimé

---

## Tâche 0 — Étapes humaines préalables (côté SonarCloud + GitHub)

> **Hors code, à exécuter par le mainteneur.** Étapes 0.1 à 0.7 doivent être terminées AVANT la Tâche 5 (premier push d'une PR contenant un job Sonar). Sinon les jobs `sonar-*` échoueront immédiatement (token absent ou projet inexistant).
>
> **Étape 0.8 (branch protection)** : à exécuter **à la Tâche 8 uniquement**, car GitHub ne propose les checks `SonarCloud — *` dans la liste des required status checks qu'**après** leur première exécution.

- [ ] **Étape 0.1 :** Créer un compte SonarCloud
  - Aller sur https://sonarcloud.io
  - "Log in with GitHub" avec le compte mainteneur
- [ ] **Étape 0.2 :** Importer l'organization GitHub dans SonarCloud
  - Bouton "+" en haut → "Import an organization from GitHub"
  - Choisir l'organization qui contient le repo `movie-picker`
  - Plan : **Free** (repo public requis)
  - **Noter la clé d'organization** générée (ex. `adrien-mp`) — sera notée `<ORG_KEY>` dans toutes les commandes ci-dessous
- [ ] **Étape 0.3 :** Créer le projet `movie-picker-api`
  - "+" → "Analyze new project" → choisir le repo `movie-picker`
  - Si SonarCloud propose une clé auto, la **changer** en `<ORG_KEY>_movie-picker-api`
  - Display name : `Movie Picker — API`
  - "Set Up" → choisir "With GitHub Actions" (pour récupérer le snippet de référence, mais on utilisera la version de la spec)
  - Project Settings → **Analysis Method** → **désactiver Automatic Analysis** (sinon double scan + conflit avec MSBuild)
  - Project Settings → **New Code** → choisir "Number of days = 30"
  - Vérifier Quality Gate = "Sonar Way" (par défaut)
- [ ] **Étape 0.4 :** Créer le projet `movie-picker-web`
  - Même procédure, key `<ORG_KEY>_movie-picker-web`
  - Display name : `Movie Picker — Web`
  - Désactiver Automatic Analysis
  - New Code = 30 jours
  - Quality Gate = Sonar Way
- [ ] **Étape 0.5 :** Générer le token Sonar
  - Account (avatar en haut à droite) → My Account → Security
  - Generate Token : Type **User Token**, scope **Global Analysis Token**, name `movie-picker-ci`
  - **Copier la valeur** (visible une seule fois)
- [ ] **Étape 0.6 :** Déposer le secret GitHub
  - GitHub repo → Settings → Secrets and variables → Actions → "New repository secret"
  - Name : **`SONAR_TOKEN`**
  - Secret : valeur copiée à l'étape 0.5
  - "Add secret"
- [ ] **Étape 0.7 :** Noter `<ORG_KEY>` pour la suite
  - Cette valeur va remplacer `<ORG_KEY>` dans :
    - `apps/web/sonar-project.properties` (lignes `sonar.projectKey` + `sonar.organization`)
    - `.github/workflows/ci-cd.yml` (jobs `sonar-api` et badges README)
    - `README.md` (URLs des badges)
  - **Conserver la valeur à portée pour les Tâches 3, 5, 6, 8**

---

## Tâche 1 — Activer la collecte de couverture sur les tests d'intégration .NET

**Files:**
- Modify: `apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj`
- Modify: `.github/workflows/ci-cd.yml` (job `test-api`)

**Pourquoi :** Les tests d'intégration n'ont actuellement pas `coverlet.collector` (vu dans le `.csproj` actuel) → l'option `--collect:"XPlat Code Coverage"` ne produira pas de fichier `coverage.cobertura.xml`. Sonar API en aurait besoin pour calculer une couverture réaliste.

- [ ] **Step 1 : Ajouter `coverlet.collector` au projet d'intégration**

Ajouter dans `apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj` dans le bloc `<ItemGroup>` existant (celui qui contient déjà `xunit`) :

```xml
    <PackageReference Include="coverlet.collector" Version="8.0.1">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
```

(Même version que dans `MoviePicker.Api.Tests.csproj` — déjà présent en `8.0.1`.)

- [ ] **Step 2 : Vérifier en local que la collecte produit un fichier**

Run :
```bash
cd C:\ynov\movie-picker
dotnet restore apps/api-dotnet/MoviePicker.slnx
dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj --collect:"XPlat Code Coverage" --results-directory ./tmp-cov-integration
```

Expected : la commande termine en succès et un fichier `coverage.cobertura.xml` (taille > 0) existe dans un sous-dossier de `tmp-cov-integration/<guid>/`.

- [ ] **Step 3 : Nettoyer le dossier temporaire**

Run :
```bash
rm -rf tmp-cov-integration
```

(Sur Windows PowerShell : `Remove-Item -Recurse -Force tmp-cov-integration`)

- [ ] **Step 4 : Modifier le job `test-api` dans `.github/workflows/ci-cd.yml`**

Localiser le bloc :
```yaml
      - name: Tests intégration
        run: dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj -c Debug --verbosity normal
        env:
          MONGODB_URI: ""
```

Le **remplacer** par :
```yaml
      - name: Tests intégration + couverture
        run: |
          dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj \
            -c Debug --collect:"XPlat Code Coverage" --results-directory ./coverage-integration \
            --verbosity normal
        env:
          MONGODB_URI: ""
      - uses: actions/upload-artifact@v7
        with:
          name: coverage-api-integration
          path: coverage-integration
          if-no-files-found: warn
```

- [ ] **Step 5 : Commit (sur la branche `feature/sonar-prep`)**

> **PR plan** : les Tâches 1 + 2 + 3 + 4 sont regroupées dans une seule PR `feature/sonar-prep` (préparation Sonar : couverture + config + doc). Les commits sont distincts mais la PR est unique. Voir Tâche 4 pour la création de la PR.

```bash
git checkout master
git pull
git checkout -b feature/sonar-prep
git add apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj .github/workflows/ci-cd.yml
git commit -m "$(cat <<'EOF'
ci(api): collecter la couverture des tests d'intégration

Préparation pour SonarCloud (§ 23) : ajout de coverlet.collector au projet
d'intégration et activation de --collect:"XPlat Code Coverage" + upload
de l'artifact coverage-api-integration. La couverture sera ensuite agrégée
avec celle des tests unitaires côté Sonar.
EOF
)"
```

---

## Tâche 2 — Ajouter le reporter `lcov` à Vitest

**Files:**
- Modify: `apps/web/vitest.config.ts`

- [ ] **Step 1 : Modifier `apps/web/vitest.config.ts`**

Localiser le bloc `coverage` :
```ts
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/vite-env.d.ts', 'src/main.tsx'],
      thresholds: {
        lines: 55,
        functions: 65,
        branches: 63,
      },
    },
```

Le **remplacer** par (ajout de `lcov` au tableau `reporter` + explicitation du dossier de sortie) :
```ts
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/vite-env.d.ts', 'src/main.tsx'],
      thresholds: {
        lines: 55,
        functions: 65,
        branches: 63,
      },
    },
```

- [ ] **Step 2 : Vérifier en local que `lcov.info` est généré**

Run :
```bash
cd C:\ynov\movie-picker
pnpm --filter web run test:coverage
```

Expected : la commande passe (les seuils 55/65/63 doivent être respectés — sinon ce n'est pas un effet de cette modif). Vérifier ensuite la présence du fichier :

```bash
ls apps/web/coverage/lcov.info
```

(Sur Windows PowerShell : `Get-Item apps/web/coverage/lcov.info`)

Expected : le fichier existe et a une taille > 0.

- [ ] **Step 3 : Commit (toujours sur `feature/sonar-prep`)**

```bash
git add apps/web/vitest.config.ts
git commit -m "$(cat <<'EOF'
ci(web): ajouter le reporter lcov à Vitest

Préparation pour SonarCloud (§ 23) : Sonar consomme du format lcov
pour la couverture front. Les reporters text et html sont conservés
pour l'affichage console et HTML local.
EOF
)"
```

---

## Tâche 3 — Créer `apps/web/sonar-project.properties`

**Files:**
- Create: `apps/web/sonar-project.properties`

> **Prérequis :** Tâche 0 (étape 0.7) terminée — connaître la valeur `<ORG_KEY>`.

- [ ] **Step 1 : Créer `apps/web/sonar-project.properties`**

Contenu **exact** (remplacer `<ORG_KEY>` partout par la valeur notée à l'étape 0.7) :

```properties
sonar.projectKey=<ORG_KEY>_movie-picker-web
sonar.organization=<ORG_KEY>
sonar.projectName=Movie Picker — Web

sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
sonar.exclusions=**/*.test.ts,**/*.test.tsx,**/test-setup.ts,**/vite-env.d.ts,**/main.tsx,**/*.stub.ts

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json

sonar.sourceEncoding=UTF-8
```

- [ ] **Step 2 : Commit (toujours sur `feature/sonar-prep`)**

```bash
git add apps/web/sonar-project.properties
git commit -m "$(cat <<'EOF'
ci(web): config SonarCloud projet front

sonar-project.properties pour le projet movie-picker-web :
sources, tests, exclusions, chemin lcov, tsconfig. La clé projet et
l'organization sont fixées (cf. doc docs/v1-produit/securite-ci.md).
EOF
)"
```

---

## Tâche 4 — Créer la doc `docs/v1-produit/securite-ci.md`

**Files:**
- Create: `docs/v1-produit/securite-ci.md`

- [ ] **Step 1 : Créer `docs/v1-produit/securite-ci.md` avec le contenu suivant**

(Remplacer `<ORG_KEY>` par la valeur notée à l'étape 0.7)

```markdown
# Sécurité CI — Movie Picker

Cette doc couvre les 4 piliers de la sécurité CI prévus en V1 (§ 23–26 de [`livraison-v1.md`](livraison-v1.md)). Seul le **§ 23 (SonarCloud)** est livré aujourd'hui ; les § 24–26 sont des TODO documentés ici pour servir de point d'entrée commun.

## Vue d'ensemble

| § | Sujet | Outil | Statut |
|---|---|---|---|
| 23 | Analyse statique (SAST) | SonarCloud | **Livré V1** |
| 24 | Dépendances NuGet vulnérables | `dotnet list package --vulnerable` | TODO V1 |
| 25 | Scan CVE image Docker | Trivy ou Grype | TODO V1 |
| 26 | Secret scanning + anti-fuite | GitHub Secret scanning + Gitleaks | TODO V1 |

---

## § 23 — SonarCloud (analyse statique)

### Topologie

| Élément | Valeur |
|---|---|
| Plateforme | **SonarCloud** (SaaS, plan Free pour repo public) |
| Organization | `<ORG_KEY>` |
| Projet API | `<ORG_KEY>_movie-picker-api` ([dashboard](https://sonarcloud.io/dashboard?id=<ORG_KEY>_movie-picker-api)) |
| Projet Web | `<ORG_KEY>_movie-picker-web` ([dashboard](https://sonarcloud.io/dashboard?id=<ORG_KEY>_movie-picker-web)) |
| Quality Gate | **Sonar Way** par défaut (focus *new code*) |
| New Code period | **30 jours glissants** |
| Scanner API | `dotnet-sonarscanner` global tool (MSBuild integration) — Java 17 requis |
| Scanner Web | `SonarSource/sonarqube-scan-action@v6` (CLI) |
| Tokens | Un seul `SONAR_TOKEN` (User Token global) dans GitHub Secrets |

### Setup initial (humain)

Voir le plan d'implémentation `docs/superpowers/plans/2026-04-29-securite-ci-sonar.md` § Tâche 0 pour la procédure pas-à-pas. Résumé :

1. Créer compte SonarCloud + importer l'organization GitHub
2. Créer les 2 projets (`movie-picker-api` + `movie-picker-web`)
3. Désactiver l'**Automatic Analysis** sur les 2 projets (sinon conflit avec MSBuild)
4. Configurer **New Code = 30 days** sur les 2 projets
5. Générer un User Token global → déposer dans GitHub Secrets sous le nom **`SONAR_TOKEN`**

### Comportement CI

- Sur chaque push `master` : jobs `sonar-api` + `sonar-web` tournent en parallèle après `test-api` / `test-web`
- Mode **bloquant** activé via `sonar.qualitygate.wait=true` : chaque job Sonar attend le verdict de la gate (~30–60 s) et **échoue si rouge**
- Les jobs de déploiement (`docker-api`, `deploy-front`, et donc `deploy-api` qui dépend de `docker-api`) ont `needs: [test-web, test-api, sonar-api, sonar-web]` → **si la gate est rouge, le déploiement ne se déclenche pas**
- Conséquence : master peut prendre un commit qui régresse la qualité, mais la prod reste sur la dernière version verte tant que la gate n'est pas rétablie

### Lecture d'un rapport

- **Dashboard SonarCloud** : URLs des deux projets ci-dessus (vue d'ensemble, issues, hotspots, couverture)
- **Badges README** : aperçu rapide du statut gate sur la page d'accueil du repo
- **Status check GitHub** : sur la page d'un commit dans GitHub, un check `SonarCloud Code Analysis` apparaît à côté des autres jobs CI
- En cas de gate rouge : ouvrir le projet correspondant sur SonarCloud → onglet "Issues" → filtrer par "New Code" et sévérité

### Procédure de rotation du token

1. SonarCloud → My Account → Security → Revoke l'ancien token `movie-picker-ci`
2. Generate Token → même nom → copier la nouvelle valeur
3. GitHub repo → Settings → Secrets → modifier `SONAR_TOKEN` avec la nouvelle valeur
4. Re-run du dernier workflow `CI/CD` (Actions → CI/CD → Re-run all jobs)

### Limites connues

- **PRs depuis forks** : SonarCloud skip silencieusement (le secret `SONAR_TOKEN` n'est pas exposé aux workflows déclenchés depuis un fork — sécurité standard GitHub Actions). Non-bloquant pour un projet solo, à noter si contributeurs externes un jour.
- **Build .NET joué deux fois** : job `lint` (avec `-warnaserror`) et job `sonar-api` (pour le scanner). Coût ~30 s, optimisation possible plus tard via cache NuGet ou unification.
- **Java 17 requis** dans `sonar-api` (par dotnet-sonarscanner). Léger overhead de setup (~15 s), irréductible.
- **Quality Gate Sonar Way** peut évoluer côté SonarSource. Acceptable car ces évolutions visent à durcir la qualité.

---

## § 24 — Dépendances NuGet (TODO V1)

**Objectif :** détecter les paquets .NET vulnérables en CI. Complète `pnpm audit` côté Node (déjà actif en job `lint`), distinct de Sonar.

**Approche prévue :** après `dotnet restore`, exécuter `dotnet list package --vulnerable --include-transitive` et faire échouer le job sur high/critical.

Voir [`livraison-v1.md`](livraison-v1.md) § 24.

---

## § 25 — Scan image Docker (TODO V1)

**Objectif :** réduire les CVE dans l'image poussée vers Artifact Registry / Cloud Run.

**Approche prévue :** après `docker build` de l'API, lancer **Trivy** ou **Grype** sur l'image taguée localement et faire échouer le pipeline au-delà du seuil retenu **avant** `docker push`.

Voir [`livraison-v1.md`](livraison-v1.md) § 25.

---

## § 26 — Secret scanning et anti-fuite (TODO V1)

**Objectif :** limiter les secrets commités et réagir vite si fuite.

**Approche prévue :** activer GitHub **Secret scanning** + **push protection** sur le repo, documenter une procédure de rotation. Optionnellement : Gitleaks ou TruffleHog en CI sur le diff.

Voir [`livraison-v1.md`](livraison-v1.md) § 26.
```

- [ ] **Step 2 : Commit (toujours sur `feature/sonar-prep`)**

```bash
git add docs/v1-produit/securite-ci.md
git commit -m "$(cat <<'EOF'
docs(v1): doc Sécurité CI (point d'entrée § 23-26)

Crée la doc dédiée aux 4 piliers de la Sécurité CI : SonarCloud (livré),
NuGet vulnerable, scan Docker, secret scanning (TODO V1). Couvre la
topologie SonarCloud, le setup, le comportement CI, la lecture d'un
rapport, la rotation du token et les limites connues.
EOF
)"
```

- [ ] **Step 3 : Validation locale finale + push de la branche `feature/sonar-prep`**

```bash
pnpm run verify:local
git push -u origin feature/sonar-prep
```

Expected : `verify:local` vert, push accepté.

- [ ] **Step 4 : Ouvrir la PR `feature/sonar-prep → master`**

```bash
gh pr create --base master --title "ci(sonar): préparation Sonar (couverture intégration + lcov + config + doc)" --body "$(cat <<'EOF'
## Summary

Préparation pour activer SonarCloud (§ 23 livraison-v1.md) :

- Couverture des tests d'intégration .NET activée (coverlet.collector + --collect XPlat)
- Reporter lcov ajouté à Vitest pour la couverture front
- sonar-project.properties pour le projet front
- Doc dédiée Sécurité CI (§ 23 livré + § 24-26 TODO)

Aucun job Sonar dans le yml à ce stade — ils arrivent dans des PRs séparées (cf. plan).

## Test plan

- [ ] verify:local vert localement
- [ ] CI verte sur la PR (lint, tests, lighthouse)
- [ ] Artifact coverage-api-integration upload sur le run
- [ ] apps/web/coverage/lcov.info généré dans le run test-web
EOF
)"
```

- [ ] **Step 5 : Attendre la CI verte sur la PR puis merger**

Vérifier sur GitHub Actions que tous les jobs passent. Si oui :

```bash
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Tâche 5 — Ajouter le job `sonar-web` (mode informatif)

**Files:**
- Modify: `.github/workflows/ci-cd.yml` (ajout d'un nouveau job)

> **Prérequis :** Tâche 0 (étapes 0.1 à 0.7) terminée — notamment 0.6 : `SONAR_TOKEN` déposé dans GitHub Secrets — **ET** Tâche 4 mergée sur master (sonar-project.properties + doc existent).
>
> **Mode informatif** : à cette étape, `sonar.qualitygate.wait=false` (le job remonte les résultats à SonarCloud mais ne bloque pas la CI même si la gate est rouge). On bascule en mode bloquant à la Tâche 8.
>
> **PR plan** : Tâche 5 = 1 PR `feature/sonar-web-init`. Tâche 6 = 1 PR séparée `feature/sonar-api-init` (pour pouvoir merger l'une sans l'autre si l'une bloque).

- [ ] **Step 1 : Créer la branche et ajouter le job `sonar-web` dans `.github/workflows/ci-cd.yml`**

```bash
git checkout master
git pull
git checkout -b feature/sonar-web-init
```

Puis dans `.github/workflows/ci-cd.yml` :

Insérer le job **juste après** le job `test-web` (et avant `test-api` ou `lighthouse` — peu importe l'ordre) :

```yaml
  sonar-web:
    name: SonarCloud — Front
    needs: test-web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/download-artifact@v5
        with:
          name: coverage-web
          path: apps/web/coverage
      - uses: SonarSource/sonarqube-scan-action@v6
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          projectBaseDir: apps/web
          args: >
            -Dsonar.qualitygate.wait=false
```

> Note : `sonar.qualitygate.wait=false` ici → mode informatif. On change à `true` à la Tâche 8.

- [ ] **Step 2 : Validation locale du yaml**

Run :
```bash
cd C:\ynov\movie-picker
pnpm run verify:local
```

Expected : passe en vert (la modif yaml ne casse rien localement, `verify:local` ne valide pas la syntaxe Actions mais valide le reste).

Optionnel — vérifier la syntaxe Actions :
```bash
gh workflow view ci-cd.yml
```

- [ ] **Step 3 : Commit + push branche + ouvrir la PR**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "$(cat <<'EOF'
ci(web): job sonar-web SonarCloud (mode informatif)

Ajout du job sonar-web qui télécharge l'artifact coverage-web et lance
le scanner CLI SonarCloud. Démarrage en mode informatif
(sonar.qualitygate.wait=false) pour valider que l'analyse tourne sans
bloquer la PR. Bascule en mode bloquant + branch protection à venir
(cf. plan § 23 Tâche 8).
EOF
)"
git push -u origin feature/sonar-web-init

gh pr create --base master --title "ci(web): job sonar-web (mode informatif)" --body "$(cat <<'EOF'
## Summary

Premier job SonarCloud pour le front, en mode informatif (qualitygate.wait=false).
Permet de valider que l'analyse tourne et de poser le check GitHub
\`SonarCloud — Front\` qui sera utilisé par la branch protection en Tâche 8.

## Test plan

- [ ] CI verte sur la PR (lint, tests, lighthouse, sonar-web)
- [ ] Commentaire SonarCloud automatique sur la PR (issues + coverage du diff)
- [ ] Projet movie-picker-web visible sur sonarcloud.io avec une analyse récente
- [ ] Si gate rouge sur SonarCloud : noter les blockers pour Tâche 7
EOF
)"
```

- [ ] **Step 4 : Vérifier le run en CI sur la PR**

GitHub → la PR → onglet Checks ou Actions.

Expected :
- Job `sonar-web` apparaît, dépend de `test-web`
- Le job termine en **succès vert** (même si la gate Sonar est rouge, car mode informatif)
- **Commentaire SonarCloud** apparaît automatiquement sur la PR avec issues + coverage du diff
- Sur https://sonarcloud.io/projects, le projet `movie-picker-web` montre une analyse récente

Si le job échoue avec une erreur d'authentification → vérifier que `SONAR_TOKEN` est bien déposé dans GitHub Secrets (étape 0.6).

Si la gate est rouge sur SonarCloud → noter les blockers, prévoir des fixes ou exclusions à la Tâche 7.

- [ ] **Step 5 : Merger la PR**

```bash
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Tâche 6 — Ajouter le job `sonar-api` (mode informatif)

**Files:**
- Modify: `.github/workflows/ci-cd.yml` (ajout d'un nouveau job)

> **Prérequis :** Tâche 0 (étapes 0.1 à 0.7) terminée + Tâches 1 + 4 + 5 mergées sur master.
>
> **PR plan** : 1 PR `feature/sonar-api-init`.

- [ ] **Step 1 : Créer la branche et ajouter le job `sonar-api` dans `.github/workflows/ci-cd.yml`**

```bash
git checkout master
git pull
git checkout -b feature/sonar-api-init
```

Puis dans `.github/workflows/ci-cd.yml` :

(Remplacer `<ORG_KEY>` par la valeur notée à l'étape 0.7)

Insérer le job **après** le job `test-api` (et `sonar-web` si tu suis l'ordre du fichier) :

```yaml
  sonar-api:
    name: SonarCloud — API .NET
    needs: test-api
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-java@v5
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: actions/setup-dotnet@v5
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}
      - uses: actions/download-artifact@v5
        with:
          name: coverage-api-unit
          path: coverage-unit
      - uses: actions/download-artifact@v5
        with:
          name: coverage-api-integration
          path: coverage-integration
      - name: Install dotnet-sonarscanner
        run: dotnet tool install --global dotnet-sonarscanner
      - name: SonarCloud begin
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: |
          dotnet sonarscanner begin \
            /k:"<ORG_KEY>_movie-picker-api" \
            /o:"<ORG_KEY>" \
            /d:sonar.token="$SONAR_TOKEN" \
            /d:sonar.host.url="https://sonarcloud.io" \
            /d:sonar.cs.cobertura.reportsPaths="coverage-unit/**/coverage.cobertura.xml,coverage-integration/**/coverage.cobertura.xml" \
            /d:sonar.coverage.exclusions="**/Program.cs,**/MoviePicker.Api.Tests/**,**/MoviePicker.Api.IntegrationTests/**" \
            /d:sonar.qualitygate.wait=false
      - name: Build API
        run: dotnet build apps/api-dotnet/MoviePicker.slnx -c Release
      - name: SonarCloud end
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: dotnet sonarscanner end /d:sonar.token="$SONAR_TOKEN"
```

> Note : `sonar.qualitygate.wait=false` → mode informatif. Bascule en `true` à la Tâche 8.

- [ ] **Step 2 : Validation locale**

Run :
```bash
cd C:\ynov\movie-picker
pnpm run verify:local
```

Expected : passe en vert.

- [ ] **Step 3 : Commit + push branche + ouvrir la PR**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "$(cat <<'EOF'
ci(api): job sonar-api SonarCloud (mode informatif)

Ajout du job sonar-api avec le scanner MSBuild dotnet-sonarscanner,
Java 17 requis, agrégation de la couverture unit + intégration
(Cobertura) via sonar.cs.cobertura.reportsPaths. Démarrage en mode
informatif (sonar.qualitygate.wait=false). Bascule en mode bloquant
+ branch protection à venir (cf. plan § 23 Tâche 8).
EOF
)"
git push -u origin feature/sonar-api-init

gh pr create --base master --title "ci(api): job sonar-api (mode informatif)" --body "$(cat <<'EOF'
## Summary

Premier job SonarCloud pour l'API .NET, en mode informatif (qualitygate.wait=false).
Permet de valider que l'analyse tourne et de poser le check GitHub
\`SonarCloud — API .NET\` qui sera utilisé par la branch protection en Tâche 8.

Scanner MSBuild (dotnet-sonarscanner) pour activer les règles Roslyn
spécifiques C#. Couverture agrégée unit + intégration (Cobertura).

## Test plan

- [ ] CI verte sur la PR (lint, tests, lighthouse, sonar-api, sonar-web)
- [ ] Logs sonar-api contiennent "Sensor C# Cobertura"
- [ ] Couverture > 0% sur movie-picker-api dans SonarCloud
- [ ] Commentaire SonarCloud automatique sur la PR
EOF
)"
```

- [ ] **Step 4 : Vérifier le run en CI sur la PR**

GitHub → la PR → Checks.

Expected :
- Job `sonar-api` apparaît, dépend de `test-api`
- Le job termine en **succès vert** (mode informatif)
- Logs Sonar contiennent `INFO: Sensor C# Cobertura ...` indiquant que les fichiers de couverture sont bien lus
- Sur https://sonarcloud.io/projects, `movie-picker-api` montre une analyse récente avec une couverture > 0%
- Commentaire SonarCloud sur la PR avec issues + coverage du diff

Si la couverture affichée est 0% → vérifier dans les logs `INFO: Sensor C# Cobertura` que les paths sont trouvés. Si non, ajuster les patterns `coverage-unit/**` / `coverage-integration/**`.

- [ ] **Step 5 : Merger la PR**

```bash
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Tâche 7 — Audit + mitigation des blockers (rollout étape 2)

**Files:**
- Optionnel : `apps/web/sonar-project.properties` (étendre `sonar.exclusions` si besoin)
- Optionnel : `.github/workflows/ci-cd.yml` (étendre `sonar.coverage.exclusions` côté API si besoin)
- Optionnel : SonarCloud UI (marquer issues legacy)

> **Tâche conditionnelle.** Si les deux gates Sonar sont déjà vertes après les Tâches 5 et 6 → passer directement à la Tâche 8.
>
> **PR plan** : si Step 6 nécessaire, 1 PR `feature/sonar-exclusions` ou `fix/sonar-<issue>` selon ce qui est corrigé.

- [ ] **Step 1 : Ouvrir les 2 dashboards SonarCloud et auditer la gate**

URLs :
- https://sonarcloud.io/dashboard?id=`<ORG_KEY>`_movie-picker-api
- https://sonarcloud.io/dashboard?id=`<ORG_KEY>`_movie-picker-web

Pour chaque projet : noter la liste des conditions Quality Gate qui sont rouges (typiquement : "Coverage on New Code < 80%", "Bugs > 0", "Security Hotspots Reviewed < 100%").

- [ ] **Step 2 : Pour les bugs / vulnérabilités évidents → fix dans des commits séparés**

Pour chaque issue critique remontée :
- Lire l'explication Sonar (lien "Why is this an issue?")
- Si fix simple → corriger dans un commit dédié (`fix(scope): ...`), push, attendre nouvelle analyse Sonar

- [ ] **Step 3 : Pour les false positives → marquer dans SonarCloud UI**

SonarCloud → Project → Issues → cliquer l'issue → "Change Status" → `Won't Fix` ou `False Positive`. **Documenter** chaque exception dans le commit message du commit suivant ou dans la doc `securite-ci.md` si patron récurrent.

- [ ] **Step 4 : Pour les fichiers à exclure du scope (stubs, generated, scripts dev)**

Si du code de stub (ex. `apps/web/src/features/auth/devQuickLoginCredentials.stub.ts`) est compté à tort dans la couverture, l'ajouter à `apps/web/sonar-project.properties` :

```properties
sonar.exclusions=**/*.test.ts,**/*.test.tsx,**/test-setup.ts,**/vite-env.d.ts,**/main.tsx,**/*.stub.ts,**/<chemin-supplementaire>
```

Côté API, étendre `sonar.coverage.exclusions` dans le job `sonar-api` du yml :

```yaml
            /d:sonar.coverage.exclusions="**/Program.cs,**/MoviePicker.Api.Tests/**,**/MoviePicker.Api.IntegrationTests/**,**/<chemin-supplementaire>" \
```

- [ ] **Step 5 : Pour chaque PR de fix / exclusion : créer la branche, commit, push, PR, attendre CI verte, merger**

Pour chaque correction : créer une branche depuis master à jour (`git checkout master && git pull && git checkout -b fix/sonar-<issue>`), faire le fix, commit, push, ouvrir la PR (`gh pr create ...`), attendre la CI verte (les jobs Sonar tournent et postent leur status), merger via `gh pr merge --squash --delete-branch`.

Itérer jusqu'à ce que **les deux gates soient vertes** sur SonarCloud (analyse de la branche master, après chaque merge).

- [ ] **Step 6 : Si exclusions techniques nécessaires — PR `feature/sonar-exclusions`**

(Si Step 4 a été nécessaire — sinon skip.)

```bash
git checkout master
git pull
git checkout -b feature/sonar-exclusions
# (modifs sonar-project.properties et/ou ci-cd.yml comme décrit en Step 4)
git add apps/web/sonar-project.properties .github/workflows/ci-cd.yml
git commit -m "$(cat <<'EOF'
ci(sonar): exclure les fichiers de stub / generated du scope d'analyse

Audit gate Sonar Way après le 1er run (cf. plan § 23 Tâche 7).
Exclusions ciblées pour éviter de pénaliser la couverture sur du
code non testable / non métier.
EOF
)"
git push -u origin feature/sonar-exclusions
gh pr create --base master --title "ci(sonar): exclusions techniques (stubs/generated)" --body "Audit Tâche 7 § 23. Voir plan."
# attendre CI verte puis :
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Tâche 8 — Activer le mode bloquant + Branch Protection (rollout étape 3)

**Files:**
- Modify: `.github/workflows/ci-cd.yml` (3 changements : `sonar-api`, `sonar-web`, jobs deploy)
- GitHub UI : Settings → Branches → ajout d'une branch protection rule sur `master`

> **Prérequis : les 2 gates Sonar doivent être vertes** (Tâches 5–7 terminées avec succès). Sinon la PR de cette tâche sera elle-même bloquée par sa propre nouvelle gate.
>
> **PR plan** : 1 PR `feature/sonar-blocking` pour les changements yml. La branch protection se configure ensuite via GitHub UI (étape 0.8).

- [ ] **Step 0 : Créer la branche depuis master à jour**

```bash
git checkout master
git pull
git checkout -b feature/sonar-blocking
```

- [ ] **Step 1 : Passer `sonar-web` en mode bloquant**

Dans le job `sonar-web`, remplacer :
```yaml
            -Dsonar.qualitygate.wait=false
```
Par :
```yaml
            -Dsonar.qualitygate.wait=true
```

- [ ] **Step 2 : Passer `sonar-api` en mode bloquant**

Dans le job `sonar-api`, remplacer :
```yaml
            /d:sonar.qualitygate.wait=false
```
Par :
```yaml
            /d:sonar.qualitygate.wait=true
```

- [ ] **Step 3 : Brancher les `needs:` Sonar dans les jobs deploy**

Localiser le job `docker-api` :
```yaml
  docker-api:
    name: Docker API → Artifact Registry
    runs-on: ubuntu-latest
    needs: [test-web, test-api]
```

Le remplacer par :
```yaml
  docker-api:
    name: Docker API → Artifact Registry
    runs-on: ubuntu-latest
    needs: [test-web, test-api, sonar-api, sonar-web]
```

Localiser le job `deploy-front` :
```yaml
  deploy-front:
    name: Deploy Front → S3 & CloudFront
    runs-on: ubuntu-latest
    needs: [test-web, test-api]
```

Le remplacer par :
```yaml
  deploy-front:
    name: Deploy Front → S3 & CloudFront
    runs-on: ubuntu-latest
    needs: [test-web, test-api, sonar-api, sonar-web]
```

> Note : `deploy-api` reste avec `needs: docker-api` (inchangé) — il dépend transitivement de Sonar via `docker-api`.

- [ ] **Step 4 : Validation locale**

```bash
cd C:\ynov\movie-picker
pnpm run verify:local
```

Expected : passe.

- [ ] **Step 5 : Commit + push branche + ouvrir la PR**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "$(cat <<'EOF'
ci(sonar): activer le mode bloquant pour le déploiement (§ 23)

- sonar.qualitygate.wait=true sur sonar-api et sonar-web : les jobs
  attendent le verdict de la gate et échouent si rouge.
- docker-api et deploy-front dépendent désormais de sonar-api +
  sonar-web : filet de sécurité si la branch protection master
  est désactivée par erreur.
- deploy-api reste needs: docker-api (transitif via docker-api).

Conforme § 23 livraison-v1.md ("CI échoue si gate rouge").
EOF
)"
git push -u origin feature/sonar-blocking

gh pr create --base master --title "ci(sonar): mode bloquant + filet de sécurité deploy (§ 23)" --body "$(cat <<'EOF'
## Summary

Activation du double rempart Sonar :
- qualitygate.wait=true sur les deux jobs Sonar → la PR ne peut pas être
  mergée si une gate est rouge (via la branch protection configurée à l'étape suivante).
- needs: sonar-* sur docker-api / deploy-front → filet de sécurité si la
  branch protection venait à être désactivée par erreur.

⚠ Cette PR doit elle-même passer ses propres nouvelles gates pour être mergée.

## Test plan

- [ ] CI verte sur la PR (incluant sonar-api et sonar-web en mode bloquant)
- [ ] Après merge : run master vert, déploiement effectif
- [ ] Étape suivante (hors PR) : configurer branch protection master (cf. plan Tâche 8 Step 7)
EOF
)"
```

- [ ] **Step 6 : Attendre la CI verte + merger**

```bash
# attendre que la PR soit verte (les nouvelles gates Sonar incluses)
gh pr merge --squash --delete-branch
git checkout master
git pull
```

Vérifier ensuite sur GitHub Actions que le run `master` après merge est vert (incluant les jobs deploy).

Si la PR est rouge : c'est attendu si la gate Sonar régresse. Identifier la cause sur SonarCloud, fixer dans la même branche, push, attendre nouveau run.

- [ ] **Step 7 : Configurer la GitHub Branch Protection sur `master` (étape 0.8 humaine)**

GitHub repo → Settings → Branches → "Add branch ruleset" (ou "Add branch protection rule" selon la version UI).

Configurer :
- **Branch name pattern** : `master`
- **Require a pull request before merging** : ✅ coché (avec ou sans review obligatoire selon préférence — pour un projet solo, pas de review obligatoire est OK)
- **Require status checks to pass before merging** : ✅ coché
  - **Require branches to be up to date before merging** : ✅ coché
  - Search and add les 5 checks requis :
    - `Lint`
    - `Tests front + couverture`
    - `Tests API .NET + couverture`
    - `SonarCloud — Front`
    - `SonarCloud — API .NET`
- **Block force pushes** : ✅ coché
- **Allow deletions** : ❌ décoché
- **Save changes**

> Si un check n'apparaît pas dans la liste de recherche : c'est qu'il n'a pas encore tourné une fois sur le repo. Vérifier l'historique des Actions.

- [ ] **Step 8 : Vérifier la branch protection avec une PR de test**

Créer une PR triviale (ex. `feature/sonar-test-protection` qui ajoute une ligne dans la doc `securite-ci.md`) et vérifier que :
- Tous les 5 checks requis apparaissent comme "Required"
- Le bouton "Merge pull request" est grisé tant que tous les checks ne sont pas verts
- Une fois verts, le merge est possible

```bash
git checkout master
git pull
git checkout -b feature/sonar-test-protection
echo "" >> docs/v1-produit/securite-ci.md
git add docs/v1-produit/securite-ci.md
git commit -m "test(sonar): vérifier branch protection sur master"
git push -u origin feature/sonar-test-protection
gh pr create --base master --title "test: branch protection sonar" --body "PR de test pour valider la branch protection master (cf. plan Tâche 8 Step 8)."
# vérifier sur GitHub que les 5 checks sont required
# une fois tous verts :
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Tâche 9 — Badges README + ligne table services

**Files:**
- Modify: `README.md`

> **PR plan** : 1 PR `feature/sonar-readme`. Peut être faite en parallèle ou après la Tâche 8.

- [ ] **Step 0 : Créer la branche depuis master à jour**

```bash
git checkout master
git pull
git checkout -b feature/sonar-readme
```

- [ ] **Step 1 : Ajouter les 2 badges en haut du README**

Ouvrir `README.md`. Localiser la 1re ligne :
```markdown
# Movie Picker
```

Insérer **juste après** une ligne vide puis 2 badges (remplacer `<ORG_KEY>`) :

```markdown
# Movie Picker

[![Quality Gate API](https://sonarcloud.io/api/project_badges/measure?project=<ORG_KEY>_movie-picker-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=<ORG_KEY>_movie-picker-api)
[![Quality Gate Web](https://sonarcloud.io/api/project_badges/measure?project=<ORG_KEY>_movie-picker-web&metric=alert_status)](https://sonarcloud.io/dashboard?id=<ORG_KEY>_movie-picker-web)

Application pour organiser des soirées film...
```

- [ ] **Step 2 : Ajouter une ligne dans la table « Services utilisés »**

Localiser la table dont l'entête est :
```markdown
| Fournisseur | Service | Rôle |
|-------------|---------|------|
```

Ajouter à la fin de la table une nouvelle ligne :
```markdown
| **SonarCloud** | SAST | Analyse statique CI (gates bloquantes pour le déploiement). Voir [`docs/v1-produit/securite-ci.md`](docs/v1-produit/securite-ci.md). |
```

- [ ] **Step 3 : Vérifier le rendu local**

Ouvrir `README.md` dans la preview de l'IDE. Expected : les 2 badges s'affichent (vert "passed" si la gate est verte côté SonarCloud) et la nouvelle ligne apparaît dans la table.

- [ ] **Step 4 : Commit + push branche + ouvrir la PR**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs(readme): badges SonarCloud + service SAST

Ajout de 2 badges Quality Gate (api + web) en tête de README et
d'une ligne dans la table des services utilisés. Visibilité du
statut Sonar depuis la page d'accueil du repo.
EOF
)"
git push -u origin feature/sonar-readme
gh pr create --base master --title "docs(readme): badges SonarCloud + service SAST" --body "Visibilité du statut Sonar depuis la page d'accueil du repo (badges + table services)."
# attendre CI verte (gates Sonar incluses si Tâche 8 mergée) :
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Tâche 10 — Cocher les cases § 23 dans `livraison-v1.md`

**Files:**
- Modify: `docs/v1-produit/livraison-v1.md` (lignes 282–287, et potentiellement ligne 272)

> **PR plan** : 1 PR `feature/sonar-livraison-check`. Peut regrouper les cases en 1 PR finale, ou être faite au fur et à mesure dans les PRs précédentes (chaque PR coche les cases qu'elle valide). Recommandation : faire **1 PR finale dédiée** pour garder l'historique propre et un seul commit "§ 23 livré".

- [ ] **Step 0 : Créer la branche depuis master à jour**

```bash
git checkout master
git pull
git checkout -b feature/sonar-livraison-check
```

- [ ] **Step 1 : Cocher les 6 cases du § 23**

Ouvrir `docs/v1-produit/livraison-v1.md`. Localiser la section `## 23. Sécurité CI — Sonar (analyse statique)` (vers la ligne 278).

Pour chacune des 6 cases (lignes 282 à 287), remplacer `- [ ]` par `- [x]`. À cocher dans cet ordre (cohérent avec l'ordre des tâches du plan) :

1. Ligne 282 : "Créer le projet Sonar..." → coché après Tâche 0 (étape 0.4)
2. Ligne 283 : "Déposer SONAR_TOKEN..." → coché après Tâche 0 (étape 0.6)
3. Ligne 284 : "Ajouter l'analyse en CI..." → coché après Tâches 5 et 6
4. Ligne 285 : "Brancher les rapports de couverture..." → coché après Tâches 1, 2 et 6 (vérifié par les logs Sonar)
5. Ligne 286 : "Définir une Quality Gate..." → coché après Tâche 8
6. Ligne 287 : "Documenter brièvement..." → coché après Tâches 4 et 9

> **À l'usage** : ces cases peuvent être cochées au fur et à mesure (un commit par groupe de cases cohérent), pas forcément en une seule passe à la fin.

- [ ] **Step 2 : Ne PAS cocher la ligne 272 du § 22**

La ligne 272 (`Sécurité CI : Sonar gate, scan NuGet, scan image Docker, secret scanning tous actifs en CI`) **ne doit être cochée que quand les § 24, § 25 et § 26 seront aussi terminés** — pas dans cette spec.

- [ ] **Step 3 : Commit + push branche + ouvrir la PR**

```bash
git add docs/v1-produit/livraison-v1.md
git commit -m "$(cat <<'EOF'
docs(v1): cocher les 6 cases du § 23 (Sonar livré)

§ 23 Sécurité CI — Sonar terminé : SonarCloud configuré sur les 2
projets, gate Sonar Way bloquante pour le merge (branch protection
master) et pour le déploiement (needs: sonar-* sur deploy), couverture
unit+intégration agrégée côté API, lcov côté front, doc dans
docs/v1-produit/securite-ci.md.

La ligne 272 du § 22 reste non cochée (en attente § 24, § 25, § 26).
EOF
)"
git push -u origin feature/sonar-livraison-check
gh pr create --base master --title "docs(v1): § 23 Sonar livré (cocher 6 cases)" --body "Clôture du § 23 Sécurité CI — Sonar."
gh pr merge --squash --delete-branch
git checkout master
git pull
```

---

## Récapitulatif des PRs attendues

| # | PR / Branche | Tâches couvertes | Commits |
|---|---|---|---|
| PR 1 | `feature/sonar-prep` | Tâches 1, 2, 3, 4 | 4 commits (couverture intégration .NET, lcov Vitest, sonar-project.properties, doc) |
| PR 2 | `feature/sonar-web-init` | Tâche 5 | 1 commit (job sonar-web informatif) |
| PR 3 | `feature/sonar-api-init` | Tâche 6 | 1 commit (job sonar-api informatif) |
| PR 4 | (conditionnel) `feature/sonar-exclusions` ou `fix/sonar-<issue>` | Tâche 7 | 1 ou plusieurs commits selon les fixes nécessaires |
| PR 5 | `feature/sonar-blocking` | Tâche 8 (yml) | 1 commit (mode bloquant + needs deploy) — branch protection configurée hors PR via GitHub UI |
| PR 6 | (test) `feature/sonar-test-protection` | Tâche 8 Step 8 | 1 commit trivial pour valider la protection |
| PR 7 | `feature/sonar-readme` | Tâche 9 | 1 commit (badges README) |
| PR 8 | `feature/sonar-livraison-check` | Tâche 10 | 1 commit (cocher 6 cases § 23) |

**8 PRs** au total (7 obligatoires + 1 conditionnelle Tâche 7), chacune mergée en squash pour garder un historique master propre. Étape 0.8 (branch protection) configurée dans GitHub UI au sein de la Tâche 8 (Step 7), pas via PR.

---

## Critères d'acceptation finaux

- [ ] Les 2 jobs `sonar-api` et `sonar-web` apparaissent dans le pipeline CI sur chaque PR vers master et sur chaque push master
- [ ] Les 2 gates SonarCloud sont **vertes** sur le dernier commit master
- [ ] `sonar.qualitygate.wait=true` sur les 2 jobs (mode bloquant actif)
- [ ] `docker-api` et `deploy-front` ont `needs: [..., sonar-api, sonar-web]` (filet de sécurité)
- [ ] **Branch protection rule sur `master`** active avec les 5 checks requis : `Lint`, `Tests front + couverture`, `Tests API .NET + couverture`, `SonarCloud — Front`, `SonarCloud — API .NET`
- [ ] **Pull request requise** pour merger sur master (block force pushes)
- [ ] **PR decoration SonarCloud** active : commentaire automatique sur chaque PR avec issues/coverage du diff
- [ ] Couverture API > 0% sur SonarCloud (preuve que Cobertura est lu)
- [ ] Couverture front > 0% sur SonarCloud (preuve que lcov est lu)
- [ ] 2 badges Sonar visibles dans le README, statut "Passed"
- [ ] Doc `docs/v1-produit/securite-ci.md` créée et complète sur § 23
- [ ] 6 cases § 23 cochées dans `livraison-v1.md`
- [ ] `pnpm run verify:local` passe en vert
