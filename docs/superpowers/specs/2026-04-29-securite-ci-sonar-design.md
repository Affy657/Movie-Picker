# Sécurité CI — SonarCloud (§ 23) — Design V1

> Spec d'implémentation issue d'une session brainstorming. Cible : cocher les 6 cases du **§ 23** ([`docs/v1-produit/livraison-v1.md`](../../v1-produit/livraison-v1.md) lignes 282–287) et la ligne 272 du § 22 (« Sécurité CI : Sonar gate ... actif en CI »).
>
> **Statut** : validé pour implémentation — voir prochaine étape `writing-plans`.
>
> **Périmètre strict** : uniquement § 23 (Sonar). Les § 24 (NuGet vulnerable), § 25 (scan image Docker) et § 26 (secret scanning) sont **hors périmètre** de cette spec mais la doc `securite-ci.md` créée ici servira de point d'entrée commun pour les couvrir ensuite.

## 1. Contexte

Le repo Movie Picker (monorepo pnpm + Turborepo) contient deux stacks distincts :

- **API .NET** (`apps/api-dotnet/`, .NET 10, MongoDB) — solution `MoviePicker.slnx` avec 3 projets : `MoviePicker.Api`, `MoviePicker.Api.Tests` (xUnit + coverlet), `MoviePicker.Api.IntegrationTests`
- **Front** (`apps/web/`, React 19 + Vite + TypeScript strict) — tests Vitest avec coverage v8

Le pipeline CI ([`.github/workflows/ci-cd.yml`](../../../.github/workflows/ci-cd.yml)) tourne sur `master` **et sur les pull requests vers `master`** (le repo est en train de basculer vers un flow `1 feature = 1 branche → PR → review/CI → merge`). Le déploiement vers Cloud Run (API) + S3/CloudFront (front) ne se déclenche que sur `push: master` (après merge de PR), via les jobs `docker-api`, `deploy-api`, `deploy-front` (gardés derrière un `if: github.event_name == 'push' && github.ref == 'refs/heads/master'`).

**État actuel observé** :

- Couverture front : Vitest v8 avec reporters `text` + `html` uniquement → **manque `lcov`** pour Sonar
- Couverture API : `dotnet test --collect:"XPlat Code Coverage"` génère du Cobertura, **mais uniquement sur les tests unitaires** (les tests d'intégration ne collectent pas de couverture)
- Aucun fichier `sonar-project.properties`, aucun job Sonar dans le workflow, aucun secret Sonar
- Aucune doc `docs/v1-produit/securite-ci.md`

Il manque toute la mécanique d'analyse statique demandée par la § 23.

## 2. Décisions structurantes

| Sujet | Décision | Raison |
|---|---|---|
| **Plateforme** | **SonarCloud** (SaaS) | Gratuit pour repo public, zéro infra à maintenir, PR decoration native, parfait pour un projet RNCP |
| **Périmètre Sonar** | **Deux projets séparés** : `movie-picker-api` + `movie-picker-web` | Le scanner MSBuild est requis pour les règles Roslyn (.NET) ; pratique recommandée par Sonar pour monorepo polyglotte |
| **Quality Gate** | **Sonar Way** par défaut, focus *new code* | Démarrage immédiat sans bloquer le legacy ; force la non-régression. 80% coverage exigé sur le code nouveau |
| **New Code period** | **30 jours glissants** | Pas de versioning manuel à maintenir, fenêtre roulante naturelle |
| **Couverture .NET** | **Unit + intégration agrégés** (Cobertura, deux paths à Sonar) | Couverture réaliste, gate atteignable sur les nouveaux endpoints |
| **Couverture front** | **Vitest v8 → reporter `lcov` ajouté** | Format natif Sonar (les reporters `text` / `html` sont conservés) |
| **Workflow CI** | **2 jobs dédiés** `sonar-api` + `sonar-web` parallèles, après `test-api` / `test-web` | Responsabilité unique, parallélisme, logs lisibles |
| **Scanner .NET** | `dotnet-sonarscanner` global tool (MSBuild integration) + Java 17 dans le runner | Standard Sonar pour C# |
| **Scanner front** | `SonarSource/sonarqube-scan-action@v6` (CLI) | Action officielle Sonar, support TS natif |
| **Tokens** | **Un seul `SONAR_TOKEN`** (User Token, scope global) dans GitHub Secrets | Simple, 1 mainteneur, faible blast radius en pratique |
| **Comportement gate** | **Double rempart** : (1) GitHub branch protection sur `master` exige les checks `sonar-api` + `sonar-web` verts pour merger une PR ; (2) en plus, `docker-api`, `deploy-api`, `deploy-front` dépendent de `[..., sonar-api, sonar-web]` côté yml (filet de sécurité si la branch protection est désactivée par erreur) | Conforme § 23 (« CI échoue si gate rouge ») ; un PR rouge ne peut pas être mergée, et même si elle l'était, le déploiement ne se déclencherait pas |
| **PR decoration** | **Activée** (commentaire automatique SonarCloud sur chaque PR avec issues / hotspots / coverage du diff) | Naturel avec le nouveau flow PR ; principal mécanisme de revue qualité avant merge |
| **Visibilité hors PR** | Commit status check sur master + 2 badges Sonar dans le README | Complément à la PR decoration pour la santé globale |
| **Documentation** | Nouvelle doc `docs/v1-produit/securite-ci.md` (couvrira progressivement § 23–26) + section/badges README | Cohérence : éviter de gonfler le README avec 4 outils CI à venir |

## 3. Architecture cible

### 3.1 Topologie SonarCloud

```
SonarCloud (Free tier, repo public)
└── Organization: <ORG_KEY>
    ├── Project: <ORG_KEY>_movie-picker-api
    │   ├── Source root: apps/api-dotnet/MoviePicker.Api/
    │   ├── Scanner: dotnet-sonarscanner (MSBuild)
    │   ├── Coverage: Cobertura (unit + intégration)
    │   ├── Quality Gate: Sonar Way (focus new code)
    │   └── New Code: 30 jours glissants
    │
    └── Project: <ORG_KEY>_movie-picker-web
        ├── Source root: apps/web/src/
        ├── Scanner: SonarSource/sonarqube-scan-action@v6 (CLI)
        ├── Coverage: lcov (vitest v8)
        ├── Quality Gate: Sonar Way (focus new code)
        └── New Code: 30 jours glissants
```

> `<ORG_KEY>` = clé d'organization SonarCloud (générée à l'import GitHub, à reporter dans tous les fichiers de config).

### 3.2 Flow CI

**Sur PR `feature/*` → `master`** :

```
lint
  ├─ test-web ───────► sonar-web ──┐
  │  (vitest + lcov)   (scan CLI)  │
  │                                │  ──► PR decoration sur GitHub
  │                                │      (commentaire Sonar automatique
  │                                │       avec issues/coverage du diff)
  └─ test-api ───────► sonar-api ──┘
     (xunit + coverage              ──► branch protection master exige
      unit + integration                 lint + test-web + test-api +
      Cobertura)        (scan            sonar-web + sonar-api ✅ pour merger
                        MSBuild)
  lighthouse (inchangé, non bloquant)

  ⚠ docker-api / deploy-api / deploy-front ne tournent PAS sur PR
    (gardés par if: github.event_name == 'push' && github.ref == 'refs/heads/master')
```

**Sur push `master` (après merge de PR)** :

```
lint ──► test-web ──► sonar-web ──┐
     ──► test-api ──► sonar-api ──┤──► docker-api ──► deploy-api
                                  │    (needs: [..., sonar-api, sonar-web]
                                  │     — filet de sécurité)
                                  └──► deploy-front
                                       (needs: [..., sonar-api, sonar-web])

  lighthouse (inchangé, non bloquant)
```

**Règles** :

- `sonar-web` et `sonar-api` tournent **en parallèle** (pas de `needs` croisé entre eux)
- Mode bloquant Sonar activé via `sonar.qualitygate.wait=true` → le job Sonar attend le verdict de la gate (~30–60 s) et échoue si rouge → le check GitHub passe en rouge → la PR ne peut pas être mergée
- Double rempart côté deploy : `docker-api`, `deploy-api`, `deploy-front` ont aussi `needs: [test-web, test-api, sonar-api, sonar-web]` — redondant en pratique avec la branch protection (du code rouge ne devrait pas atteindre master), mais garde-fou en cas de désactivation accidentelle de la protection

## 4. Modifications par fichier

### 4.1 `.github/workflows/ci-cd.yml`

> **Note rollout** : les snippets ci-dessous montrent l'**état final** (mode bloquant activé, `needs: sonar-*` sur les jobs deploy). Le plan de bascule § 6 décrit comment introduire ces changements en deux temps : d'abord `qualitygate.wait=false` sans `needs:` deploy (étape 1, audit), puis bascule en `true` + `needs:` (étape 3, blocage actif).

**A. Job `test-api` modifié** : ajouter la collecte de couverture sur les tests d'intégration et l'upload de l'artifact correspondant.

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

**B. Nouveau job `sonar-api`** :

```yaml
sonar-api:
  name: SonarCloud — API .NET
  needs: test-api
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
      with:
        fetch-depth: 0  # Sonar a besoin du blame complet
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
          /d:sonar.qualitygate.wait=true
    - name: Build API
      run: dotnet build apps/api-dotnet/MoviePicker.slnx -c Release
    - name: SonarCloud end
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      run: dotnet sonarscanner end /d:sonar.token="$SONAR_TOKEN"
```

> Note format de couverture : `dotnet test --collect:"XPlat Code Coverage"` (via `coverlet.collector`) produit du **Cobertura** (fichiers `coverage.cobertura.xml`), d'où l'utilisation de `sonar.cs.cobertura.reportsPaths`. Si on voulait OpenCover il faudrait passer `--collect:"XPlat Code Coverage;Format=opencover"` et utiliser `sonar.cs.opencover.reportsPaths`. Vérifier au runtime que les paths sont bien repris dans les logs Sonar (`INFO: Sensor C# Cobertura ...`).

**C. Nouveau job `sonar-web`** :

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
          -Dsonar.qualitygate.wait=true
```

> La conf projet (key, organization, sources, exclusions, lcov path) est dans `apps/web/sonar-project.properties` (cf. § 4.3).

**D. Jobs `docker-api`, `deploy-api`, `deploy-front` modifiés** : ajout des `needs`.

```yaml
docker-api:
  needs: [test-web, test-api, sonar-api, sonar-web]
  ...

deploy-api:
  needs: docker-api  # inchangé, transitif via docker-api
  ...

deploy-front:
  needs: [test-web, test-api, sonar-api, sonar-web]
  ...
```

### 4.2 `apps/web/vitest.config.ts`

Ajout de `lcov` aux reporters de couverture et explicitation du dossier de sortie :

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

### 4.3 `apps/web/sonar-project.properties` (nouveau)

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

### 4.4 `apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj`

Vérifier la présence de `coverlet.collector` (déjà présent dans `MoviePicker.Api.Tests`). L'ajouter si absent :

```xml
<PackageReference Include="coverlet.collector" Version="8.0.1">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
</PackageReference>
```

### 4.5 `docs/v1-produit/securite-ci.md` (nouveau)

Structure de la doc :

1. **Vue d'ensemble** — les 4 piliers § 23–26 ; uniquement § 23 livré en V1, autres en TODO documentée
2. **§ 23 — SonarCloud**
   - Topologie (org SonarCloud + 2 projets)
   - Setup initial (étapes humaines, voir § 5 de cette spec)
   - Configuration des projets : Quality Gate Sonar Way, New Code = 30 days, désactivation Automatic Analysis
   - Secret GitHub : `SONAR_TOKEN` (un seul, User Token global)
   - Comportement CI : push master → tests → Sonar → si gate rouge, deploy bloqué → fix + re-push
   - Lecture d'un rapport : URLs SonarCloud, badges README, status check sur le commit GitHub
   - Procédure de rotation du token : régénérer dans SonarCloud → mettre à jour le secret GitHub → re-run du dernier workflow
   - Limite : analyse skip sur PR depuis fork (pas de secret) — non-bloquant pour projet solo
3. **§ 24 — Dépendances NuGet** — `TODO V1` (pointeur vers § 24 livraison-v1.md)
4. **§ 25 — Scan image Docker** — `TODO V1` (pointeur vers § 25)
5. **§ 26 — Secret scanning** — `TODO V1` (pointeur vers § 26)

### 4.6 `README.md`

**A. Ajout de 2 badges en haut du README** (juste sous le titre `# Movie Picker`) :

```markdown
[![Quality Gate API](https://sonarcloud.io/api/project_badges/measure?project=<ORG_KEY>_movie-picker-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=<ORG_KEY>_movie-picker-api)
[![Quality Gate Web](https://sonarcloud.io/api/project_badges/measure?project=<ORG_KEY>_movie-picker-web&metric=alert_status)](https://sonarcloud.io/dashboard?id=<ORG_KEY>_movie-picker-web)
```

**B. Ligne ajoutée dans la table « Services utilisés »** :

```markdown
| **SonarCloud** | SAST | Analyse statique CI (gates bloquantes pour le déploiement). Voir [`docs/v1-produit/securite-ci.md`](docs/v1-produit/securite-ci.md). |
```

### 4.7 `docs/v1-produit/livraison-v1.md`

Cocher au fur et à mesure les 6 cases du § 23 (lignes 282–287) puis la ligne 272 du § 22 (sécurité CI globale — uniquement quand § 24, § 25, § 26 seront aussi faits).

## 5. Étapes humaines préalables (côté SonarCloud + GitHub)

> Ces étapes sont à faire **avant** le premier push avec les modifications CI, sinon le job `sonar-api` / `sonar-web` échouera (token absent, projet inexistant).
>
> Conformément aux guardrails du repo, ces opérations cloud ne peuvent pas être effectuées par l'agent.

1. **Créer un compte SonarCloud** (https://sonarcloud.io) en se connectant avec le compte GitHub mainteneur
2. **Importer l'organization GitHub** dans SonarCloud (plan **Free** pour repo public)
   - Noter la clé d'organization générée (= `<ORG_KEY>`)
3. **Créer le projet `movie-picker-api`** :
   - Setup → Manual analysis → "With GitHub Actions"
   - **Désactiver Automatic Analysis** (Project Settings → Analysis Method → Off) — sinon double scan + conflit avec MSBuild
   - Project Settings → New Code → choisir **"Number of days = 30"**
   - Quality Gate : laisser **Sonar Way** (par défaut, rien à faire)
   - Noter le Project Key complet : `<ORG_KEY>_movie-picker-api`
4. **Créer le projet `movie-picker-web`** : même procédure, key `<ORG_KEY>_movie-picker-web`
5. **Générer le token Sonar** :
   - SonarCloud → Account → Security → Generate Token
   - Type : **User Token**, scope global, nom suggéré : `movie-picker-ci`
   - Copier la valeur (visible une seule fois)
6. **Déposer le secret GitHub** :
   - GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   - Name : **`SONAR_TOKEN`**
   - Value : token copié à l'étape 5
7. **Transmettre `<ORG_KEY>` à l'implémentation** : remplacer toutes les occurrences `<ORG_KEY>` dans le yml et `sonar-project.properties` avant le premier push
8. **Configurer la GitHub Branch Protection sur `master`** (à faire **après** que `sonar-api` et `sonar-web` aient tourné au moins une fois sur une PR — sinon GitHub ne propose pas ces checks dans la liste) :
   - GitHub repo → Settings → Branches → Add branch ruleset (ou edit la rule existante sur `master`)
   - Branch name pattern : `master`
   - Cocher : **Require a pull request before merging** (avec ou sans review obligatoire selon préférence)
   - Cocher : **Require status checks to pass before merging**
     - Cocher : **Require branches to be up to date before merging**
     - Search and add les checks requis : `Lint`, `Tests front + couverture`, `Tests API .NET + couverture`, `SonarCloud — Front`, `SonarCloud — API .NET`
   - Cocher : **Block force pushes**
   - Save

## 6. Plan de bascule (rollout)

> **Contrainte clé** : la GitHub Branch Protection ne peut référencer un check de status qu'**après** qu'il ait tourné au moins une fois sur le repo. Donc l'ordre **doit** être : (1) introduire les jobs Sonar en mode informatif via une 1re PR, (2) auditer/fixer, (3) durcir + configurer la branch protection.

### Étape 1 — Première PR : introduire les jobs en mode informatif

**Objectif** : valider que les jobs Sonar tournent sur PR et postent des résultats à SonarCloud, sans encore exiger qu'ils soient verts.

- Créer une branche `feature/sonar-init` (ou similaire)
- Push de tout le code (workflow + sonar-project.properties + vitest config + doc) **avec `sonar.qualitygate.wait=false`**
- ⚠️ **Ne pas encore brancher les `needs: sonar-*`** sur `docker-api` / `deploy-front` à ce stade (les jobs deploy ne tournent pas sur PR de toute façon, mais on évite la confusion en gardant le yml cohérent jusqu'au durcissement)
- Ouvrir une PR `feature/sonar-init → master`
- 1re CI tourne sur la PR : tests + Sonar non-bloquant
- Inspecter le commentaire SonarCloud sur la PR + les rapports https://sonarcloud.io/projects
- Merger la PR (squash recommandé) → master prend le code → CI master tourne → premier passage de Sonar sur master

### Étape 2 — Mitigation des blockers initiaux

**Si une gate est rouge sur le 1er run** (probable vu coverage front actuel ~55%), faire des PRs courtes ciblées :

- Auditer les issues critiques (bugs, vulnérabilités, security hotspots) → fixer celles évidentes dans des PRs séparées
- Pour la couverture : si nécessaire, ajouter des exclusions (`sonar.exclusions`, `sonar.coverage.exclusions`) — ex. fichiers de stub, generated code — dans une PR dédiée
- Marquer les false positives via SonarCloud UI (Won't Fix / False Positive)
- Itérer jusqu'à ce que les **deux gates soient vertes** sur master

### Étape 3 — Durcissement (PR + GitHub UI)

**Une fois les deux gates vertes** sur master :

1. **PR `feature/sonar-blocking`** : passer `sonar.qualitygate.wait=true` dans les deux jobs Sonar + ajouter `needs: [test-web, test-api, sonar-api, sonar-web]` à `docker-api` et `deploy-front`. Cette PR doit elle-même passer les checks Sonar pour être mergée.
2. **Configurer la GitHub Branch Protection sur `master`** (après merge de la PR ci-dessus) :
   - Settings → Branches → Add ruleset
   - Required status checks : `Lint`, `Tests front + couverture`, `Tests API .NET + couverture`, `SonarCloud — Front`, `SonarCloud — API .NET`
   - Require PR before merging, block force pushes
   - Cf. § 5 étape 8 pour le détail

### Étape 4 — Régime de croisière

- Toute nouvelle feature : `feature/<nom>` → push → PR → CI tourne → si gate rouge, PR bloquée par la branch protection → fix dans la même branche → push → CI rejoue → PR débloquée
- Filet de sécurité : même si la branch protection est désactivée par erreur, les `needs: sonar-*` côté yml empêchent un déploiement avec gate rouge

## 7. Limites connues

1. **PRs depuis forks** : SonarCloud skip silencieusement (le secret `SONAR_TOKEN` n'est pas exposé aux workflows déclenchés depuis un fork — sécurité standard GitHub Actions). N/A pour projet solo, à noter si contributeurs externes un jour.
2. **Couverture `text` reporter Vitest** : conservé en plus du `lcov` pour l'affichage console local (DX).
3. **Build .NET joué deux fois** dans le CI (job `lint` avec `-warnaserror`, job `sonar-api` pour le scanner). Coût ~30 s, acceptable. Optimisation possible plus tard via cache NuGet ou unification des jobs.
4. **Java 17 requis** dans `sonar-api` (par dotnet-sonarscanner). Léger overhead de setup (~15 s), irréductible.
5. **Tests d'intégration avec `MONGODB_URI=""`** : actuellement ils tournent sans Mongo réel (probablement Mongo en mémoire ou stub via `MoviePickerApplicationFactory`). À vérifier au runtime que la collecte coverage produit bien un fichier non vide dans `coverage-integration/`.
6. **Quality Gate « Sonar Way »** : peut évoluer côté SonarSource. Acceptable car ces évolutions visent à durcir la qualité.
7. **Branch protection ne peut pas être configurée avant le 1er run Sonar** : les checks `SonarCloud — API .NET` et `SonarCloud — Front` ne sont sélectionnables dans GitHub UI qu'après leur première exécution. D'où l'ordre du rollout § 6 (étape 1 PR informative → étape 3 durcissement + branch protection).
8. **Si la branch protection est désactivée par erreur** : le filet de sécurité côté yml (`needs: sonar-*` sur les jobs deploy) empêche le déploiement d'une régression mergée à tort. Master peut prendre un commit rouge, mais la prod reste sur l'avant-dernière version déployée.

## 8. Tests / vérification

Pas de tests unitaires à écrire (configuration CI). Vérification manuelle en plusieurs étapes :

1. **Local** : `pnpm --filter web run test:coverage` doit générer `apps/web/coverage/lcov.info` (fichier non vide, > 0 octets)
2. **Local** : `dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj --collect:"XPlat Code Coverage" --results-directory ./tmp-cov` doit générer un fichier `coverage.cobertura.xml` non vide dans un sous-dossier de `tmp-cov/`
3. **CI étape 1** (mode informatif) : push sur master → vérifier que les jobs `sonar-api` et `sonar-web` apparaissent dans Actions, terminent en succès (vert), et qu'un projet est bien créé/updaté sur sonarcloud.io
4. **CI étape 3** (mode bloquant) : si la gate est verte → ✅ deploy passe. Tester un commit volontairement régressif (ex. introduire un `eval()` interdit) → vérifier que `sonar-web` échoue et que `deploy-front` est skip (en attente)
5. **Vérifier les badges** : ils doivent afficher "Passed" sur le README une fois la CI verte
6. **Vérifier le commit status** : sur la page du commit dans GitHub, le status `SonarCloud Code Analysis` doit apparaître à côté des autres checks

## 9. Cases à cocher dans `livraison-v1.md` (§ 23)

À cocher dans cet ordre au cours de l'implémentation :

- [ ] Créer projet Sonar (étapes § 5.1 à 5.4 de cette spec)
- [ ] Déposer `SONAR_TOKEN` dans GitHub Secrets (étape § 5.6)
- [ ] Ajouter l'analyse en CI (jobs `sonar-api` + `sonar-web` dans `ci-cd.yml`)
- [ ] Brancher les rapports de couverture (lcov front + cobertura agrégé API)
- [ ] Définir Quality Gate (Sonar Way par défaut, mode bloquant via `sonar.qualitygate.wait=true` + `needs:` sur deploy)
- [ ] Documenter (`docs/v1-produit/securite-ci.md` + section + badges README)

## 10. Hors périmètre (rappels)

- **§ 24 — `dotnet list package --vulnerable`** : sera ajouté dans une spec dédiée
- **§ 25 — Scan CVE image Docker (Trivy/Grype)** : sera ajouté dans une spec dédiée
- **§ 26 — GitHub Secret scanning + Gitleaks/TruffleHog** : sera ajouté dans une spec dédiée
- **Refactor de la couverture front pour atteindre 80% on new code** : pas dans cette spec ; la gate le révèlera et l'augmentation de couverture se fera dans les PR / commits suivants au fil de l'eau
- **Performance / cache NuGet** : potentielle optimisation future, pas en V1
