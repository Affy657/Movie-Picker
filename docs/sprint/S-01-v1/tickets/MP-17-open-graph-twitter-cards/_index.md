---
id: MP-17
status: Todo
---

# MP-17 — Open Graph / Twitter Cards dynamiques

Aligné [01-roadmap-v1.md](../../../../v1-produit/01-roadmap-v1.md) (section 17). Contexte SEO / redirection : [01-roadmap-mvp.md](../../../../mvp/01-roadmap-mvp.md) (section 36) et [07-redirection-racine-et-referencement.md](../../../../mvp/07-redirection-racine-et-referencement.md).

## Contexte

Une SPA React sert souvent les **mêmes** meta pour toutes les routes ; pour un aperçu **riche par URL** (/s/:slug), il faut HTML ou meta **propres à la route** (SSR, prerender, fonction edge, sous-domaine, etc.).

**À couvrir** : choix d’**approche infra**, doc dans le dossier V1 déploiement (ex. section 6 de [02-deploiement-secrets-et-ci-v1.md](../../../../v1-produit/02-deploiement-secrets-et-ci-v1.md) ou fichier `03-…` dédié), **endpoint ou page résumé** lisible par crawlers (titre, description courte, image marque ou visuel fixe), **option confidentialité hôte** (indicateurs sensibles dans l’aperçu ; défaut prudent pour soirée « privée par lien »). Si l’infra dynamique n’est pas prête : **rester sur OG statiques** et documenter la limite **sans** régression SEO racine.

## 1. Tâches

- [ ] Trancher et documenter l’**approche infra** (CloudFront Function, Lambda@Edge, petite page serveur, autre).
- [ ] Fournir un **résumé événement** exploitable par les crawlers (titre, description courte, visuel).
- [ ] Définir l’**option confidentialité** côté hôte (aperçu avec ou sans indicateurs sensibles ; défaut prudent).
- [ ] Si pas de livrable dynamique : **OG statiques** conservés + **note** sur la limitation.

## Vérification

- [ ] Doc d’archi / déploiement à jour ; crawl testé ou doc « statique uniquement ».
- [ ] Aucune **régression** meta / redirection sur la **page racine** du site.
- [ ] Cases de la section 17 cochées dans [01-roadmap-v1.md](../../../../v1-produit/01-roadmap-v1.md).
