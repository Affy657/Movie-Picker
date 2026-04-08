---
sprint_id: S-01
folder: S-01-v1
name: V1 — Sprint 1
objective: Tâche roadmap V1 (entrée 17) — aperçus de lien (Open Graph / Twitter Cards) par URL soirée, sans régression SEO racine.
---

# Sprint `S-01` — V1

## Tickets

| ID    | Sujet                                 | Status | Lien |
|-------|---------------------------------------|--------|------|
| MP-17 | Open Graph / Twitter Cards dynamiques | Todo   | [ticket](./tickets/MP-17-open-graph-twitter-cards/_index.md) |

## Dépendances / risques

- Décision **infra** (edge, page serveur, prerender, etc.) et **CORS / origines** si besoin.
- Les crawlers ont besoin de **HTML ou meta dédiées** : la SPA React seule ne suffit pas pour un aperçu riche par URL.

## Définition de fin de sprint

- Approche **documentée** (voir [01-roadmap-v1.md](../../v1-produit/01-roadmap-v1.md) section 17).
- Soit **résumé événement** crawlable + confidentialité hôte réfléchie, soit **OG statiques** avec limitation **tracée** (pas de régression sur la racine).
