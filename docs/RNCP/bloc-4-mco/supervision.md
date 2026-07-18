# Supervision applicative — Sentry (C4.1.2)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 7
>
> **Objectif du critère (C4.1.2)** : disposer d'un système de supervision adapté, expliciter les sondes mises en place et les modalités de signalement, surveiller la disponibilité et le bon fonctionnement de l'application.

## 1. Objectif & périmètre

Movie Picker est supervisé en production par **Sentry** (SaaS, région **UE**), qui capture et regroupe les erreurs et anomalies techniques des deux composants applicatifs :

| Projet Sentry | Composant | SDK |
|---------------|-----------|-----|
| `movie-picker-web` | SPA React (Vite) déployée sur S3 + CloudFront | `@sentry/react` |
| `movie-picker-api` | API .NET (Cloud Run) | `Sentry.AspNetCore` |

La supervision est **active en production uniquement**. En développement et en CI, aucun DSN n'est fourni : les SDK restent inertes (aucun événement émis).

## 2. Sondes — ce qui est capturé

- **Exceptions front non gérées** : erreurs JavaScript et rejets de promesses (handlers globaux du SDK), plus les **erreurs de rendu React** remontées explicitement par l'`ErrorBoundary` de l'application (`apps/web/src/shared/components/ErrorBoundary.tsx`).
- **Erreurs serveur (5xx) de l'API** : capturées explicitement dans le filtre d'exceptions global (`MoviePickerExceptionFilter`) sur la branche « erreur inattendue » uniquement. Les erreurs métier attendues (4xx : validation, non-trouvé, conflit, non-autorisé) **ne sont pas** envoyées à Sentry pour éviter le bruit.
- **Performance (tracing léger)** : échantillonnage à **10 %** des transactions (`tracesSampleRate = 0.1`) côté front (chargement de page, navigations) et API (requêtes HTTP), pour surveiller la latence sans saturer le quota.
- **Contexte attaché à chaque événement** : `environment = production`, `release = <SHA du commit déployé>` (voir § 5), URL / route, navigateur / runtime.

Chaque incident est **regroupé** par empreinte (issue) dans le tableau de bord Sentry, avec compteur d'occurrences, première/dernière apparition, et release d'introduction.

## 3. Base légale & données personnelles (RGPD)

Le monitoring d'erreurs relève de l'**intérêt légitime** (sécurité et stabilité du service, RGPD considérant 49). Il n'utilise **pas de cookie** et **n'est pas conditionné au consentement** — contrairement à l'analytics produit (PostHog), qui reste opt-in via le CMP. Une catégorie informative dédiée **« Surveillance des erreurs »** (non désactivable) figure dans le dialogue de gestion des préférences pour la transparence.

Mesures de minimisation des données (**zéro PII**) :

- `SendDefaultPii = false` sur les deux SDK (ni IP, ni cookies, ni corps de requête, ni identifiant utilisateur envoyés).
- `beforeSend` supplémentaire qui **efface** IP / e-mail / nom d'utilisateur de tout événement, côté front et API.
- Côté serveur Sentry, sur les deux projets : **scrubbing des adresses IP** (`scrubIPAddresses`), **data scrubber** + **scrubbers par défaut** activés (masquage des motifs sensibles).
- **Pas de session replay**, pas de capture d'écran.

## 4. Échantillonnage & quota

- **Erreurs** : 100 % capturées (aucun échantillonnage — une erreur est un signal rare et précieux).
- **Traces de performance** : 10 %.
- **Quota** : plan Developer gratuit, **5 000 événements / mois**, suffisant pour le volume du projet. En cas de dépassement, Sentry écrête sans facturer.

## 5. Releases & source maps

- La **release** correspond au **SHA du commit** déployé (`SENTRY_RELEASE`), identique côté front et API → un incident est rattachable au déploiement qui l'a introduit.
- Les **source maps** du front sont générées (`sourcemap: 'hidden'`) et **uploadées à Sentry pendant le build CI** (`@sentry/vite-plugin`), puis **supprimées** de l'artefact avant publication (et exclues du `aws s3 sync`) → les stack traces sont **dé-minifiées et lisibles** dans Sentry, sans exposer les sources publiquement.

## 6. Configuration & secrets

| Variable | Emplacement | Rôle |
|----------|-------------|------|
| `VITE_SENTRY_DSN` | Secret GitHub Actions | DSN du projet front (inliné au build) |
| `SENTRY_DSN` | GCP Secret Manager → Cloud Run | DSN du projet API |
| `SENTRY_AUTH_TOKEN` | Secret GitHub Actions | Upload des source maps + release en CI |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_URL` | Variables GitHub Actions | Cible d'upload (org `adrien-morand`, région UE) |
| `SENTRY_ENVIRONMENT` / `SENTRY_RELEASE` | Env Cloud Run (déploiement) | Contexte des événements API |

L'ingest Sentry (`*.ingest.de.sentry.io`) est autorisé dans le `connect-src` de la CSP front, dérivé automatiquement du DSN au build.

## 7. Triage & lecture d'un incident

1. Un événement remonte dans le projet Sentry concerné (`movie-picker-web` ou `movie-picker-api`).
2. Lecture : message + stack trace (dé-minifiée pour le front), release, environnement, breadcrumbs, occurrences.
3. Reproduction et correction → une anomalie confirmée est consignée selon le **processus de consignation des anomalies** ([`processus-anomalies.md`](processus-anomalies.md), C4.2.1) : issue GitHub, correctif via CI/CD, entrée CHANGELOG.
4. La release d'introduction (SHA) identifie le déploiement fautif et facilite un éventuel rollback (`.github/workflows/rollback.yml`).

## 8. Rétention

Rétention des événements : **~30 jours** (plan Developer gratuit). Les incidents à conserver durablement (soutenance, post-mortem) sont archivés hors Sentry (capture d'écran, lien d'issue GitHub).

## 9. Compléments (hors périmètre Sentry)

La supervision de la **disponibilité** (sonde active de type uptime check sur `GET /health`) et les **politiques d'alerte** (taux de 5xx, latence p95) relèvent de GCP Cloud Monitoring / CloudFront et sont documentées à part si mises en place. Sentry couvre ici la détection et le regroupement des **erreurs applicatives**.
