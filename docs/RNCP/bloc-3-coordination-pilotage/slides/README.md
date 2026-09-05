# Diapos Slidev, oral Bloc 3 (Movie Picker)

Support de la présentation orale du 16 septembre 2026. Le contenu est dérivé des fichiers de matière du dossier parent (`01-planification.md`, `02-suivi-indicateurs.md` et suivants), qui restent la **source de vérité**. La structure et le minutage sont arrêtés dans [`../00-plan-presentation-orale.md`](../00-plan-presentation-orale.md).

## Lancer en local

```bash
npm install
npm run dev
```

- Le support s'ouvre sur http://localhost:3030
- **Mode présentateur**, avec les notes orales, les durées et les critères visés : http://localhost:3030/presenter
- Navigation : flèches ou espace. Vue d'ensemble : touche `o`.

## Vérifier le rendu

```bash
npm run build
npx http-server dist -p 8099 --silent &
npm run verify:rendu
```

Détecte les diapositives dont le contenu est **coupé par le bas du cadre** — ce qu'aucun autre contrôle du dossier ne voit. Mode d'emploi complet, dont la récupération de la police du thème, en tête de [`verifier-rendu.mjs`](verifier-rendu.mjs).

## Exporter

```bash
npm run export
```

> Le premier export peut demander d'installer Playwright : `npx playwright install chromium`.
>
> ⚠️ L'export **ne corrige rien** : une diapositive coupée à l'écran l'est aussi dans le PDF. Passer `verify:rendu` avant. En revanche l'export **fige les polices**, ce qui met le support à l'abri d'une salle sans réseau — le thème charge sinon Nunito Sans depuis Google Fonts au moment du rendu.

## Conventions du support

- Les blocs `<!-- ... -->` en fin de diapositive sont les **notes du présentateur**, invisibles à l'écran. Elles portent la durée cible, l'élément imposé et le critère visé, ce qu'il faut dire à voix haute, et les réponses préparées aux questions probables.
- `global-bottom.vue` affiche en bas à gauche le **code de compétence** visé par la diapositive courante, et en bas à droite la pagination. La table `REFS` doit être tenue à jour à chaque ajout de diapositive.
- Le Gantt de la diapositive 6 est en **HTML et CSS** (grille `.gantt`), pas en Mermaid : c'est ce qui permet de le caler au pixel sur l'axe des mois. Les deux seuls blocs Mermaid du support sont le **logigramme de la diapositive 17** et sa version complète en **annexe A2 (diapo 34)**, rendus nativement par Slidev.
- ⚠️ La syntaxe `{scale: 0.52}` après l'ouverture d'un bloc Mermaid **n'a aucun effet** dans cette version : la diapositive 17 rend le logigramme en taille pleine et n'en montre que 3 nœuds sur 8. À corriger par CSS. Voir `../RESTE-A-FAIRE.md` § 0.
- Classe utilitaire `dense` sur un conteneur pour réduire la taille des tableaux larges.

## Avancement

| Chapitre | Diapos | Compétence | État |
|----------|:------:|:----------:|------|
| 0. Ouverture, produit, cadre | 1 à 3 | | ✅ |
| 1. Planifier l'exécution | 4 à 10 | **C3.1** ÉLIM | ✅ |
| 2. Piloter l'avancement | 11 à 15 | **C3.2.1** ÉLIM | ✅ |
| 3. Le cas d'arbitrage | 16 à 18 | C3.2.2 | ✅ |
| 4. Piloter l'équipe | 19 à 23 | C3.3.1 | ✅ |
| 5. Les besoins en compétences | 24 à 26 | C3.3.2 | ✅ |
| 6. Rendre compte au commanditaire | 27 à 29 | C3.4.1 | ✅ |
| 7. La démonstration | 30, 31 | **C3.4.2** ÉLIM | ✅ |
| 8. Conclusion | 32 | | ✅ |
| Annexes pour les questions | 33 à 40 | | ✅ |

**Support complet : 40 diapositives**, dont 32 présentées et 8 annexes appelées uniquement sur question. ⚠️ **Mise en page à reprendre sur 17 d'entre elles**, dont le contenu est coupé à l'écran — voir [`../RESTE-A-FAIRE.md`](../RESTE-A-FAIRE.md) § 0. Les annexes portent la mention `ANNEXE` en bas à gauche à la place du code de compétence.

**Navigation pendant les questions** : en mode présentateur, taper le numéro de page puis `Entrée` va directement à la diapositive. A1 architecture = **33**, A2 logigramme = **34**, A3 arbitrages de réserve = **35**, A4 budget = **36**, A5 chaîne CI/CD = **37**, A6 RACI = **38**, A7 journal des versions = **39**, A8 retours utilisateurs = **40**.

**Règle de numérotation** : aucune diapositive de séparation de chapitre. La page `N` de Slidev correspond exactement à la diapositive `N` du plan, et donc au rattachement des 14 éléments imposés établi dans ce plan. Le titre de chapitre est porté par la première diapositive du chapitre. Toute insertion de diapositive impose de mettre à jour le plan et la table `REFS` dans le même mouvement.
