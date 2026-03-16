# Préparer la soutenance (15–20 min)

Guide pour structurer la présentation orale du projet Movie Picker devant le jury.

---

## Durée cible : 15 à 20 minutes

Répartition indicative :

| Partie | Durée | Contenu |
|--------|--------|--------|
| Introduction & but du projet | 2 min | Contexte, objectif (soirées film, partage, votes, roue). |
| Architecture & stack | 3–4 min | Schéma, choix techniques (React, Express, TypeScript), répartition AWS / GCP. |
| Démo en direct | 4–5 min | Parcours complet : créer un event → partager le lien → rejoindre → proposer des films → voter → lancer la roue → clôturer. |
| Déploiement & CI/CD | 3–4 min | Où tourne l'app (URLs), pipeline GitHub Actions (build, Docker, Cloud Run, S3, CloudFront). |
| Monitoring & observabilité | 2 min | Où voir les logs (Cloud Logging), métriques (Cloud Run, CloudFront). |
| Documentation & conclusion | 2 min | README, schéma, docs de déploiement ; récap des critères Ynov. |

---

## 1. Introduction & but du projet

- Présenter **Movie Picker** en une phrase : application pour organiser des soirées film (créer un event, partager un lien, proposer des films, voter, tirer au sort avec une roue).
- Rappeler l'objectif du module : app cloud-native, déployée, avec CI/CD et monitoring.

---

## 2. Architecture & stack

- Montrer le **schéma d'architecture** ([architecture.md](architecture.md)) : utilisateur → CloudFront/S3 (front) et Cloud Run (API) ; MongoDB Atlas, TMDB ; GitHub Actions.
- Citer les **choix** : TypeScript strict, monorepo Turborepo, front sur **AWS** (S3 + CloudFront), back sur **GCP** (Cloud Run), base MongoDB Atlas.
- Souligner que **front et back sont sur des clouds différents** (exigence Ynov).

---

## 3. Démo en direct

- Ouvrir l'**URL CloudFront** du front en production.
- Enchaîner le **parcours complet** (voir [test-parcours-mvp.md](test-parcours-mvp.md)) :
  1. Créer un event (titre, date, heure).
  2. Copier le lien de partage.
  3. Ouvrir le lien en navigation privée (invité), rejoindre avec un pseudo.
  4. Proposer 2–3 films (recherche TMDB).
  5. Voter (up/down).
  6. Lancer la roue (en tant qu'hôte).
  7. Clôturer la soirée.
- Montrer brièvement que l'API répond (ex. `/health` sur l'URL Cloud Run) si utile.

---

## 4. Déploiement & CI/CD

- Montrer les **URLs** : front (CloudFront), API (Cloud Run).
- Ouvrir le **dépôt GitHub** → onglet **Actions** : montrer un workflow récent (Build & Lint, Docker API, Deploy API, Deploy Front).
- Résumer la **pipeline** : push sur `main` → build + lint → build image Docker → push Artifact Registry → déploiement Cloud Run → build front → upload S3 → invalidation CloudFront.
- Mentionner les **secrets/variables** (sans les afficher) : GCP, AWS, MongoDB, TMDB, etc. (détails dans [deploy-cicd.md](deploy-cicd.md)).

---

## 5. Monitoring & observabilité

- **GCP** : Cloud Console → Logging (logs du service Cloud Run) et Monitoring (métriques : requêtes, latence).
- **AWS** : CloudWatch → métriques CloudFront (requêtes, erreurs).
- Dire que les procédures sont décrites dans [monitoring.md](monitoring.md).

---

## 6. Documentation & conclusion

- Montrer le **README** : but du projet, architecture, services utilisés, instructions de déploiement.
- Rappeler la **documentation** : spec technique, schéma d'architecture, guides de déploiement (GCP, AWS, CI/CD), monitoring.
- Conclure en rappelant la **couverture de la consigne Ynov** : architecture, déploiement multi-cloud, CI/CD, monitoring, documentation (référence possible à [verification-consigne-ynov.md](verification-consigne-ynov.md)).

---

## Conseils

- **Préparer la démo** : tester le parcours la veille, vérifier que les URLs et le compte TMDB fonctionnent.
- **Avoir un plan B** : captures d'écran ou courte vidéo du parcours si le réseau ou l'app flanche.
- **Garder le dépôt à jour** : dernier push propre, README et docs à jour pour le jour J.
