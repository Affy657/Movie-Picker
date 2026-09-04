# Diapos Slidev, oral Bloc 3 (Movie Picker)

Support de la présentation orale du 16 septembre 2026. Le contenu est dérivé des fichiers de matière du dossier parent (`01-planification.md` et suivants), qui restent la **source de vérité**. La structure et le minutage sont arrêtés dans [`../00-plan-presentation-orale.md`](../00-plan-presentation-orale.md).

## Lancer en local

```bash
npm install
npm run dev
```

- Le support s'ouvre sur http://localhost:3030
- **Mode présentateur**, avec les notes orales, les durées et les critères visés : http://localhost:3030/presenter
- Navigation : flèches ou espace. Vue d'ensemble : touche `o`.

## Exporter

```bash
npm run export
```

> Le premier export peut demander d'installer Playwright : `npx playwright install chromium`.

## Conventions du support

- Les blocs `<!-- ... -->` en fin de diapositive sont les **notes du présentateur**, invisibles à l'écran. Elles portent la durée cible, l'élément imposé et le critère visé, ce qu'il faut dire à voix haute, et les réponses préparées aux questions probables.
- `global-bottom.vue` affiche en bas à gauche le **code de compétence** visé par la diapositive courante, et en bas à droite la pagination. La table `REFS` doit être tenue à jour à chaque ajout de diapositive.
- Le diagramme de Gantt est rendu nativement par Slidev, sans bibliothèque supplémentaire.
- Classe utilitaire `dense` sur un conteneur pour réduire la taille des tableaux larges.

## Avancement

| Chapitre | Diapos | Compétence | État |
|----------|:------:|:----------:|------|
| 0. Ouverture, produit, cadre | 1 à 3 | | ✅ |
| 1. Planifier l'exécution | 4 à 10 | **C3.1** ÉLIM | ✅ |
| 2. Piloter l'avancement | 11 à 15 | **C3.2.1** ÉLIM | ⬜ |
| 3. Le cas d'arbitrage | 16 à 18 | C3.2.2 | ⬜ |
| 4. Piloter l'équipe | 19 à 23 | C3.3.1 | ⬜ |
| 5. Les besoins en compétences | 24 à 26 | C3.3.2 | ⬜ |
| 6. Rendre compte au commanditaire | 27 à 29 | C3.4.1 | ⬜ |
| 7. La démonstration | 30, 31 | **C3.4.2** ÉLIM | ⬜ |
| 8. Conclusion | 32 | | ⬜ |
| Annexes pour les questions | A1 à A8 | | ⬜ |

**Règle de numérotation** : aucune diapositive de séparation de chapitre. La page `N` de Slidev correspond exactement à la diapositive `N` du plan, et donc au rattachement des 14 éléments imposés établi dans ce plan. Le titre de chapitre est porté par la première diapositive du chapitre. Toute insertion de diapositive impose de mettre à jour le plan et la table `REFS` dans le même mouvement.
