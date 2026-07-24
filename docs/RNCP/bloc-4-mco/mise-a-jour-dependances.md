# Processus de mise à jour des dépendances (C4.1.1)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 5
>
> **Objectif du critère (C4.1.1)** : décrire le processus de mise à jour des dépendances en précisant la **fréquence**, le **périmètre logiciel** concerné et le **type** de mise à jour (automatique ou manuel), la surveillance des nouvelles versions, l'évaluation des impacts et l'intégration sécurisée.

## 1. Périmètre logiciel

Movie Picker est un monorepo à deux applications et plusieurs chaînes d'outillage. Quatre écosystèmes de dépendances y coexistent, tous sous surveillance :

| Écosystème | Manifeste | Contenu surveillé |
|------------|-----------|-------------------|
| **npm / pnpm** | `pnpm-lock.yaml` (racine + workspace `apps/*`) | Front React/TypeScript, outillage de build et de test |
| **NuGet** | `apps/api-dotnet/**/*.csproj` | API .NET, y compris les dépendances transitives |
| **GitHub Actions** | `.github/workflows/*.yml` | Actions du pipeline, **épinglées par SHA de commit** |
| **Images Docker** | `apps/api-dotnet/MoviePicker.Api/Dockerfile` | Images de base de l'API, **épinglées par digest `sha256`** |

L'épinglage par SHA et par digest est une mesure anti-chaîne d'approvisionnement : une action ou une image ne peut pas changer de contenu sous une même étiquette. En contrepartie, ces références doivent être mises à jour explicitement — d'où leur intégration au périmètre automatisé.

**Exclusion assumée** : les slides Slidev archivées (`archive/docs/RNCP/bloc-1-cadrage/slides`) sont un manifeste figé, hors production, où Dependabot est neutralisé (`ignore: "*"`). Sans cela, les mises à jour de sécurité échouent en boucle sur des dépendances transitives d'un projet qui n'est plus maintenu et n'est jamais déployé.

## 2. Fréquence

Trois rythmes complémentaires, du plus lent au plus rapide :

| Rythme | Mécanisme | Rôle |
|--------|-----------|------|
| **Mensuel** | Dependabot — une pull request **groupée** par écosystème (`open-pull-requests-limit` de 2 à 3) | Maintenir le socle à jour sans noyer le projet sous les PR |
| **Hebdomadaire** | `security-scan.yml`, lundi 04 h 17 UTC — Trivy sur l'ensemble du dépôt, sévérités HIGH et CRITICAL bloquantes | Capter les vulnérabilités divulguées **entre deux cycles Dependabot** |
| **À chaque commit** | Job `audit` du pipeline — Trivy sur `pnpm-lock.yaml` + `dotnet list package --vulnerable --include-transitive` | Interdire l'introduction d'une dépendance vulnérable, et bloquer le déploiement si une CVE est publiée entretemps |

Le choix d'une cadence **mensuelle groupée** plutôt qu'hebdomadaire est délibéré : sur un projet à développeur unique, une pluie de pull requests individuelles produit de la fatigue et des fusions non relues. Le filet de sécurité réel n'est pas la fréquence de Dependabot, mais le scan hebdomadaire et l'audit à chaque commit, tous deux **bloquants**.

## 3. Type de mise à jour : ce qui est automatique, ce qui ne l'est pas

| Étape | Automatique | Manuel |
|-------|:-----------:|:------:|
| Surveillance des nouvelles versions | ✅ Dependabot | |
| Détection des vulnérabilités | ✅ Trivy, `dotnet list --vulnerable`, alertes Dependabot | |
| Ouverture de la pull request de montée de version | ✅ Dependabot | |
| Exécution des tests et portes de qualité | ✅ CI complète sur la PR | |
| **Évaluation de l'impact et décision de fusion** | | ✅ **Développeur** |
| Montée de version majeure | | ✅ **Développeur** |
| Déploiement après fusion | ✅ CI/CD | |

**Aucune fusion automatique.** La proposition est automatisée, la décision ne l'est pas : une montée de version peut passer les tests tout en changeant un comportement non couvert. Les PR ouvertes par Dependabot s'exécutent d'ailleurs **sans accès aux secrets du dépôt** — l'analyse SonarCloud y est donc désactivée, ce qui exige une relecture humaine avant fusion.

## 4. Évaluation de l'impact avant intégration

Chaque montée de version est jugée sur quatre points :

1. **Nature du changement** — correctif, mineure ou majeure. Une majeure déclenche systématiquement la lecture des notes de version.
2. **Exploitabilité réelle de la vulnérabilité** — le code vulnérable est-il atteignable dans cette application ? Une CVE portant sur un mode d'exécution non utilisé n'a pas le même poids qu'une faille sur un chemin actif.
3. **Surface d'impact** — nombre de fichiers concernés, présence des symboles touchés dans le code, couverture de tests existante sur ces chemins.
4. **Vérification** — compilation, suite de tests complète, tests E2E, build de production, et audit Lighthouse. Ces contrôles étant bloquants en CI, une régression détectable ne peut pas atteindre la production.

En cas de vulnérabilité sans correctif disponible (`ignore-unfixed`), l'exposition est documentée et réévaluée au scan hebdomadaire suivant.

## 5. Cas d'application — montée majeure sous contrainte de sécurité (25/07/2026)

**Détection.** Le job `audit` du pipeline échoue sur `GHSA-qwww-vcr4-c8h2` (HIGH) : `react-router` 7.18.1, corrigé en 8.3.0. Le déploiement est automatiquement bloqué — la porte joue son rôle.

**Évaluation de l'impact.**

- *Exploitabilité* : l'avis concerne le mode RSC (composants serveur React). L'application est une SPA pure — `<BrowserRouter>`, aucune occurrence de `@react-router/rsc`, `createStaticHandler` ni de rendu serveur. Le code vulnérable n'est pas atteignable.
- *Nature* : montée **majeure** (7.x → 8.x), donc ruptures possibles.
- *Surface* : 51 fichiers importent le routeur ; l'API utilisée se limite au cœur stable (`BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `Navigate`, `Outlet`, `MemoryRouter`, `useLocation`, `useNavigate`, `useParams`, `useSearchParams`).
- *Découverte structurante* : le paquet `react-router-dom` n'est plus publié au-delà de la 7.18.1 ; la ligne 8.x est distribuée sous le paquet unifié `react-router`. La montée impose donc un changement de paquet, pas seulement de version.

**Décision.** Bien que la faille ne soit pas exploitable dans ce contexte, la montée est effectuée plutôt que neutralisée par une exception : l'API utilisée est stable, la couverture de tests est forte, et supprimer la cause vaut mieux que documenter une dérogation à réexaminer indéfiniment.

**Intégration.** Remplacement du paquet, réécriture des imports sur les 51 fichiers, puis vérification : TypeScript sans erreur, ESLint sans erreur, **575 tests front au vert**, build de production et génération du service worker corrects, tests E2E et audit Lighthouse validés en CI.

**Résultat.** La CVE disparaît de l'audit, le pipeline repasse au vert et le déploiement bloqué reprend son cours. Durée totale : moins d'une heure, sans aucune adaptation de code applicatif.

## 6. Correctifs de sécurité hors cycle

Lorsque des alertes s'accumulent entre deux cycles mensuels, elles sont traitées en un lot dédié plutôt qu'en attendant Dependabot. Le 23/07/2026, huit alertes (six HIGH, deux LOW) ont ainsi été résolues en une passe : montées directes lorsque c'était possible, et `overrides` pnpm pour les dépendances transitives non exposées par leur parent (`brace-expansion`, `fast-uri`, `shell-quote`, `dompurify`, `linkify-it`, `js-yaml`), avec relance de la suite de tests avant fusion.

## 7. Traçabilité

Chaque mise à jour laisse une trace exploitable : pull request Dependabot ou commit dédié, exécution de CI associée, entrée au CHANGELOG lorsque la mise à jour a un effet observable, et référence de l'avis de sécurité (`GHSA-…`) dans le message de commit. L'historique répond ainsi à la question « quand cette dépendance a-t-elle été mise à jour, et pourquoi ? » sans recourir à la mémoire du développeur.

## 8. Limites connues

- Le scan npm s'appuie sur **Trivy** et non sur `pnpm audit` : l'endpoint d'audit npm utilisé par pnpm a été retiré le 15/07/2026 (`pnpm/pnpm#11265`). Trivy lit directement `pnpm-lock.yaml` et couvre le même besoin.
- L'audit NuGet échoue sur les sévérités High et Critical ; une exception délibérée passerait par `<NuGetAuditSuppress>` dans `Directory.Build.props`, avec justification écrite. Aucune n'est active à ce jour.
- Les montées de version majeures restent des décisions manuelles : aucune automatisation ne peut juger de l'acceptabilité d'une rupture d'API.
