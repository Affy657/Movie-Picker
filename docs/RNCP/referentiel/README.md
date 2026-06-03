# RNCP 39583 — Expert en développement logiciel

Grilles d’évaluation reformattées en **Markdown (UTF-8)** à partir des fichiers CSV d’origine (24/10/10).

## Fichiers

| Fichier | Contenu |
|---------|---------|
| [00-fiche-recapitulative-rncp-39583.md](00-fiche-recapitulative-rncp-39583.md) | Synthèse par compétence, éliminatoires, résultats |
| [bloc-01-cadrer-projet-applications.md](bloc-01-cadrer-projet-applications.md) | Bloc 1 — Cadrer le projet |
| [bloc-02-concevoir-developer-applications.md](bloc-02-concevoir-developer-applications.md) | Bloc 2 — Concevoir & développer |
| [bloc-03-coordonner-piloter-projet.md](bloc-03-coordonner-piloter-projet.md) | Bloc 3 — Coordonner & piloter |
| [bloc-04-maintenir-application-mco.md](bloc-04-maintenir-application-mco.md) | Bloc 4 — MCO |

## Regénérer les `.md` depuis des CSV

Les fichiers sources CSV ne sont plus versionnés ici (conversion effectuée une fois). Pour régénérer : remettre les CSV sous les noms attendus par [`scripts/csv-to-md.mjs`](scripts/csv-to-md.mjs) (ou éditer la liste dans ce script), puis :

```bash
cd docs/RNCP
node scripts/csv-to-md.mjs
```

## Référence titre

**Expert en développement logiciel** — parcours type : cadrage de projet, conception & dev, pilotage, maintenance en condition opérationnelle. Les livrables **écrits** et **oraux** attendus par le jury dépassent souvent le seul code du projet technique : voir chaque bloc pour les critères détaillés.
