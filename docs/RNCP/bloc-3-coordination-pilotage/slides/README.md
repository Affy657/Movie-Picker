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
npm run verify:rendu
```

Construit le support, le sert, le rend dans un navigateur et signale les diapositives dont le contenu est **coupé par le bas du cadre**, ce qu'aucun autre contrôle du dossier ne voit. Il **échoue** (code 1) si une diapositive déborde, si `dist/` manque, ou s'il n'a rien pu mesurer : un résultat vert signifie que les 31 pages ont réellement été rendues et mesurées.

> La police du thème est récupérée automatiquement dans `dist/`. Sans elle le navigateur retombe sur une police plus large et le contrôle signalerait de faux débordements, il refuse donc de tourner plutôt que de mentir. `CHROME_PATH` permet de désigner un Chromium déjà installé.

## Exporter

```bash
npm run export
```

> Le premier export peut demander d'installer Playwright : `npx playwright install chromium`.
>
> ⚠️ L'export **ne corrige rien** : une diapositive coupée à l'écran l'est aussi dans le PDF. Passer `verify:rendu` avant. En revanche l'export **fige les polices**, ce qui met le support à l'abri d'une salle sans réseau, le thème charge sinon Nunito Sans depuis Google Fonts au moment du rendu.

## Conventions du support

- Les blocs `<!-- ... -->` en fin de diapositive sont les **notes du présentateur**, invisibles à l'écran. Elles portent la durée cible, l'élément imposé et le critère visé, ce qu'il faut dire à voix haute, et les réponses préparées aux questions probables.
- `global-bottom.vue` affiche en bas à gauche le **code de compétence** visé par la diapositive courante, et en bas à droite la pagination. La table `REFS` doit être tenue à jour à chaque ajout de diapositive.
- **Les schémas sont en HTML et CSS, pas en Mermaid.** La syntaxe `{scale: …}` d'un bloc Mermaid **n'a aucun effet** dans cette version : le diagramme rend en taille pleine et déborde. Les primitives sont dans `global-bottom.vue` et documentées ci-dessous. Le seul Mermaid restant est le schéma d'architecture de l'annexe A1, assez petit pour tenir.
- **Une diapositive = une idée, énoncée dans le titre**, une preuve visuelle, et le reste en note de présentateur. Le jury n'a que les diapositives : ce qui doit être vu est à l'écran, ce qui doit être dit est dans la note.

### Les primitives graphiques (`global-bottom.vue`)

| Classe | Usage |
|--------|-------|
| `.lede` | Le message de la diapositive, sous le titre |
| `.note` / `.alert` | Bandeau teal (constat) / ambre (limite assumée, autocritique) |
| `.kpi` | Rangée d'indicateurs, grand nombre + libellé |
| `.cols` + `.xlab` | Histogramme en colonnes, étiquettes de valeur en `<em>` |
| `.stack` + `.legend` | Barre empilée, étiquetée en direct |
| `.dumb` | Écart actuel → cible (haltères) |
| `.flow` | Logigramme : `.q` question, `.r` issue, `.r.no` refus, `.r.go` décision |
| `.tl` | Frise |
| `.chips` | Liste d'états valeur / verdict, ou sommaire |
| `.horizons` | Deux échelles de temps emboîtées (outils de planification) |
| `.raci` | Grille RACI colorée, une classe par lettre |
| `.quad` | Quadrant 2 × 2, `.dom` sur la case dominante (styles managériaux) |
| `.steps` | Trois pas numérotés (publics servis, niveaux de compte rendu) |
| `.bars` | Barres horizontales étiquetées, `.p1` / `.p3` pour la priorité, `.cont` pour une action continue (plan de formation) |

**Contraintes de rendu.** Les blocs Mermaid ignorent leur `{scale: …}` dans cette version de Slidev : le SVG est contraint par `max-height` en **pixels** et non en `vh`, la toile Slidev fait 552 px de haut et n'est que mise à l'échelle par `transform`, donc une unité de fenêtre cesserait de contraindre dès que la fenêtre dépasse 1062 px.

**Taille de texte.** Les tableaux sont à `0.8em` (`0.7em` en classe `dense`). Le contenu ayant été allégé diapositive par diapositive, toute nouvelle baisse doit être le **dernier recours**, après avoir coupé du contenu : un support projeté se lit depuis le fond de la salle.

**Palette de séries** : `--s1` à `--s4`, validée (pire paire adjacente ΔE 10.7 en vision déficiente, 27.5 en vision normale). `--s4` est sous 3:1 de contraste : **toujours l'étiqueter en direct**. Les couleurs d'état (`--ok`, `--warn`, `--bad`) ne servent jamais de couleur de série et vont toujours avec un libellé.

⚠️ **Piège markdown** : à l'intérieur d'un bloc HTML, une ligne qui commence par une balise **inline** (`<b>`, `<span>`) après une ligne vide est enveloppée dans un `<p>` et casse la grille. Commencer chaque ligne par `<div>`.
- Classe utilitaire `dense` sur un conteneur pour réduire la taille des tableaux larges.

## Avancement

| Chapitre | Diapos | Compétence | État |
|----------|:------:|:----------:|------|
| 0. Titre et sommaire | 1, 2 | | ✅ |
| 1. Démonstration en direct | 3 | **C3.4.2** ÉLIM | ✅ |
| 2. Planifier l'exécution | 4 à 8 | **C3.1** ÉLIM | ✅ |
| 3. Piloter l'avancement | 9 à 12 | **C3.2.1** ÉLIM | ✅ |
| 4. Le cas d'arbitrage | 13 | C3.2.2 | ✅ |
| 5. Piloter le travail, seul | 14 à 17 | C3.3.1 | ✅ |
| 6. Les besoins en compétences | 18, 19 | C3.3.2 | ✅ |
| 7. Rendre compte au commanditaire | 20 à 22 | C3.4.1 | ✅ |
| 8. Bilan, et la demande de validation | 23 | **C3.4.2** ÉLIM | ✅ |
| Annexes pour les questions | 24 à 31 | | ✅ |

**Support complet : 31 diapositives**, dont 23 présentées et 8 annexes appelées uniquement sur question. Les 31 **tiennent dans le cadre**, vérifié par `npm run verify:rendu`. Les annexes portent la mention `ANNEXE` en pied de page ; les diapositives présentées portent la compétence évaluée.

**Navigation pendant les questions** : en mode présentateur, taper le numéro de page puis `Entrée` va directement à la diapositive. A1 architecture = **24**, A2 logigramme = **25**, A3 arbitrages de réserve = **26**, A4 budget = **27**, A5 chaîne = **28**, A6 RACI = **29**, A7 journal des versions = **30**, A8 retours utilisateurs = **31**.

**Règle de numérotation** : aucune diapositive de séparation de chapitre. La page `N` de Slidev correspond exactement à la diapositive `N` du plan, et donc au rattachement des 14 éléments imposés établi dans ce plan. Le titre de chapitre est porté par la première diapositive du chapitre. Toute insertion de diapositive impose de mettre à jour le plan et la table `REFS` dans le même mouvement.
