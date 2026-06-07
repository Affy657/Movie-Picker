# 10 — Estimation des coûts & budget prévisionnel

> **RNCP 39583 — C1.4.2**
>
> **Compétence** — Estimer le coût associé au projet en se basant sur la charge de travail estimée préalablement et en identifiant les principaux postes de coûts afin de présenter au client un budget prévisionnel.
>
> **Livrable attendu** — L'estimation des coûts et le budget prévisionnel du projet.
>
> **Critères d'évaluation**
> - L'estimation des coûts est cohérente avec la charge de travail.
> - Le budget prévisionnel est élaboré.
> - Il permet d'identifier les principaux postes de coûts : licence utilisateur, développement, infrastructures, etc.

---

## 1. Coût de développement (basé sur la charge)

> Cohérence avec la charge estimée (cahier des charges fonctionnel) : **≈ 98 J/H** au total. Chiffrage **simulé** comme si le projet était réalisé en agence (le projet réel est réalisé en formation, coût de main-d'œuvre = temps candidat).

| Phase | Charge (J/H) | TJM junior simulé | Coût simulé (HT) |
|-------|--------------|-------------------|------------------|
| MVP | 27 | 350 € | 9 450 € |
| Migration .NET | 13 | 350 € | 4 550 € |
| V1 produit | 35 | 350 € | 12 250 € |
| Clôture RNCP (docs & process) | 23 | 350 € | 8 050 € |
| **Total** | **98** | — | **34 300 € HT** |

> **Hypothèse** : TJM développeur junior 350 € HT (fourchette marché 300–450 €). Le coût réel de développement dans le cadre de la formation est **nul en trésorerie** (temps candidat), mais ce chiffrage donne la **valeur** de la charge pour le commanditaire.

---

## 2. Postes de coûts d'infrastructure (production réelle)

> Tous les services sont dimensionnés sur leurs **free tiers**, suffisants pour le volume attendu (usage projet étudiant : dizaines à centaines d'utilisateurs).

| Poste | Service | Free tier | Coût au-delà | Estimation mensuelle |
|-------|---------|-----------|--------------|----------------------|
| **Hébergement API** | GCP Cloud Run | 2 M req/mois | ~0,40 €/M req suppl. | **~0 €** |
| **Registre image** | GCP Artifact Registry | 0,5 Go | ~0,10 $/Go | **~0 €** |
| **Secrets** | GCP Secret Manager | 6 secrets actifs | ~0,06 $/secret | **~0 €** |
| **Supervision** | GCP Cloud Monitoring + uptime | Free tier | — | **~0 €** |
| **Hébergement front** | AWS S3 + CloudFront | 12 mois gratuits | ~1–5 € ensuite | **~1–5 €** |
| **Base de données** | MongoDB Atlas M0 | 512 Mo gratuit | M2 ~9 $/mois | **~0 €** |
| **Email** | Resend | 100 emails/jour (3 000/mois) | au-delà payant | **~0 €** |
| **Monitoring erreurs** | Sentry Developer | 5 000 events/mois | au-delà payant | **~0 €** |
| **CI/CD** | GitHub Actions | inclus repo | — | **~0 €** |
| **Total récurrent** | | | | **≈ 1–5 €/mois** |

> En régime nominal, le **seul poste non nul** est **S3 + CloudFront** (au-delà des 12 mois gratuits). La borne haute **~15 €/mois** n'est atteinte qu'en cas de **dépassement du free tier MongoDB** (passage M0 → M2 ≈ 9 $/mois) ou de pic de trafic CloudFront.

---

## 3. Postes one-shot

| Poste | Coût |
|-------|------|
| Nom de domaine `.fr` | ~10 €/an |
| Certificat SSL | Gratuit (CloudFront / Let's Encrypt) |
| Templates email | Inclus (faits maison) |
| **Total one-shot** | **~10 €/an** |

---

## 4. Licences utilisateur

| Élément | Licence | Coût |
|---------|---------|------|
| .NET 10 / ASP.NET Core | MIT / open source | **0 €** |
| React / Vite / TanStack | MIT | **0 €** |
| MongoDB (Atlas M0) | SSPL (usage managé free tier) | **0 €** |
| TMDB API | Gratuit (usage non commercial, attribution requise) | **0 €** |
| Outillage (ESLint, Vitest, Playwright, Trivy, Gitleaks) | Open source | **0 €** |

> **Aucune licence payante** : la stack est intégralement open source ou en free tier. C'est un choix structurant pour la soutenabilité d'un projet étudiant.

---

## 5. Budget prévisionnel récapitulatif

| Catégorie | Montant | Hypothèses |
|-----------|---------|------------|
| **Développement (valeur simulée)** | 34 300 € HT | 98 J/H × TJM 350 € — coût réel = temps candidat (formation) |
| **Infrastructure récurrente** | ~1–5 €/mois | Free tiers (S3/CloudFront au-delà de 12 mois) ; ≤ ~15 € si passage MongoDB M2 |
| **One-shot** | ~10 €/an | Nom de domaine |
| **Licences** | 0 € | Stack 100 % open source / free tier |
| **Coût réel de trésorerie (hors temps)** | **≈ 20–190 €/an** | Domaine (~10 €/an) + infra ; borne haute = MongoDB M2 |

> **Conclusion** : le budget prévisionnel de **trésorerie** est volontairement minimal (< 200 €/an), aligné sur la contrainte budget étudiant identifiée au cadrage. La **valeur de développement** (≈ 34 k€ simulés) matérialise l'effort pour le commanditaire et sert de base à l'argumentaire client.
