<script setup>
const REFS = {
  4: 'C3.1', 5: 'C3.1', 6: 'C3.1', 7: 'C3.1', 8: 'C3.1', 9: 'C3.1', 10: 'C3.1',
  11: 'C3.2.1', 12: 'C3.2.1', 13: 'C3.2.1', 14: 'C3.2.1', 15: 'C3.2.1',
  16: 'C3.2.2', 17: 'C3.2.2', 18: 'C3.2.2',
  19: 'C3.3.1', 20: 'C3.3.1', 21: 'C3.3.1', 22: 'C3.3.1', 23: 'C3.3.1',
  24: 'C3.3.2', 25: 'C3.3.2', 26: 'C3.3.2',
  27: 'C3.4.1', 28: 'C3.4.1', 29: 'C3.4.1',
  30: 'C3.4.2', 31: 'C3.4.2',
}
</script>

<template>
  <footer
    v-if="REFS[$slidev.nav.currentPage]"
    class="abs-bl m-3 text-xs font-mono opacity-60 select-none"
  >
    {{ REFS[$slidev.nav.currentPage] }}
  </footer>

  <footer
    v-else-if="$slidev.nav.currentPage > 32"
    class="abs-bl m-3 text-xs font-mono opacity-60 select-none"
  >
    ANNEXE
  </footer>

  <footer
    v-if="$slidev.nav.currentPage > 1"
    class="abs-br m-3 text-xs opacity-40 select-none"
  >
    {{ $slidev.nav.currentPage }} / {{ $slidev.nav.total }}
  </footer>
</template>

<style>
:root {
  --slidev-theme-primary: #0d9488;
}
.slidev-layout:not(.cover) h1 {
  color: var(--slidev-theme-primary);
}
.slidev-layout h1 + p {
  opacity: 1;
}
.slidev-layout table {
  font-size: 0.74em;
}
.slidev-layout table th,
.slidev-layout table td {
  padding: 0.2rem 0.45rem;
  line-height: 1.3;
}
.dense table {
  font-size: 0.64em;
}
.dense table th,
.dense table td {
  padding: 0.14rem 0.35rem;
  line-height: 1.2;
}

/* --- Contraintes de rendu ---------------------------------------------
   Ajoutées le 05/09/2026 après le premier rendu réel du support : 22 des
   40 diapositives avaient du contenu coupé par le bas du cadre. Les
   contrôles qui lisent le Markdown ne voient pas ce défaut ; seul
   `verifier-rendu.mjs` le détecte. Relancer ce contrôle après toute
   retouche de ces règles. ---------------------------------------------- */

/* Les diagrammes Mermaid ignorent le `{scale: …}` du bloc de code dans
   cette version de Slidev : on contraint le SVG lui-même. Sans cela, le
   logigramme de la diapositive 17 — nommé explicitement par la grille
   C3.2.2 — dépasse de 677 px et n'affiche que 3 nœuds sur 8. */
.slidev-layout .mermaid,
.slidev-layout .mermaid svg,
.slidev-layout svg[id^='mermaid'] {
  max-height: 52vh;
  height: auto;
  width: 100%;
  display: block;
  margin: 0 auto;
}

/* Resserre le corps de texte et les blocs encadrés, qui portent souvent la
   conclusion de la diapositive — donc ce qui disparaît en premier. */
.slidev-layout h1 {
  margin-bottom: 0.5rem;
  line-height: 1.15;
}
.slidev-layout h3 {
  margin-top: 0.35rem;
  margin-bottom: 0.3rem;
}
.slidev-layout p,
.slidev-layout ul,
.slidev-layout ol {
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
  line-height: 1.35;
}
.slidev-layout li {
  margin-top: 0.1rem;
  margin-bottom: 0.1rem;
}
</style>
