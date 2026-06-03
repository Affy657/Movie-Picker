# 08 — Veille technique, technologique & réglementaire

> **RNCP 39583 — C1.3.1** : « Une synthèse des sources d'information est présentée et permet d'identifier la stratégie de veille mise en œuvre et les objectifs visés, une explication des outils de veille sélectionnés, les bénéfices attendus. Les évolutions techniques, technologiques ou réglementaires issues de la veille sont classifiées et justifiées au regard de leur impact métier et environnemental. »

---

## 1. Stratégie de veille & objectifs

| Objectif | Description |
|----------|-------------|
| **Sécurité** | Détecter les failles et CVE affectant les dépendances et l'architecture (OWASP, NVD) |
| **Maintenabilité** | Suivre les versions LTS et les évolutions des frameworks (.NET, React, Vite) |
| **Conformité** | Suivre l'évolution réglementaire (RGPD, accessibilité RGAA) |
| **Éco-conception** | Identifier les pratiques réduisant l'impact environnemental (GreenIT) |

> **Posture** : veille **automatisée en priorité** (cohérent avec le contexte solo — minimiser l'effort manuel), complétée par une veille humaine ciblée sur les sources officielles.

---

## 2. Sources d'information consultées

### Veille technique & technologique

| Domaine | Source | Format |
|---------|--------|--------|
| .NET | [.NET Blog](https://devblogs.microsoft.com/dotnet/) | Blog / RSS |
| React | [React Blog](https://react.dev/blog) | Blog / RSS |
| Vite | [Vite Changelog](https://vite.dev/) | Releases GitHub |
| TanStack | [TanStack Blog](https://tanstack.com/) | Blog / Discord |
| MongoDB | [MongoDB Blog](https://www.mongodb.com/blog) | Blog |
| Cloud | Release notes GCP Cloud Run / AWS | Changelog |

### Veille sécurité

| Source | Usage |
|--------|-------|
| [OWASP Top 10](https://owasp.org/Top10/) | Référentiel failles applicatives |
| [GitHub Security Advisories](https://github.com/advisories) | Alertes dépendances |
| [CVE / NVD](https://nvd.nist.gov/) | Base CVE officielle |
| [Have I Been Pwned](https://haveibeenpwned.com/) | Fuites de données |

### Veille réglementaire

| Source | Usage |
|--------|-------|
| [CNIL — actualités](https://www.cnil.fr/fr/actualites) | RGPD, cookies, données personnelles |
| [RGAA / DINUM](https://accessibilite.numerique.gouv.fr/) | Accessibilité numérique |
| [GreenIT](https://www.greenit.fr/) | Éco-conception web |

---

## 3. Outils de veille

| Outil | Type | Rôle dans le projet | Statut |
|-------|------|---------------------|--------|
| **Dependabot** | Automatisé | PR automatiques de mise à jour (npm + GitHub Actions + NuGet), fréquence mensuelle | ✅ Actif (`.github/dependabot.yml`) |
| **`pnpm audit` / `dotnet list package --vulnerable`** | Automatisé (CI) | Détection CVE à chaque pipeline | ✅ Actif |
| **Trivy** | Automatisé (CI) | Scan CVE de l'image Docker | ✅ Actif |
| **Gitleaks** | Automatisé (CI) | Détection de secrets dans l'arbre Git | ✅ Actif |
| **GitHub Watch** | Semi-auto | Suivi des releases des dépôts clés (.NET, React, Vite) | À activer |
| **Agrégateur RSS** (Feedly / FreshRSS) | Manuel | Centraliser les flux blogs/sécurité/réglementaire | À mettre en place |

> **Bénéfice attendu** : la part automatisée (Dependabot + scans CI) garantit une **réactivité quasi temps réel** sur les vulnérabilités sans charge humaine, libérant le temps de veille pour l'analyse des évolutions de fond.

---

## 4. Classification des évolutions issues de la veille

> Tableau **évolution → impact métier → impact environnemental → action** (critère de la grille).

| Évolution veillée | Impact métier | Impact environnemental | Action / décision |
|-------------------|---------------|------------------------|-------------------|
| **.NET 10 LTS** | Support long, stabilité du socle API | Neutre (runtime optimisé, AOT/trim possible) | **Adopté** — base de la stack (cf. comparatif) |
| **OWASP Top 10 (édition courante)** | Cadre les mesures de sécurité | Neutre | **Intégré** — mapping dans owasp-top-10.md |
| **Images Docker `chiseled`/`alpine`** | Surface d'attaque réduite | **Positif** — image plus légère, moins de stockage/transfert | **Piste** — à arbitrer (compatibilité ICU) |
| **Évolutions RGAA / OPQUAST** | Conformité accessibilité | Neutre | **Suivi** — référentiel a11y choisi (cf. accessibilite.md) |
| **CNIL — cookies & consentement** | Conformité RGPD | Neutre | **Suivi** — CMP conditionnée à l'ajout d'analytics (backlog) |
| **Scale-to-zero serverless** | Élasticité, coût | **Positif** — zéro conso à l'idle | **Adopté** — Cloud Run |
| **CVE dépendances (flux continu)** | Sécurité | Neutre | **Traité en continu** — Dependabot + scans CI bloquants |

> Chaque évolution est **justifiée** au regard de son double impact (métier + environnemental), conformément au critère. Les évolutions à impact environnemental positif (images chiseled, scale-to-zero) sont **priorisées** lorsqu'elles n'introduisent pas de régression fonctionnelle.

---

*Voir aussi : [`06-swot.md`](06-swot.md) (opportunités/menaces — C1.2.1), [`07-risques.md`](07-risques.md) (risques — C1.2.3), [`../owasp-top-10.md`](../bloc-2-conception-developpement/owasp-top-10.md) (sécurité applicative — C2.2.3).*
