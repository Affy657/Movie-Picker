# Processus de collecte et de consignation des anomalies (C4.2.1)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) | Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 8
>
> **Objectif du critère (C4.2.1)** : élaborer un processus de collecte et de consignation structuré et adapté au logiciel, utiliser un outil de collecte, et y intégrer toutes les informations permettant de reproduire le bogue et de déterminer le correctif.

## 1. Principe

**Une anomalie confirmée = une issue GitHub.** Le tracker est la source unique de vérité : aucune correction n'est déployée sans une trace écrite qui explique ce qui ne va pas, comment le reproduire et ce qui a été décidé. Cette règle vaut aussi pour un projet à développeur unique, c'est précisément là qu'elle est la plus fragile, la mémoire du développeur remplaçant volontiers l'écrit.

Le processus est dimensionné pour la typologie du logiciel : une application web grand public, en déploiement continu, sans astreinte, dont les anomalies proviennent presque toutes de trois origines, une régression introduite par un déploiement, une dépendance externe défaillante, ou un cas d'usage non prévu.

## 2. Canaux de collecte

Une anomalie n'arrive jamais par un seul chemin. Cinq canaux alimentent le processus, du plus automatique au plus humain.

| # | Canal | Ce qu'il détecte | Délai de détection |
|:-:|-------|------------------|--------------------|
| 1 | **Supervision GCP**, 3 sondes actives, 5 politiques d'alerte ([`supervision.md`](supervision.md)) | Indisponibilité, base injoignable, erreurs 5xx anormales, latence dégradée | 2 à 30 min selon la sonde |
| 2 | **Sentry**, 2 projets, 3 règles d'alerte chacun | Exception front ou serveur, régression d'une anomalie corrigée, rafale d'occurrences | Immédiat |
| 3 | **Retours utilisateurs** | Anomalie fonctionnelle qui ne lève aucune exception : comportement inattendu, donnée incohérente, parcours bloqué | Variable |
| 4 | **Portes de la CI/CD**, tests unitaires, intégration, E2E Playwright, Lighthouse, Quality Gate SonarCloud, Trivy, gitleaks, `dotnet list --vulnerable`, scan de sécurité hebdomadaire | Régression, vulnérabilité, dégradation de performance ou d'accessibilité, **avant** la mise en production | À chaque commit, plus un scan hebdomadaire |
| 5 | **Recette manuelle** | Écart entre le comportement observé et le cahier de recettes | À chaque évolution fonctionnelle |

Les canaux 1, 2 et 4 sont automatiques et notifient par e-mail. Le canal 3 est le seul qui dépend d'une démarche humaine : c'est aussi celui qui remonte les anomalies les plus coûteuses, puisqu'elles ont déjà atteint l'utilisateur sans déclencher la moindre alerte technique.

## 3. Outil et gabarit de consignation

**GitHub Issues**, sur le dépôt du projet. Les issues vierges sont **désactivées** (`blank_issues_enabled: false`) : tout signalement passe obligatoirement par un formulaire structuré, ce qui garantit que les informations nécessaires à la reproduction sont présentes dès la création.

Le gabarit [`bug_report.yml`](../../../.github/ISSUE_TEMPLATE/bug_report.yml) impose six champs, cinq obligatoires, un facultatif :

| Champ | Obligatoire | Pourquoi il est nécessaire |
|-------|:-----------:|----------------------------|
| **Contexte** | oui | URL, navigateur, système, version de l'application (visible en pied de page et dans Sentry) : sans lui, on corrige à l'aveugle un bogue qui peut être propre à un environnement |
| **Étapes pour reproduire** | oui | Une anomalie non reproductible ne peut être ni corrigée avec certitude, ni vérifiée après correction |
| **Comportement attendu** | oui | Distingue le défaut réel du malentendu fonctionnel |
| **Comportement observé** | oui | Décrit le symptôme tel qu'il se manifeste, indépendamment de son interprétation |
| **Captures / logs** | non | Capture, erreur console ou lien vers l'événement Sentry, raccourcit fortement le diagnostic |
| **Sévérité** | oui | Détermine le délai de prise en charge (§ 4) |

Les issues portent des **labels normalisés** : `bug`, `triage` (posé automatiquement à la création), `severite:critical|high|medium|low`, `production` lorsque l'anomalie est constatée en production, et `regression` lorsqu'il s'agit de la réapparition d'une anomalie déjà corrigée.

## 4. Qualification et délais de prise en charge

La sévérité est déclarée par le signalant, puis confirmée au triage. Elle mesure l'**impact utilisateur**, pas la difficulté technique.

| Sévérité | Définition | Prise en charge | Correction visée |
|----------|-----------|-----------------|------------------|
| **critical** | Service inutilisable ou perte de données | Immédiate, tout autre travail suspendu | Sous 24 h, ou retour arrière immédiat |
| **high** | Fonctionnalité principale bloquée, sans contournement | Sous 24 h | Sous 72 h |
| **medium** | Gêne réelle mais contournement possible | Au prochain lot de travail | Prochaine version mineure |
| **low** | Cosmétique ou marginal | Mise en file | Sans engagement de date |

Une anomalie `critical` en production ouvre un arbitrage immédiat : **corriger** ou **revenir en arrière**. Le retour arrière est privilégié lorsque l'anomalie suit un déploiement, car il rétablit le service en quelques minutes sans exiger d'avoir compris la cause.

## 5. Cycle de vie d'une anomalie

1. **Signalement**, création de l'issue via le gabarit, quel que soit le canal d'origine ; une alerte de supervision ou une issue Sentry est recopiée en issue GitHub, avec le lien vers l'événement.
2. **Triage**, confirmation de la sévérité, retrait du label `triage`, ajout de `production` ou `regression` le cas échéant.
3. **Reproduction**, rejeu des étapes déclarées. Une anomalie non reproductible n'est pas fermée pour autant : elle est documentée avec ce qui a été tenté, et reste ouverte tant que le signalement persiste.
4. **Analyse**, identification de la cause racine, consignée dans l'issue. Le symptôme et la cause sont distingués explicitement : une même déconnexion peut venir d'un cookie, d'une clé de chiffrement ou d'une configuration morte.
5. **Correction**, branche dédiée, correctif accompagné d'un **test de non-régression** lorsque la nature du défaut le permet.
6. **Vérification**, le correctif est validé en production, pas seulement en local : smoke test automatique en fin de déploiement, puis contrôle du comportement d'origine.
7. **Clôture**, l'issue est fermée en référençant le commit correctif et la date de déploiement.

**Définition de « corrigé »** : le correctif est déployé en production, le comportement d'origine est vérifié sur l'environnement réel, un test automatisé couvre le cas lorsque c'est possible, et l'évolution est inscrite au CHANGELOG. Tant que ces conditions ne sont pas réunies, l'anomalie reste ouverte.

## 6. Traitement du correctif

Le correctif emprunte le même pipeline que n'importe quelle évolution, aucune voie rapide, aucun accès direct à la production :

1. Branche `fix/<sujet>` depuis `master`.
2. Poussée : la CI exécute lint, tests unitaires et d'intégration, tests E2E Playwright, audit Lighthouse, Quality Gate SonarCloud, scans Trivy et gitleaks. **Ces portes sont bloquantes** : un échec interdit le déploiement.
3. Fusion sur `master` après revue.
4. Déploiement automatique : construction et scan de l'image, publication sur Artifact Registry, `gcloud run deploy` pour l'API, synchronisation S3 et invalidation CloudFront pour le front.
5. **Smoke test post-déploiement** : `GET /health` puis `GET /health/ready`, si la révision déployée ne répond pas ou ne joint pas la base, le déploiement échoue.
6. En cas d'incident malgré tout : [`rollback.yml`](../../../.github/workflows/rollback.yml) bascule 100 % du trafic vers la révision Cloud Run précédente (ou une révision cible désignée), sans reconstruction.

## 7. Traçabilité

Chaque anomalie laisse une chaîne complète et vérifiable :

**Issue** (symptôme, reproduction, analyse) → **branche** `fix/<sujet>` → **commit** (message expliquant la cause racine) → **exécution CI** (portes franchies) → **déploiement** (révision Cloud Run, release Sentry = SHA du commit) → **entrée CHANGELOG** → **tag et release GitHub** → **clôture de l'issue** référençant le commit.

Cette chaîne se parcourt dans les deux sens : depuis une anomalie, on retrouve la version qui la corrige ; depuis une version, on retrouve les anomalies qu'elle traite. La **release Sentry**, identique au SHA du commit déployé, fait le lien entre une exception observée en production et le déploiement qui l'a introduite.

## 8. Cas d'application

L'anomalie **[#67, Déconnexion à la fermeture du navigateur en production](https://github.com/Affy657/Movie-Picker/issues/67)** illustre le processus de bout en bout : signalement par des utilisateurs, reproduction, analyse ayant révélé **deux causes racines cumulées** (clé de chiffrement Data Protection expirée, et configurateur de cookie enregistré sur une interface jamais consommée par l'injection de dépendances), correction avec test de non-régression, déploiement par le pipeline, vérification après démarrage à froid, puis clôture référençant le commit.

Cette fiche a été consignée **a posteriori** : l'anomalie date du 17/07/2026, antérieure à la formalisation du présent processus. Les dates réelles de détection, de correction et de déploiement y figurent explicitement.
