# Journal des versions déployées (C4.3.2)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 6
>
> **Objectif du critère (C4.3.2)** : présenter un exemplaire du journal de version, contenant les améliorations apportées par la version (anomalies corrigées, nouvelles fonctionnalités) et documentant les correctifs déployés.

## 1. Dispositif

Le journal de version repose sur trois supports complémentaires, tous versionnés ou publiés :

| Support | Rôle |
|---------|------|
| [`CHANGELOG.md`](../../../CHANGELOG.md) | Journal de référence, à la racine du dépôt — format **Keep a Changelog 1.1.0**, rédigé en français |
| **Tags Git** | Un tag annoté `vX.Y.Z` par version publiée, posé sur le commit exact déployé |
| **Releases GitHub** | Publication lisible des notes de version, adossée au tag |

La version est également **visible depuis l'application** : affichée en pied de page, et exposée par la sonde `GET /health/ready` sous forme du SHA du commit déployé. Un utilisateur qui signale une anomalie transmet donc sa version sans avoir à la chercher, et l'exploitant peut vérifier à tout instant ce qui tourne réellement en production.

## 2. Politique de versionnage

Versionnage sémantique (**SemVer**), interprété comme suit pour une application web :

| Incrément | Déclencheur | Exemple |
|-----------|-------------|---------|
| **MAJEUR** | Rupture du parcours utilisateur ou du contrat d'API `/api/v1` | Aucun à ce jour |
| **MINEUR** | Nouvelle fonctionnalité visible par l'utilisateur | `1.2.0` — profil public, notifications in-app, RGPD |
| **CORRECTIF** | Correction d'anomalie, sécurité, exploitation, qualité interne | `1.3.2` — supervision, canal de support, correctif de sécurité |

Les entrées sont classées selon les catégories Keep a Changelog — *Added*, *Changed*, *Fixed*, *Security* — et rédigées pour être compréhensibles sans lire le code : ce sont les évolutions du produit qui sont décrites, pas les commits.

## 3. Versions publiées

| Version | Date | Contenu principal |
|---------|------|-------------------|
| **1.3.2** | 25/07/2026 | Supervision de production, sonde de readiness, canal « Signaler un problème », montée de sécurité react-router |
| 1.3.1 | 08/07/2026 | Filtre de durée, échelle de notes, CSP front, refonte du pipeline CI/CD |
| 1.3.0 | 19/06/2026 | États vides, export calendrier `.ics`, infobulles, refonte de la navigation |
| 1.2.0 | 11/06/2026 | Profil public, notifications in-app, accessibilité étendue, RGPD, analytics |
| 1.1.0 | 25/05/2026 | PWA installable, notifications push, séries TV |
| 1.0.0 | 19/05/2026 | Première version de production |
| 0.1.0 | 27/02/2026 | Prototype initial (MVP) |

Sept versions publiées, chacune associée à un tag et à une release.

## 4. Exemplaire — version 1.3.2

La dernière version illustre les deux exigences du critère : les **améliorations apportées** et les **correctifs déployés**.

**Ajouté**
- Lien « Signaler un problème » en pied de page, ouvrant un message pré-rempli avec le contexte technique.
- Sonde `GET /health/ready` vérifiant la joignabilité de MongoDB et exposant la version déployée.
- Supervision de production : trois sondes de disponibilité, cinq politiques d'alerte notifiées par e-mail, tableau de bord d'exploitation, alertes Sentry sur les régressions et les rafales d'erreurs.
- Contrôle de la readiness dans le smoke test de déploiement.

**Modifié**
- Portes de qualité de la CI rendues bloquantes (Quality Gate SonarCloud, Lighthouse, E2E).
- Réduction de la duplication de code (actions sur un film, fermeture des modales, pied de carte).

**Corrigé**
- Sept signalements SonarCloud (règle CA1861).
- CSRF : les endpoints de lancement et de clôture de la roue exigent un corps JSON.
- Accessibilité : l'animation de la roue respecte `prefers-reduced-motion`.

**Sécurité**
- Montée de react-router 7.18.1 vers 8.3.0, corrigeant `GHSA-qwww-vcr4-c8h2`.
- Résolution des huit alertes Dependabot ouvertes (six hautes, deux basses).

## 5. Traçabilité des correctifs

Chaque correctif déployé se relie à sa version dans les deux sens :

- **De l'anomalie vers la version** — l'issue référence le commit correctif ; le commit appartient à un tag ; le tag correspond à une entrée du CHANGELOG. L'anomalie [#67](https://github.com/Affy657/Movie-Picker/issues/67) (déconnexion à la fermeture du navigateur) se retrouve ainsi dans la version qui la corrige.
- **De la version vers les anomalies** — la rubrique *Fixed* d'une version énumère les correctifs qu'elle embarque, et la rubrique *Security* les vulnérabilités traitées, avec leur identifiant d'avis (`GHSA-…`).
- **De la production vers le code** — la release Sentry, égale au SHA du commit déployé, rattache une exception observée en production au déploiement exact qui l'a introduite.
