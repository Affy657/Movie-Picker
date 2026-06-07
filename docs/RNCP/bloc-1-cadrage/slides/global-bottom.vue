<template>
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
