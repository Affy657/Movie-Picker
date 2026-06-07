# Movie Picker — Cadrage d'un projet de développement logiciel

[Prénom NOM] · RNCP 39583 — Expert en développement logiciel · **Bloc 1 : Cadrer un projet**

« Choisir un film à plusieurs, vite et équitablement — sans débat interminable. »

**Au programme :** 1. Parties prenantes · 2. Analyse de la demande · 3. Faisabilité · 4. Étude comparative · 5. Charge & fonctions · 6. SWOT · 7. Risques · 8. Veille · 9. Architecture · 10. Budget · 11. Décisions & argumentaire

---

## Cartographie des parties prenantes

- **Commanditaire** — Formateur / jury Ynov : cadre le projet, valide les livrables, évalue (implication élevée, décisionnaire).
- **Équipe projet (solo)** — un seul intervenant cumulant développeur + architecte + administrateur / DevOps (implication permanente).
- **Utilisateurs finaux** — hôtes (créent, configurent, lancent la roue) · participants (rejoignent via lien, compte requis) · testeurs / pairs (recette, ponctuel).
- **Acteurs externes** — TMDB (films, critique) · GCP / AWS / MongoDB Atlas (infrastructure, critique) · Resend (emails, moyen) · GitHub Actions (CI/CD) · Dependabot / Trivy / Gitleaks / SonarCloud (qualité-sécurité, continu).
- Cumul solo assumé → compensé par une automatisation maximale.

🖼️ *Visuel : mindmap des parties prenantes (commanditaire / équipe / utilisateurs / externes).*

**RNCP : C1.1.1 — ÉLIMINATOIRE**

---

## À qui s'adresse le produit ? (personas)

- **Léa, 26 ans — l'hôte** : smartphone, crée la soirée à l'avance, partage le lien, lance la roue. Veut créer vite, paramétrer, garder le contrôle.
- **Tom, 22 ans — le participant** : smartphone uniquement, reçoit un lien → inscription express → redirection automatique sur la soirée. Pseudo affiché = nom du compte.
- **Le groupe récurrent (4-8 amis)** : usage répété, compte pour « Mes soirées », historique, marqueur « déjà vu ».
- **Transverse** : mobile-first (~375 px) · compte obligatoire pour tous (plus de pseudo anonyme) · accessibilité dès la conception.

🖼️ *Visuel : 3 fiches personas (profil + attente clé).*

**RNCP : C1.1.1 — ÉLIMINATOIRE**

---

## Le problème à résoudre

- **Problématique** : comment permettre à un groupe d'amis de choisir un film ensemble, rapidement et équitablement, sans 30 min de débat ni outil contraignant ?
- **Besoins** : hôte → organiser / contrôler · participant → rejoindre simplement · groupe → historique / éviter les redites · tous → décider vite et équitablement.
- **Objectifs** : choix collectif rapide · équité (vote + roue) · friction maîtrisée · dimension ludique.
- **Enjeux** : adoption · engagement · confiance / sécurité · conformité (RGPD, accessibilité) · soutenabilité (solo, budget).
- **Pistes retenues** : vote up/down + roue · lien partagé + inscription rapide · métadonnées TMDB · marqueur « déjà vu » · compte pour tous.

🖼️ *Visuel : tableau « besoin → traduction produit ».*

**RNCP : C1.1.2**

---

## La démarche d'audit & le diagnostic

- **Contexte** : projet greenfield (aucun système legacy) → l'existant audité = l'environnement technique disponible.
- **Démarche** : grille descendante en 5 étapes — besoins → exigences non fonctionnelles → contraintes → ressources → avis critique.
- **Langages disponibles** : TypeScript, C# / .NET, Node, Python.
- **Bases candidates** : MongoDB retenu · PostgreSQL alternative · SQLite inadapté (multi-instance).
- **Architecture cible** : SPA + API REST + base documentaire.
- **Services externes** : TMDB, Resend, GCP, AWS, MongoDB Atlas, GitHub Actions.

🖼️ *Visuel : flowchart de la démarche d'audit en 5 étapes.*

**RNCP : C1.2.2 — ÉLIMINATOIRE**

---

## Le projet est-il réalisable ?

- **Contraintes techniques** : architecture distribuée (CORS strict, cookies cross-site) · HTTPS · mobile-first · multi-instance (état en base) · conteneur Linux.
- **Contraintes financières** : ≤ ~15 €/mois → free tiers prioritaires.
- **Délais** : calendrier cursus, découpage par versions (MVP → migration .NET → V1 → V1.1).
- **Humaines** : projet solo → automatisation maximale.
- **Volume** : faible (dizaines à centaines d'utilisateurs, < 512 Mo, pics ponctuels).
- ✅ **Verdict : GO** — risques majeurs atténués (TMDB → cache/repli · coût Cloud Run → scale-to-zero · CSRF → CORS + mesures · charge solo → automatisation).

🖼️ *Visuel : encadré « GO » + tableau risques → atténuations.*

**RNCP : C1.2.2 — ÉLIMINATOIRE**

---

## Quelles technologies, et pourquoi ? (1/2)

- **Méthode** : chaque brique comparée sur 6 critères — sécurité · environnements systèmes · réseau · accessibilité · impact environnemental · coût.
- **Front** : React + Vite + TypeScript (vs Next.js, SvelteKit) → build statique CDN, pas de serveur à durcir, accessibilité mature.
- **API** : ASP.NET Core .NET 10 LTS (vs Node/Express, Go) → typage fort, sécurité native (CORS, rate limit, antiforgery), support long.
- **Base de données** : MongoDB Atlas M0 (vs PostgreSQL, SQLite) → schéma souple, free tier, managé.

🖼️ *Visuel : tableau de synthèse « brique → choix → justification ».*

**RNCP : C1.3.2 — ÉLIMINATOIRE**

---

## Hébergement, sécurité & ressources (2/2)

- **Hébergement API** : GCP Cloud Run (vs ECS Fargate, Scaleway) → scale-to-zero.
- **Hébergement front** : AWS S3 + CloudFront (vs Vercel, Netlify) → contrôle fin du cache et des en-têtes de sécurité.
- **Authentification** : sessions cookie HttpOnly (vs JWT, OAuth) → token non exposé au JS, révocation serveur ; coût = gérer le cross-site (CORS + `SameSite=None; Secure` + anti-CSRF).
- **API films** : TMDB (vs OMDB, JustWatch) → données riches, gratuit, cache posters.
- **Ressources** : poste de dev (Node, .NET SDK, Docker), comptes de service tous en free tier, aucun serveur propre.
- **Impact environnemental** : scale-to-zero + cache + front statique.

🖼️ *Visuel : schéma de la stack retenue (front / back / data + flux).*

**RNCP : C1.3.2 — ÉLIMINATOIRE**

---

## Les fonctionnalités hiérarchisées

- **Outils d'analyse** : MoSCoW (priorisation) + diagramme de fonctionnalités / bête à cornes (hiérarchisation).
- **Bête à cornes** : à qui ? un groupe d'amis · sur quoi ? la décision collective d'un film · pour quoi ? choisir vite, équitablement, de façon ludique.
- **Fonctions principales** : créer / rejoindre / proposer / voter / lancer la roue / compte.
- **Fonctions secondaires** : config hôte, marqueur « déjà vu », historique, watch providers, QR code, mot de passe oublié, aperçus OG, mises à jour live.
- **Fonctions complémentaires** : internationalisation, thème sombre/clair, rappels.
- **MoSCoW** : Must = MVP · Should/Could = V1 · Won't = V1.1.

🖼️ *Visuel : mindmap MoSCoW (principales / secondaires / complémentaires).*

**RNCP : C1.4.1 — ÉLIMINATOIRE**

---

## Combien de travail ? (jours-homme)

- **Méthode d'estimation** : analogique (comparaison entre lots), scénario probable, marge ± 20 %.
- **Charge** : MVP 27 · Migration .NET 13 · V1 produit 35 · Clôture RNCP 23 → **≈ 98 J/H**.
- **Couverture technique** : chaque fonction tracée → endpoint → écran → tests (ex. créer = `POST /api/v1/events` → écran CreateEvent → tests unit + intégration + E2E).
- **UX prise en compte** : mobile-first (zones ≥ 44 px), friction maîtrisée (redirection automatique), feedback clair, accessibilité.

🖼️ *Visuel : tableau de charge J/H par phase + total.*

**RNCP : C1.4.1 — ÉLIMINATOIRE**

---

## Opportunités & menaces (SWOT)

- **Forces** : stack moderne maîtrisée · architecture découplée · monorepo automatisé · mobile-first · sécurité intégrée tôt.
- **Faiblesses** : équipe solo · pas de déploiement progressif (canary) · pas d'analytics en V1 · bi-cloud.
- **Opportunités** : free tiers · .NET 10 LTS · communauté React/TanStack · TMDB gratuit · scale-to-zero.
- **Menaces** : TMDB (rate limit / CGU) · dépendance cloud · CVE / OWASP · lien partagé indexé · pic de coût.
- **Adhérences** externes toutes en free tier et découplées (repli TMDB / Resend).
- **Impact environnemental** : scale-to-zero, cache, front statique.

🖼️ *Visuel : matrice SWOT (4 quadrants).*

**RNCP : C1.2.1**

---

## Cartographie des risques

- **Référentiel** : grille Probabilité × Impact (1-3), criticité 1-9 (🟢 1-2 / 🟡 3-4 / 🔴 6-9).
- **Risques couverts** : perte de données · interruption du système · facteurs de dégradation · sécurité.
- **Prioritaires 🔴** : CSRF (cookie cross-site) · abandon utilisateur (friction).
- **Indicateurs de contrôle** : taux d'erreur 5xx · uptime `/health` · CVE High/Critical · CI verte/rouge · coût cloud · fuite de secret (Gitleaks).

🖼️ *Visuel : matrice des risques P × I.*

**RNCP : C1.2.3**

---

## La veille mise en place

- **Stratégie** : automatisée en priorité (contexte solo) + veille humaine ciblée sur les sources officielles.
- **Objectifs** : sécurité · maintenabilité (LTS) · conformité (RGPD / RGAA) · éco-conception.
- **Sources** : technique (.NET, React, Vite, MongoDB) · sécurité (OWASP, GitHub Advisories, CVE/NVD) · réglementaire (CNIL, RGAA, GreenIT).
- **Outils** : Dependabot · `pnpm audit` / `dotnet list --vulnerable` · Trivy · Gitleaks (+ RSS, GitHub Watch).
- **Classification** : chaque évolution → impact métier → impact environnemental → action (images chiseled et scale-to-zero priorisés).

🖼️ *Visuel : tableau de classification des évolutions.*

**RNCP : C1.3.1**

---

## L'architecture proposée (1/2)

- **Méthode justifiée** : modèle C4 (Contexte → Conteneur → Composant) + séquences UML ; UML complet et Merise écartés (trop lourd / orienté relationnel).
- **Niveau 1 — Contexte** : l'utilisateur interagit avec Movie Picker (HTTPS) ; Movie Picker consomme TMDB, Resend, et remonte vers l'observabilité.
- **Niveau 2 — Conteneurs** : navigateur → CloudFront / S3 (AWS) pour la SPA · API Cloud Run (GCP) en `/api/v1` (cookie session) → MongoDB Atlas / TMDB / Resend · secrets via Secret Manager.
- **Légende** : rectangles = applicatif · cylindres = base de données · flèches pleines = synchrone · pointillés = asynchrone / déploiement.

🖼️ *Visuel : diagrammes C4 niveau 1 (Contexte) + niveau 2 (Conteneurs).*

**RNCP : C1.5**

---

## L'architecture proposée (2/2)

- **Niveau 3 — Composants** : API hexagonale (Entrée / Application / Domaine / Infrastructure) ; le Domaine ignore HTTP et MongoDB, l'Infrastructure implémente les ports.
- **Séquence clé** : « Lancer la roue » → vérification du rôle hôte → tirage atomique (pondéré si configuré) → résultat persisté (idempotent) ; autres participants en polling.
- **Qualités** : maintenable (hexagonale, tests, OpenAPI) · sécurisée (`/api/v1`, middleware, cookie HttpOnly, secrets externes) · extensible (schéma souple, ports, couche live prête pour SSE).
- **Impact écologique** : scale-to-zero · cache posters · CloudFront edge · piste image chiseled.

🖼️ *Visuel : diagramme de séquence « lancer la roue » (ou schéma hexagonal).*

**RNCP : C1.5**

---

## Le budget prévisionnel

- **Développement (valeur simulée)** : 98 J/H × TJM 350 € = **34 300 € HT** (coût réel = temps candidat en formation).
- **Infrastructure récurrente** : ~1-5 €/mois (free tiers ; ≤ ~15 € si MongoDB M2).
- **Licences** : 0 € (stack 100 % open source / free tier).
- **One-shot** : nom de domaine ~10 €/an.
- **Coût réel de trésorerie** : < 200 €/an.
- **Postes identifiés** : licence utilisateur · développement · infrastructures.

🖼️ *Visuel : tableau récapitulatif du budget prévisionnel.*

**RNCP : C1.4.2**

---

## Nos décisions & axes de solutions

- **Application web mobile-first** (pas d'app native) — zéro installation.
- **Compte obligatoire pour tous** — participants identifiés, lien → inscription express.
- **Stack moderne sans coût de licence** — React/Vite · .NET 10 · MongoDB.
- **Sécurité intégrée dès la conception** — cookie HttpOnly + OWASP Top 10 + rate limiting.
- **Hébergement serverless économe** — Cloud Run + S3/CloudFront, scale-to-zero.
- **Axes de solutions** : architecture C4 + hexagonale · stack maîtrisée · OWASP · CI/CD.

🖼️ *Visuel : tableau des 5 décisions (contexte → décision → bénéfice).*

**RNCP : C1.6 — ÉLIMINATOIRE**

---

## Pourquoi nous suivre

- **« Pourquoi pas une app native ? »** → friction d'installation incompatible avec un usage ponctuel ; le web couvre 100 % du parcours.
- **« MongoDB est-il sûr ? »** → TLS, IP allowlist, hash des mots de passe, volume de données personnelles minimal.
- **« Un projet solo, risqué ? »** → automatisation forte (CI/CD, Dependabot, scans), tout est tracé.
- **« Et si TMDB change ? »** → cache + repli saisie manuelle.
- **« Le coût va-t-il exploser ? »** → scale-to-zero + free tiers larges.
- **Synthèse** : une valeur de développement conséquente (~34 k€) pour un coût d'exploitation quasi nul (< 200 €/an).
- 👉 **Nous sollicitons votre adhésion et la validation du cadrage.**

🖼️ *Visuel : tableau « objection → réponse » + message de clôture.*

**RNCP : C1.6 — ÉLIMINATOIRE**

---

## Annexe — Couverture RNCP & roadmap

- **Mapping compétences ↔ diapos** : C1.1.1 → 2-3 · C1.1.2 → 4 · C1.2.2 → 5-6 · C1.3.2 → 7-8 · C1.4.1 → 9-10 · C1.2.1 → 11 · C1.2.3 → 12 · C1.3.1 → 13 · C1.5 → 14-15 · C1.4.2 → 16 · C1.6 → 17-18.
- **Roadmap** : MVP (créer / rejoindre / voter / roue) → V1 (compte, config hôte, watch providers, OG, i18n, sécurité) → V1.1 (limite participants, .ics, hors-ligne, push).

🖼️ *Visuel : tableau de mapping + frise roadmap.*

**RNCP 39583 · Bloc 1**
