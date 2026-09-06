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

  /* Palette categorielle, validee (pire paire adjacente : CVD dE 10.7,
     vision normale dE 27.5). Ordre d'empilement impose. */
  --s1: #0d9488; /* lead */
  --s2: #eb6834; /* front */
  --s3: #2a78d6; /* back */
  --s4: #eda100; /* devops — contraste < 3:1, toujours etiquete en direct */

  /* Statuts : jamais utilises comme couleur de serie, toujours avec un libelle */
  --ok: #0ca30c;
  --warn: #fab219;
  --bad: #d03b3b;

  --ink-2: #52514e;
  --grid: #d9d8d4;
}

.slidev-layout:not(.cover) h1 {
  color: var(--slidev-theme-primary);
  margin-bottom: 0.1rem;
}
.slidev-layout h1 + p {
  opacity: 1;
}
/* Le contenu ayant ete allege diapositive par diapositive, la taille de
   texte est remontee : un support projete se lit depuis le fond de la
   salle. Toute nouvelle baisse doit etre le dernier recours, apres avoir
   coupe du contenu. */
.slidev-layout table {
  font-size: 0.8em;
}
.slidev-layout table th,
.slidev-layout table td {
  padding: 0.2rem 0.45rem;
  line-height: 1.3;
}
.dense table {
  font-size: 0.7em;
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

/* ---- Le message de la diapositive, sous le titre ---- */
.lede {
  font-size: 1.02rem;
  line-height: 1.35;
  margin: 0.1rem 0 0.7rem;
}

/* ---- Bandeaux ---- */
.note,
.alert {
  border-left: 4px solid var(--slidev-theme-primary);
  background: rgb(13 148 136 / 7%);
  padding: 0.5rem 0.7rem;
  line-height: 1.35;
}
.alert {
  border-left-color: #d97706;
  background: rgb(217 119 6 / 8%);
}

/* ---- Rangee d'indicateurs ---- */
.kpi {
  display: grid;
  gap: 0.6rem;
}
.kpi > div {
  border-left: 3px solid var(--slidev-theme-primary);
  padding: 0.15rem 0 0.15rem 0.6rem;
}
.kpi b {
  display: block;
  font-size: 1.55rem;
  line-height: 1.1;
  color: var(--slidev-theme-primary);
}
.kpi span {
  font-size: 0.76rem;
  color: var(--ink-2);
}

/* ---- Histogramme en colonnes ---- */
.cols {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 8.5rem;
  border-bottom: 1px solid var(--grid);
}
.cols > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
}
.cols i {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: var(--s1);
  display: block;
}
.cols i.b {
  background: var(--s3);
}
.cols em {
  font-style: normal;
  font-size: 0.66rem;
  color: var(--ink-2);
  line-height: 1.1;
}
.cols .pair {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  width: 100%;
  flex: 1;
}
.cols .pair > i {
  flex: 1;
}
.xlab {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.2rem;
}
.xlab > div {
  flex: 1;
  text-align: center;
  font-size: 0.68rem;
  color: var(--ink-2);
}

/* ---- Barre empilee ---- */
.stack {
  display: flex;
  width: 100%;
  height: 1.5rem;
  gap: 2px;
}
.stack > i {
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 600;
  color: #fff;
  border-radius: 3px;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.9rem;
  font-size: 0.7rem;
  color: var(--ink-2);
  margin-top: 0.3rem;
}
.legend span {
  color: var(--ink-2);
}
.legend span.nokey::before {
  display: none;
}
.legend span::before {
  content: '';
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 2px;
  margin-right: 0.28rem;
  background: var(--c, currentColor);
  vertical-align: baseline;
}

/* ---- Ecart actuel -> cible ---- */
.dumb {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.1rem 0.6rem;
  align-items: center;
  font-size: 0.74rem;
}
.dumb .lbl {
  color: var(--ink-2);
  text-align: right;
  line-height: 1.15;
}
.dumb .track {
  position: relative;
  height: 1.05rem;
}
.dumb .track::before {
  content: '';
  position: absolute;
  inset: 50% 0 auto;
  height: 1px;
  background: var(--grid);
}
.dumb .track u {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 50%;
  text-decoration: none;
}
.dumb .track .a {
  background: #a7b0ae;
}
.dumb .track .c {
  background: var(--s1);
}
.dumb .track .bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 3px;
  background: var(--s1);
  opacity: 0.45;
  border-radius: 2px;
}
.dumb .track .bar.big {
  opacity: 1;
  height: 5px;
}

/* ---- Logigramme ---- */
.flow {
  font-size: 0.7rem;
  line-height: 1.2;
}
.flow .q,
.flow .r {
  border-radius: 5px;
  padding: 0.3rem 0.5rem;
  text-align: center;
}
.flow .q {
  border: 1.5px solid #94a3b8;
  background: #f1f5f9;
}
.flow .r {
  border: 1.5px solid #d97706;
  background: #fef3c7;
  color: #78350f;
  font-weight: 600;
}
.flow .r.no {
  border-color: #dc2626;
  background: #fee2e2;
  color: #7f1d1d;
}
.flow .r.go {
  border-color: #0d9488;
  background: #ccfbf1;
  color: #134e4a;
}
.flow .row {
  display: grid;
  grid-template-columns: 1fr 5.4rem;
  gap: 0.35rem;
  align-items: center;
}
.flow .arrow {
  text-align: center;
  color: #94a3b8;
  font-size: 0.66rem;
  line-height: 0.9;
}

/* ---- Frise ---- */
.tl {
  display: flex;
  align-items: stretch;
  gap: 2px;
  font-size: 0.66rem;
}
.tl > div {
  flex: 1;
  border-top: 3px solid var(--s1);
  padding-top: 0.28rem;
  line-height: 1.2;
}
.tl b {
  display: block;
  color: var(--slidev-theme-primary);
}
.tl span {
  color: var(--ink-2);
}

/* ---- Pastilles d'etat ---- */
.chips {
  display: grid;
  gap: 0.22rem 0.6rem;
  font-size: 0.74rem;
}
.chips > div {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  border-bottom: 1px solid var(--grid);
  padding-bottom: 0.12rem;
}
.chips u {
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}
</style>
