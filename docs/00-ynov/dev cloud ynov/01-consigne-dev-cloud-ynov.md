# Consigne dev cloud ynov

**Projet de fin de module – Soutenance : Développer pour le Cloud**

## Objectif général

Concevoir, déployer et documenter une application cloud-native complète, en mobilisant les compétences acquises durant le module.

Le projet doit démontrer votre capacité à :

- Concevoir une architecture adaptée au cloud, scalable et résiliente.
- Exploiter concrètement les services d'un fournisseur cloud (AWS, GCP ou Azure).
- Mettre en place une chaîne CI/CD.
- Assurer le monitoring et la bonne observabilité de votre application.
- Documenter et présenter la solution de manière structurée.

## Livrable attendu

Vous devez livrer une application web full-stack fonctionnelle hébergée sur le cloud, accompagnée :

- d'un dépôt Git clair et bien structuré,
- d'une documentation technique complète (README, schémas, étapes de déploiement),
- et d'une présentation orale (soutenance) de 15 à 20 minutes devant le jury.

## Contenu attendu dans le projet

### 1. Architecture Cloud & Développement

- Application développée dans un langage maîtrisé (Python, Node.js, Java…).
- Architecture claire (monolithique conteneurisée ou microservices).
- Utilisation d'au moins un service managé (base de données, bucket de stockage, file d'attente, etc.).
- Application accessible publiquement (via une URL ou une API).
- Performances optimisées via CDN, Load balancing, ou autre méthode de votre choix.

### 2. Déploiement Cloud

- Front-end et back-end doivent être hébergés sur des PaaS ou IaaS différents.
- Utilisation d'au moins un service cloud pertinent (ex. : Cloud Run, Lambda, ECS, App Service, etc.).
- Gestion des variables d'environnement / secrets.
- Documentation des étapes de déploiement.

### 3. Automatisation CI/CD

Mise en place d'une pipeline CI/CD pour automatiser au minimum : les tests, le build, et le déploiement.  
Utilisation d'un outil comme GitHub Actions, GitLab CI, ou équivalent.

### 4. Monitoring & Observabilité

Mise en place d'un système de suivi des performances et logs (ex. : Cloud Monitoring, Stackdriver, CloudWatch…). Indicateurs ou tableaux de bord de base.

### 5. Documentation & Présentation

- README clair : but du projet, architecture, services utilisés, instructions de déploiement, comptes ou identifiants de test si nécessaires.
- Schéma d'architecture
- Présentation orale structurée (15–20 min).

---

## Critères d'évaluation

| Critère | Description | Barème |
|--------|-------------|--------|
| Architecture & conception | Pertinence de l'architecture choisie, scalabilité, sécurité de base | /6 |
| Déploiement Cloud | Mise en œuvre concrète et maîtrisée des services cloud | /6 |
| CI/CD | Mise en place efficace d'une pipeline automatisée | /4 |
| Monitoring & Observabilité | Capacité à suivre et superviser l'application | /2 |
| Documentation & présentation | Clarté du dépôt, schémas, qualité de la soutenance | /2 |
| Bonus (facultatif) | Ajout de fonctionnalités avancées (autoscaling, IaC, multi-cloud…) | +2 |

**Total : /20 (+2 bonus)**
