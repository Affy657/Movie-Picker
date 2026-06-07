# 00b — Contenu des diapositives (Bloc 1)

> **Document de travail** : contenu complet, diapo par diapo, à reporter dans l'outil de présentation.
> **Principe** : la prestation est **improvisée à partir de la diapo** → chaque diapo est **auto-suffisante** et porte **toutes les informations attendues par le référentiel RNCP**. Le code compétence figure en **pied de page** (mapping jury).

---

## Gabarit commun (masque à appliquer à toutes les diapos)

| Zone | Contenu |
|------|---------|
| **Bandeau haut (gauche)** | Numéro + nom du chapitre (ex. « 1 · Parties prenantes ») |
| **Titre** | Titre de la diapo (orienté client) |
| **Corps** | Contenu listé ci-dessous (puces / mini-tableaux / visuel) |
| **Pied de page (gauche)** | « Movie Picker — Cadrage projet · Bloc 1 » |
| **Pied de page (centre)** | Code compétence RNCP + `ÉLIMINATOIRE` le cas échéant |
| **Pied de page (droite)** | Numéro de diapo « N / 18 » |

> Diapo de titre et diapo annexe : sans numérotation de chapitre.
> Charte conseillée : 1 couleur d'accent, police ≥ 24 pt pour le corps, le **visuel occupe ~50 %** de la diapo.

---

## Diapo 1 — Titre

**Titre :** Movie Picker — Cadrage d'un projet de développement logiciel
**Sous-titre :** [Prénom NOM] · RNCP 39583 — Expert en développement logiciel · **Bloc 1 : Cadrer un projet**
**Accroche :** « Choisir un film à plusieurs, vite et équitablement — sans débat interminable. »

**Agenda (11 points) :**
1. Parties prenantes · 2. Analyse de la demande · 3. Faisabilité · 4. Étude comparative · 5. Charge & fonctions · 6. SWOT · 7. Risques · 8. Veille · 9. Architecture · 10. Budget · 11. Décisions & argumentaire

**Pied de page :** Movie Picker — Cadrage projet · Bloc 1 — RNCP 39583 · [date]

---

## Diapo 2 — Cartographie des parties prenantes

**Bandeau :** 1 · Parties prenantes

**Contenu de la diapo :**
- **Commanditaire** — Formateur / jury Ynov : définit le cadre, valide les livrables, évalue (implication **élevée**, décisionnaire).
- **Équipe projet (solo)** — un seul intervenant cumulant **développeur** + **architecte** + **administrateur / DevOps** (implication permanente).
- **Utilisateurs finaux** — **hôtes** (créent / configurent / lancent la roue) · **participants** (rejoignent via lien, **compte requis**) · **testeurs / pairs** (recette, ponctuel).
- **Acteurs externes** — **TMDB** (métadonnées films, *critique*) · **GCP / AWS / MongoDB Atlas** (infrastructure, *critique*) · **Resend** (emails, *moyen*) · **GitHub Actions** (CI/CD) · **Dependabot / Trivy / Gitleaks / SonarCloud** (qualité / sécurité, *continu*).
- Cumul solo assumé → compensé par **automatisation maximale**.

**Visuel :** mindmap des parties prenantes (commanditaire / équipe / utilisateurs / externes).

**Pied de page :** C1.1.1 — **ÉLIMINATOIRE** · 2 / 18

---

## Diapo 3 — À qui s'adresse le produit ? (personas)

**Bandeau :** 1 · Parties prenantes

**Contenu de la diapo :**
- **Léa, 26 ans — l'hôte organisatrice** : smartphone, crée la soirée à l'avance, partage le lien, lance la roue. Attend : créer vite, paramétrer, garder le contrôle.
- **Tom, 22 ans — le participant** : smartphone uniquement, reçoit un lien → **inscription express → redirection auto sur la soirée** (`returnTo`), propose/vote. Pseudo affiché = nom du compte.
- **Le groupe récurrent (4-8 amis)** : usage répété, **compte** pour retrouver « Mes soirées », historique, marqueur « déjà vu ».
- **Transverse** : **mobile-first** (~375 px) · **compte obligatoire pour tous** (plus de pseudo anonyme) · accessibilité dès la conception.

**Visuel :** 3 fiches personas (icône + profil + attente clé).

**Pied de page :** C1.1.1 — **ÉLIMINATOIRE** · 3 / 18

---

## Diapo 4 — Le problème à résoudre (analyse de la demande)

**Bandeau :** 2 · Analyse de la demande

**Contenu de la diapo :**
- **Problématique** : « Comment permettre à un groupe d'amis de choisir un film ensemble, rapidement et équitablement, sans 30 min de débat ni outil contraignant ? »
- **Besoins par partie prenante** : hôte → organiser / contrôler · participant → rejoindre simplement · groupe → historique / éviter les redites · tous → décider vite et équitablement.
- **Objectifs** : choix collectif rapide · équité (vote + roue) · friction maîtrisée · dimension ludique.
- **Enjeux** : adoption · engagement · confiance / sécurité · conformité (RGPD, a11y) · soutenabilité (solo, budget).
- **Pistes retenues** : vote up/down + roue · lien partagé + inscription rapide · métadonnées TMDB · marqueur « déjà vu » · compte pour tous.

**Visuel :** tableau « besoin → traduction produit » (ou problématique en grand format).

**Pied de page :** C1.1.2 · 4 / 18

---

## Diapo 5 — La démarche d'audit & le diagnostic

**Bandeau :** 3 · Faisabilité

**Contenu de la diapo :**
- **Contexte** : projet **greenfield** (aucun système legacy) → « l'existant » audité = l'environnement technique disponible.
- **Démarche** : grille d'analyse descendante en **5 étapes** — besoins → exigences non fonctionnelles → contraintes → ressources → avis critique.
- **Étude technique** : langages disponibles (TypeScript, C#/.NET, Node, Python) · bases candidates (**MongoDB** retenu, PostgreSQL, SQLite écarté) · architecture cible SPA + API REST + BDD document · services externes (TMDB, Resend, GCP, AWS, Atlas, GitHub Actions).

**Visuel :** flowchart de la démarche d'audit en 5 étapes.

**Pied de page :** C1.2.2 — **ÉLIMINATOIRE** · 5 / 18

---

## Diapo 6 — Le projet est-il réalisable ?

**Bandeau :** 3 · Faisabilité

**Contenu de la diapo :**
- **Contraintes techniques** : architecture distribuée (CORS strict, cookies cross-site) · HTTPS · mobile-first · multi-instance (état en base) · conteneur Linux.
- **Contraintes financières** : ≤ ~15 €/mois → **free tiers prioritaires**.
- **Délais** : calendrier cursus, découpage par versions (MVP → migration .NET → V1 → V1.1).
- **Humaines** : projet **solo** → automatisation maximale.
- **Volume** : faible (dizaines à centaines d'utilisateurs, < 512 Mo, pics ponctuels).
- ✅ **Verdict : GO** — risques majeurs identifiés et atténués (TMDB → cache/repli · coût Cloud Run → scale-to-zero · CSRF → CORS + mesures · charge solo → automatisation).

**Visuel :** encadré « GO » + mini-tableau risques → atténuations.

**Pied de page :** C1.2.2 — **ÉLIMINATOIRE** · 6 / 18

---

## Diapo 7 — Quelles technologies, et pourquoi ? (1/2)

**Bandeau :** 4 · Étude comparative

**Contenu de la diapo :**
- **Méthode** : chaque brique comparée sur **6 critères** — sécurité · environnements systèmes · réseau · accessibilité · impact environnemental · coût.
- **Front** : **React + Vite + TS** (vs Next.js, SvelteKit) → build statique CDN, pas de serveur à durcir, a11y mature.
- **API** : **ASP.NET Core .NET 10 LTS** (vs Node/Express, Go) → typage fort, sécurité native (CORS, rate limit, antiforgery), support long.
- **BDD** : **MongoDB Atlas M0** (vs PostgreSQL, SQLite) → schéma souple, free tier, managé ; SQLite incompatible multi-instance.

**Visuel :** tableau de synthèse « brique → choix → justification dominante ».

**Pied de page :** C1.3.2 — **ÉLIMINATOIRE** · 7 / 18

---

## Diapo 8 — Hébergement, sécurité & ressources (2/2)

**Bandeau :** 4 · Étude comparative

**Contenu de la diapo :**
- **Hébergement API** : **GCP Cloud Run** (vs ECS Fargate, Scaleway) → **scale-to-zero**.
- **Hébergement front** : **AWS S3 + CloudFront** (vs Vercel, Netlify) → contrôle fin cache + en-têtes sécurité.
- **Authentification** : **sessions cookie HttpOnly** (vs JWT, OAuth) → token non exposé au JS, révocation serveur ; coût = gérer le cross-site (CORS + `SameSite=None; Secure` + anti-CSRF).
- **API films** : **TMDB** (vs OMDB, JustWatch) → données riches, gratuit, cache posters.
- **Ressources matérielles / techniques** : poste dev (Node, .NET SDK, Docker), comptes de service **tous en free tier**, **aucun serveur propre**.
- **Impact environnemental** : scale-to-zero + cache + front statique.

**Visuel :** schéma de la stack retenue (front / back / data + flux).

**Pied de page :** C1.3.2 — **ÉLIMINATOIRE** · 8 / 18

---

## Diapo 9 — Les fonctionnalités hiérarchisées

**Bandeau :** 5 · Charge & fonctions

**Contenu de la diapo :**
- **Outils d'analyse** : **MoSCoW** (priorisation) + **diagramme de fonctionnalités** / bête à cornes (hiérarchisation).
- **Bête à cornes** : à qui ? (un groupe d'amis) · sur quoi ? (la décision collective d'un film) · pour quoi ? (choisir vite, équitablement, de façon ludique).
- **Hiérarchie** : **principales** (créer/rejoindre/proposer/voter/roue/compte) · **secondaires** (config hôte, déjà vu, historique, watch providers, QR, MDP oublié, OG, polling) · **complémentaires** (i18n, thème, rappels).
- **MoSCoW** : Must = MVP · Should/Could = V1 · Won't = V1.1.

**Visuel :** mindmap MoSCoW (principales / secondaires / complémentaires).

**Pied de page :** C1.4.1 — **ÉLIMINATOIRE** · 9 / 18

---

## Diapo 10 — Combien de travail ? (jours-homme)

**Bandeau :** 5 · Charge & fonctions

**Contenu de la diapo :**
- **Méthode d'estimation** : analogique (comparaison entre lots), scénario probable, marge ± 20 %.
- **Charge** : MVP **27** · Migration .NET **13** · V1 produit **35** · Clôture RNCP **23** → **≈ 98 J/H**.
- **Couverture technique** : chaque fonction tracée → endpoint API → écran → tests (ex. créer = `POST /events` → CreateEvent → unit + intégration + E2E).
- **UX prise en compte** : mobile-first (zones ≥ 44 px), friction maîtrisée (`returnTo`), feedback clair, accessibilité.

**Visuel :** tableau de charge J/H par phase + total.

**Pied de page :** C1.4.1 — **ÉLIMINATOIRE** · 10 / 18

---

## Diapo 11 — Opportunités & menaces (SWOT)

**Bandeau :** 6 · SWOT

**Contenu de la diapo :**
- **Forces** : stack moderne maîtrisée · archi découplée · monorepo automatisé · mobile-first · sécurité tôt.
- **Faiblesses** : équipe solo · pas de canary/bleu-vert · pas d'analytics V1 · bi-cloud.
- **Opportunités** : free tiers · .NET 10 LTS · communauté React/TanStack · TMDB gratuit · scale-to-zero.
- **Menaces** : TMDB (rate limit/CGU) · dépendance cloud · CVE/OWASP · lien indexé · pic de coût.
- **Adhérences** externes toutes en free tier et découplées (repli TMDB/Resend).
- **Impact environnemental** : scale-to-zero, cache, front statique.

**Visuel :** matrice SWOT (4 quadrants).

**Pied de page :** C1.2.1 · 11 / 18

---

## Diapo 12 — Cartographie des risques

**Bandeau :** 7 · Risques

**Contenu de la diapo :**
- **Référentiel** : grille **Probabilité × Impact** (1-3), criticité 1-9 (🟢 1-2 / 🟡 3-4 / 🔴 6-9).
- **Risques techniques** (RT1-9) et **fonctionnels** (RF1-6) couvrant : **perte de données · interruption · dégradation · sécurité**.
- **Prioritaires 🔴** : **RT6 CSRF** (cookie cross-site) · **RF1 abandon utilisateur** (friction).
- **Indicateurs de contrôle** : taux 5xx · uptime `/health` · CVE High/Critical · CI verte/rouge · coût cloud · fuite de secret (Gitleaks).

**Visuel :** matrice des risques P × I (avec RT/RF positionnés).

**Pied de page :** C1.2.3 · 12 / 18

---

## Diapo 13 — La veille mise en place

**Bandeau :** 8 · Veille

**Contenu de la diapo :**
- **Stratégie** : **automatisée en priorité** (contexte solo) + veille humaine ciblée sur sources officielles.
- **Objectifs** : sécurité · maintenabilité (LTS) · conformité (RGPD/RGAA) · éco-conception.
- **Sources** : technique (.NET / React / Vite / MongoDB) · sécurité (OWASP, GitHub Advisories, CVE/NVD) · réglementaire (CNIL, RGAA, GreenIT).
- **Outils** : **Dependabot** · `pnpm audit` / `dotnet list --vulnerable` · **Trivy** · **Gitleaks** (+ RSS, GitHub Watch).
- **Classification** : chaque évolution → impact métier → impact environnemental → action (ex. images chiseled, scale-to-zero priorisés).

**Visuel :** tableau de classification des évolutions.

**Pied de page :** C1.3.1 · 13 / 18

---

## Diapo 14 — L'architecture proposée (1/2)

**Bandeau :** 9 · Architecture

**Contenu de la diapo :**
- **Méthode justifiée** : modèle **C4** (Contexte → Conteneur → Composant) + **séquences UML** ; UML complet et Merise écartés (trop lourd / orienté relationnel).
- **Niveau 1 — Contexte** : l'utilisateur interagit avec Movie Picker (HTTPS) ; Movie Picker consomme TMDB, Resend, et remonte vers l'observabilité.
- **Niveau 2 — Conteneurs** : navigateur → CloudFront/S3 (AWS) pour la SPA · API Cloud Run (GCP) en `/api/v1` (cookie session) → MongoDB Atlas / TMDB / Resend · secrets via Secret Manager.
- **Légende** : rectangles = applicatif · cylindres = BDD · flèches pleines = synchrone · pointillés = asynchrone/déploiement.

**Visuel :** diagrammes C4 niveau 1 (Contexte) + niveau 2 (Conteneurs).

**Pied de page :** C1.5 · 14 / 18

---

## Diapo 15 — L'architecture proposée (2/2)

**Bandeau :** 9 · Architecture

**Contenu de la diapo :**
- **Niveau 3 — Composants** : API **hexagonale** (Entrée / Application / Domaine / Infrastructure) ; le Domaine ignore HTTP et MongoDB, l'Infrastructure implémente les ports.
- **Séquence clé** : « Lancer la roue » → vérif rôle hôte → tirage atomique (pondéré si config) → résultat persisté (idempotent) ; autres participants en polling.
- **Qualités** : **maintenable** (hexagonale, tests, OpenAPI) · **sécurisée** (`/api/v1`, middleware, cookie HttpOnly, secrets externes) · **extensible** (schéma souple, ports, couche live SSE-ready).
- **Impact écologique** : scale-to-zero · cache posters · CloudFront edge · piste image chiseled.

**Visuel :** diagramme de séquence « lancer la roue » (ou schéma hexagonal niveau 3).

**Pied de page :** C1.5 · 15 / 18

---

## Diapo 16 — Le budget prévisionnel

**Bandeau :** 10 · Budget

**Contenu de la diapo :**
- **Développement (valeur simulée)** : 98 J/H × TJM 350 € = **34 300 € HT** (coût réel = temps candidat en formation).
- **Infrastructure récurrente** : **~1-5 €/mois** (free tiers ; ≤ ~15 € si MongoDB M2).
- **Licences** : **0 €** (stack 100 % open source / free tier).
- **One-shot** : nom de domaine ~10 €/an.
- **Coût réel de trésorerie** : **< 200 €/an**.
- **Postes identifiés** : licence utilisateur · développement · infrastructures.

**Visuel :** tableau récapitulatif du budget prévisionnel.

**Pied de page :** C1.4.2 · 16 / 18

---

## Diapo 17 — Nos décisions & axes de solutions

**Bandeau :** 11 · Décisions & argumentaire

**Contenu de la diapo :**
- **5 décisions structurantes** :
  1. **Application web mobile-first** (pas d'app native) — zéro installation.
  2. **Compte obligatoire pour tous** — participants identifiés, lien → inscription express.
  3. **Stack moderne sans coût de licence** — React/Vite · .NET 10 · MongoDB.
  4. **Sécurité intégrée dès la conception** — cookie HttpOnly + OWASP Top 10 + rate limiting.
  5. **Hébergement serverless économe** — Cloud Run + S3/CloudFront, scale-to-zero.
- **Axes de solutions** : architecture C4 + hexagonale · stack maîtrisée · scale-to-zero · OWASP · CI/CD.

**Visuel :** tableau des 5 décisions (contexte → décision → bénéfice).

**Pied de page :** C1.6 — **ÉLIMINATOIRE** · 17 / 18

---

## Diapo 18 — Pourquoi nous suivre (clôture)

**Bandeau :** 11 · Décisions & argumentaire

**Contenu de la diapo :**
- **Objections anticipées → réponses** :
  - « Pourquoi pas une app native ? » → friction d'installation incompatible avec un usage ponctuel ; le web couvre 100 % du parcours.
  - « MongoDB est-il sûr ? » → TLS, IP allowlist, hash MDP, volume de données perso minimal.
  - « Un projet solo, risqué ? » → automatisation forte (CI/CD, Dependabot, scans) + tout tracé.
  - « Si TMDB change ? » → cache + repli saisie manuelle.
  - « Le coût va exploser ? » → scale-to-zero + free tiers larges.
- **Synthèse de valeur** : une valeur de développement conséquente (~34 k€) pour un **coût d'exploitation quasi nul** (< 200 €/an).
- 👉 **Demande d'adhésion et de validation du cadrage.**

**Visuel :** tableau « objection → réponse » + message de clôture.

**Pied de page :** C1.6 — **ÉLIMINATOIRE** · 18 / 18

---

## Diapo annexe — Couverture RNCP & roadmap (pour les échanges)

**Bandeau :** Annexe

**Contenu de la diapo :**
- **Mapping compétences ↔ diapos** :
  - C1.1.1 → 2-3 · C1.1.2 → 4 · C1.2.2 → 5-6 · C1.3.2 → 7-8 · C1.4.1 → 9-10 · C1.2.1 → 11 · C1.2.3 → 12 · C1.3.1 → 13 · C1.5 → 14-15 · C1.4.2 → 16 · C1.6 → 17-18.
- **Roadmap** : MVP (créer/rejoindre/voter/roue) → V1 (compte, config, watch providers, OG, i18n, sécurité) → V1.1 (limite participants, .ics, hors-ligne, push).

**Visuel :** tableau de mapping + frise roadmap.

**Pied de page :** Annexe — RNCP 39583 · Bloc 1
