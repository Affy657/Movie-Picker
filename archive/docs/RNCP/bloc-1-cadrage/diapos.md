# Movie Picker — Diapos Bloc 1 (RNCP 39583)

> Contenu diapo par diapo. On construit à partir du projet, pas des anciens docs.
> ⚠️ Cadre : **étude de cadrage AVANT réalisation** — pas de produit livré, pas de démo. Tout se formule au futur (« le projet vise à… », « la solution envisagée… »).

---

## Diapo 1 — Titre

**Movie Picker**
*Choisir un film à plusieurs, sans y passer la soirée*

- Étude de cadrage d'un projet de développement d'application logicielle
- RNCP 39583 — Bloc 1 · Cadrer un projet de développement d'applications
- [Prénom Nom] — [date de soutenance]

*Bas de page : Nom · RNCP 39583 — Bloc 1 · Movie Picker*

---

## Diapo 2 — Le projet

**Le besoin**
- Choisir un film à plusieurs est une source de friction : indécision, allers-retours, abandon de la soirée.

**La solution envisagée**
- Une **application web mobile-first** où l'organisateur crée une « soirée », partage un lien, chaque participant propose des films, et une **roue de tirage** tranche le choix final.

**Le cadre de cette présentation**
- Projet **non encore réalisé** : ces diapos présentent l'**étude de cadrage** (faisabilité, risques, chiffrage, architecture) menée **en amont** du développement.

*Bas de page : Nom · RNCP 39583 — Bloc 1 · Movie Picker*

---

# C1.1.1 — Cartographier les acteurs *(ÉLIMINATOIRE)* ✅ fait

## Diapo 3 — Cartographie des parties prenantes

*4 cartes : Commanditaire (formateur/jury Ynov) · Équipe projet solo (dev+archi+admin/DevOps) · Utilisateurs finaux (hôtes / participants / testeurs) · Acteurs externes (TMDB · GCP / AWS · MongoDB Atlas · Resend · GitHub Actions · Dependabot / Trivy / Gitleaks / SonarCloud).*

## Diapo 4 — À qui s'adresse le produit ? (personas)

*Léa, 26 ans — l'hôte (crée la soirée, partage, lance la roue ; veut créer vite, garder le contrôle, mobile-first). Tom, 22 ans — le participant (clique sur le lien, compte rapide, propose 1-2 films, vote ; friction minimale).*

---

# C1.1.2 — Analyser la demande

## Diapo 5 — La demande & la problématique

**Problématique**
- « Comment permettre à un groupe de **se mettre d'accord rapidement** sur un film à regarder, **depuis un mobile** et **sans friction d'inscription** ? »

**Besoins & attentes par partie prenante**

| Partie prenante | Besoin / attente |
|-----------------|------------------|
| **Hôte** | Lancer une soirée en quelques secondes, garder le contrôle, trancher facilement |
| **Participant** | Rejoindre sans obstacle, proposer ses films, voter depuis son téléphone |
| **Commanditaire (formateur/jury)** | Un projet cadré, réaliste, démontrant la maîtrise du processus |
| **Exploitant (moi, solo)** | Une solution maintenable seul et à coût quasi nul |

*Bas de page : Nom · RNCP 39583 — Bloc 1 · C1.1.2*

## Diapo 6 — Objectifs, enjeux & pistes de solution

**Objectifs du projet**
- Réduire le temps de décision « quel film ? » à quelques minutes.
- Zéro friction à l'entrée d'un participant (lien → vote).
- Une expérience pensée mobile d'abord.

**Enjeux**
- *Produit* : l'adoption dépend de la fluidité du parcours.
- *Économique* : projet étudiant → coût d'infra proche de zéro (free tiers).
- *Technique* : maintenable et opérable par une seule personne.

**Pistes de solution envisagées**
- Application **web mobile-first** (SPA) + **API** dédiée.
- Mécanique : **soirée** → **lien de partage** → **propositions** → **roue de tirage**.
- Hébergement **serverless** + services tiers gratuits (films, emails).

*Bas de page : Nom · RNCP 39583 — Bloc 1 · C1.1.2*

---
