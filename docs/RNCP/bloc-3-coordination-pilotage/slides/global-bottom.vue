<script setup>
const REFS = {
  2: 'C3.1', 3: 'C3.1', 4: 'C3.1', 5: 'C3.1', 6: 'C3.1',
}
const ANNEX_FROM = 99
</script>

<template>
  <footer
    v-if="REFS[$slidev.nav.currentPage]"
    class="abs-bl m-3 text-xs font-mono opacity-60 select-none"
  >
    {{ REFS[$slidev.nav.currentPage] }}
  </footer>

  <footer
    v-else-if="$slidev.nav.currentPage >= ANNEX_FROM"
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

  --s1: #0d9488;  --s2: #eb6834;  --s3: #2a78d6;  --s4: #eda100;
  --ok: #0ca30c;

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

.slidev-layout .mermaid,
.slidev-layout .mermaid svg,
.slidev-layout svg[id^='mermaid'] {
  max-height: 287px;
  height: auto;
  width: 100%;
  display: block;
  margin: 0 auto;
}

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

.lede {
  font-size: 1.02rem;
  line-height: 1.35;
  margin: 0.1rem 0 0.7rem;
}

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

.kpi {
  display: grid;
  gap: 0.6rem;
}
.kpi > div {
  border-left: 3px solid var(--slidev-theme-primary);
  padding: 0.15rem 0 0.15rem 0.6rem;
}
.kpi > div > b {
  display: block;
  font-size: 1.55rem;
  line-height: 1.1;
  color: var(--slidev-theme-primary);
}
.kpi span b {
  color: inherit;
}
.kpi span {
  font-size: 0.76rem;
  color: var(--ink-2);
}

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
.cols.stacked i {
  border-radius: 0;
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
.dumb .track .t {
  background: #fff;
  border: 2px solid var(--s2);
  box-sizing: border-box;
}
.dumb .scale {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: 0.66rem;
  color: var(--ink-2);
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
.tl > div > b {
  display: block;
  color: var(--slidev-theme-primary);
}
.tl span b {
  color: inherit;
}
.tl span {
  color: var(--ink-2);
}

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

.horizons {
  display: grid;
  gap: 0.5rem;
  font-size: 0.74rem;
}
.horizons .h {
  border-left: 4px solid var(--s1);
  background: rgb(13 148 136 / 7%);
  padding: 0.45rem 0.65rem;
  border-radius: 0 6px 6px 0;
}
.horizons .h.day {
  border-left-color: var(--s3);
  background: rgb(42 120 214 / 8%);
  margin-left: 2.4rem;
}
.horizons b {
  display: block;
}
.horizons span {
  display: block;
  font-weight: 600;
  color: var(--slidev-theme-primary);
}
.horizons .day span {
  color: var(--s3);
}
.horizons i {
  display: block;
  font-style: normal;
  color: var(--ink-2);
  margin-top: 0.15rem;
  line-height: 1.3;
}

.vee {
  font-size: 0.68rem;
  line-height: 1.2;
}
.vee .row {
  display: grid;
  grid-template-columns: 1fr 1.4rem 1fr;
  gap: 0.3rem;
  align-items: center;
  margin-bottom: 0.3rem;
}
.vee .row.r2 {
  padding: 0 1.7rem;
}
.vee .row.r3 {
  padding: 0 3.4rem;
}
.vee .l,
.vee .r {
  border: 1.5px solid var(--grid);
  border-radius: 5px;
  background: #f8fafc;
  padding: 0.28rem 0.5rem;
}
.vee .l {
  border-left: 4px solid var(--s3);
}
.vee .r {
  border-right: 4px solid var(--s1);
  text-align: right;
}
.vee b {
  display: block;
}
.vee span {
  display: block;
  color: var(--ink-2);
}
.vee .link {
  border-top: 1px dashed #94a3b8;
  height: 0;
}
.vee .base {
  text-align: center;
  color: var(--ink-2);
  font-style: italic;
}

.run {
  display: flex;
  align-items: stretch;
  gap: 0.3rem;
  font-size: 0.68rem;
  line-height: 1.2;
}
.run > div {
  flex: 1;
  border: 1.5px solid #d97706;
  background: #fef3c7;
  color: #78350f;
  border-radius: 5px;
  padding: 0.28rem 0.4rem;
  font-weight: 600;
  text-align: center;
}
.run > div i {
  display: block;
  font-style: normal;
  font-weight: 400;
  color: var(--ink-2);
}
.run > span {
  align-self: center;
  color: var(--ink-2);
}

.board {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.2rem;
  font-size: 0.56rem;
  line-height: 1.15;
}
.board > div {
  border: 1px solid var(--grid);
  border-radius: 4px;
  background: #f8fafc;
  padding: 0.25rem 0.15rem 0.3rem;
  min-height: 4.4rem;
  text-align: center;
}
.board > div > b {
  display: block;
  margin-bottom: 0.2rem;
}
.board i {
  display: block;
  height: 0.42rem;
  margin: 0.16rem 0.12rem 0;
  border-radius: 2px;
  background: rgb(13 148 136 / 22%);
}
.board .done i {
  background: var(--s1);
}

.raci {
  display: grid;
  grid-template-columns: 1fr repeat(5, 3.4rem);
  gap: 2px;
  font-size: 0.7rem;
}
.raci > div {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.45rem;
  border-radius: 3px;
  text-align: center;
}
.raci .h {
  font-weight: 600;
  color: var(--ink-2);
}
.raci .l {
  justify-content: flex-start;
  padding-left: 0.3rem;
  color: var(--ink-2);
  text-align: left;
}
.raci .A {
  background: var(--s1);
  color: #fff;
  font-weight: 700;
}
.raci .R {
  background: rgb(13 148 136 / 40%);
  font-weight: 600;
}
.raci .C {
  background: rgb(13 148 136 / 14%);
}
.raci .I {
  background: rgb(0 0 0 / 9%);
  color: var(--ink-2);
}

.quad {
  display: grid;
  grid-template-columns: 1.2rem 1fr 1fr;
  grid-template-rows: auto auto 1.1rem;
  gap: 4px;
  font-size: 0.68rem;
}
.quad .ay {
  grid-row: 1 / 3;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  color: var(--ink-2);
  font-size: 0.62rem;
  text-align: center;
}
.quad .cell {
  border-radius: 6px;
  background: rgb(13 148 136 / 6%);
  border: 1.5px solid var(--grid);
  padding: 0.4rem 0.55rem;
}
.quad .cell.dom {
  border-color: var(--s1);
  background: rgb(13 148 136 / 16%);
}
.quad .cell > b {
  display: block;
  color: var(--slidev-theme-primary);
  font-size: 0.82rem;
  margin-bottom: 0.15rem;
}
.quad .cell i b {
  color: inherit;
}
.quad .cell i {
  display: block;
  font-style: normal;
  color: var(--ink-2);
  line-height: 1.25;
}
.quad .ax {
  color: var(--ink-2);
  font-size: 0.62rem;
  text-align: center;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  font-size: 0.7rem;
  counter-reset: st;
  padding-top: 0.7rem;
}
.steps > div {
  position: relative;
  border-top: 3px solid var(--s1);
  padding-top: 0.5rem;
  counter-increment: st;
}
.steps > div::before {
  content: counter(st);
  position: absolute;
  top: -0.75rem;
  left: 0;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--s1);
  color: #fff;
  font-size: 0.66rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.steps > div > b {
  display: block;
  color: var(--slidev-theme-primary);
}
.steps span b {
  color: inherit;
}
.steps span {
  display: block;
  color: var(--ink-2);
  line-height: 1.25;
}

.bars {
  display: grid;
  gap: 0.24rem;
  font-size: 0.68rem;
}
.bars > div {
  display: grid;
  grid-template-columns: 9.6rem 1fr;
  gap: 0.5rem;
  align-items: center;
}
.bars span {
  color: var(--ink-2);
  text-align: right;
}
.bars .t {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}
.bars i {
  flex: none;
  display: flex;
  align-items: center;
  padding-left: 0.35rem;
  height: 1.05rem;
  border-radius: 3px;
  background: var(--s1);
  color: #fff;
  font-style: normal;
  font-weight: 600;
  font-size: 0.62rem;
  white-space: nowrap;
}
.bars .p1 i {
  background: #d97706;
}
.bars .p3 i {
  background: var(--s3);
}
.bars i.cont {
  background: repeating-linear-gradient(45deg, var(--s1) 0 4px, rgb(13 148 136 / 55%) 4px 8px);
}
.bars em {
  font-style: normal;
  color: var(--ink-2);
  line-height: 1.2;
}
</style>
