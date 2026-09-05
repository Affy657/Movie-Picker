<script setup>
const REFS = {
  4: 'C3.1', 5: 'C3.1', 6: 'C3.1', 7: 'C3.1', 8: 'C3.1', 9: 'C3.1', 10: 'C3.1',
  11: 'C3.2.1', 12: 'C3.2.1', 13: 'C3.2.1', 14: 'C3.2.1', 15: 'C3.2.1',
  16: 'C3.2.2', 17: 'C3.2.2', 18: 'C3.2.2',
  19: 'C3.3.1', 20: 'C3.3.1', 21: 'C3.3.1', 22: 'C3.3.1', 23: 'C3.3.1',
  24: 'C3.3.2', 25: 'C3.3.2', 26: 'C3.3.2',
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
  font-size: 0.82em;
}
.dense table {
  font-size: 0.72em;
}
.dense table th,
.dense table td {
  padding: 0.18rem 0.4rem;
  line-height: 1.25;
}
</style>
