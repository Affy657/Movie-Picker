<script setup>
// Code de compétence (barème RNCP Bloc 1) visé par chaque diapo.
// Clé = numéro de slide Slidev ; vide = pas de code (couverture, sommaire, séparateurs).
const REFS = {
  3: 'C1.1.2',
  4: 'C1.1.1', 5: 'C1.1.1',
  6: 'C1.1.2', 7: 'C1.1.2',
  8: 'C1.2.1', 9: 'C1.2.1',
  10: 'C1.2.3',
  11: 'C1.2.2', 12: 'C1.2.2',
  13: 'C1.3.1',
  14: 'C1.3.2', 15: 'C1.3.2',
  16: 'C1.5', 17: 'C1.5', 18: 'C1.5',
  19: 'C1.4.1', 20: 'C1.4.1',
  21: 'C1.4.2',
  22: 'C1.6', 23: 'C1.6', 24: 'C1.6',
  26: 'C1.1.1', 27: 'C1.5',
}
</script>

<template>
  <!-- Référence barème, bas-gauche -->
  <footer
    v-if="REFS[$slidev.nav.currentPage]"
    class="abs-bl m-3 text-xs font-mono opacity-60 select-none"
  >
    {{ REFS[$slidev.nav.currentPage] }}
  </footer>

  <!-- Numéro de slide, bas-droite (masqué sur la couverture) -->
  <footer
    v-if="$slidev.nav.currentPage > 1"
    class="abs-br m-3 text-xs opacity-40 select-none"
  >
    {{ $slidev.nav.currentPage }} / {{ $slidev.nav.total }}
  </footer>
</template>

<style>
/* Accent teal du projet (override fiable, indépendant du thème) */
:root {
  --slidev-theme-primary: #0d9488;
}
/* Titres en teal sur les slides de contenu — couverture laissée intacte */
.slidev-layout:not(.cover) h1 {
  color: var(--slidev-theme-primary);
}
/* Le thème default grise le 1er paragraphe après le titre (sous-titre) :
   on le remet à pleine opacité car c'est du contenu réel chez nous. */
.slidev-layout h1 + p {
  opacity: 1;
}
</style>
