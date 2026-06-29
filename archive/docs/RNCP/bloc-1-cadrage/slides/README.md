# Diapos Slidev — Oral Bloc 1 (Movie Picker)

Présentation générée à partir de `../diapositives-oral.md` (qui reste la **source de vérité** du contenu).

## Lancer en local

```bash
npm install
npm run dev        # ouvre http://localhost:3030
```

- **Mode présentateur** (avec les notes orales + critères) : http://localhost:3030/presenter
- Navigation : flèches ← → ou espace. Vue d'ensemble : touche `o`.

## Exporter

```bash
npm run export                      # PDF -> slides-export.pdf
npm run export -- --format pptx     # PowerPoint
```

> Le premier export peut demander d'installer Playwright : `npx playwright install chromium`.

## Notes

- Les **5 schémas Mermaid** (déploiement, architecture hexagonale, mindmap fonctionnel, matrice Mendelow, séquence) sont rendus nativement par Slidev.
- Les blocs `<!-- ... -->` en fin de diapo = **notes du présentateur** (invisibles à l'écran).
- Quelques diapos denses (parties prenantes, SWOT, comparatif, charge) ont une taille de police réduite via un `<style>` local ; ajuste si besoin.
- Thème : `seriph` (sobre, sérif — adapté à un jury). Changeable dans l'entête de `slides.md`.
