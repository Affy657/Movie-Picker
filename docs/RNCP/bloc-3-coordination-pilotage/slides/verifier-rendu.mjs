// Contrôle de rendu du support : détecte les diapositives dont le contenu est
// coupé par le bas du cadre. Aucun autre contrôle du dossier ne voit ce défaut —
// le compte de diapositives, l'équilibre des <div> et le minutage restent verts
// sur une diapositive dont le tiers inférieur est invisible.
//
// Mode d'emploi :
//   npm run build
//   # la police du thème (Nunito Sans) est chargée depuis Google Fonts au rendu.
//   # Sans réseau, le navigateur retombe sur une police plus large et le contrôle
//   # signale de faux débordements. On la place donc à côté du build :
//   curl -sS "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200;400;600" \
//     -A "Mozilla/5.0 Chrome/120" | grep -o 'https://[^)]*woff2' | head -1 \
//     | xargs curl -sS -o dist/nunitosans.woff2
//   npx http-server dist -p 8099 --silent &
//   node verifier-rendu.mjs
//
// Sort en code 1 si au moins une diapositive déborde.

import { chromium } from 'playwright-chromium'
import { existsSync } from 'node:fs'

const BASE = process.env.SLIDES_URL ?? 'http://127.0.0.1:8099'
const NB_DIAPOS = 40
const FONT = 'nunitosans.woff2'

const face = existsSync(`dist/${FONT}`)
  ? `@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:200 700;font-stretch:100%;src:url('/${FONT}') format('woff2');}`
  : null

if (!face) {
  console.warn(
    `⚠️  dist/${FONT} absent : le rendu utilisera une police de repli, plus large que\n` +
    `   Nunito Sans, et signalera des débordements qui n'existent pas. Voir l'en-tête du fichier.`,
  )
}

const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const page = await navigateur.newPage({ viewport: { width: 1280, height: 720 } })
const CADRE = 720
const debordent = []

for (let n = 1; n <= NB_DIAPOS; n++) {
  await page.goto(`${BASE}/${n}`, { waitUntil: 'networkidle' })
  if (face) {
    await page.addStyleTag({ content: face })
    await page.evaluate(() => document.fonts.ready)
  }
  await page.waitForTimeout(1200)

  const mesure = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('.slidev-layout')].filter((e) => {
      const r = e.getBoundingClientRect()
      return r.height > 10 && r.top > -50 && r.top < 100 && r.left > -50 && r.left < 200
    })
    let bas = 0
    let extrait = ''
    for (const racine of visibles) {
      const noter = (el, libelle) => {
        const r = el.getBoundingClientRect()
        if (r.height < 1 || r.width < 1) return
        if (r.bottom > bas) {
          bas = r.bottom
          extrait = libelle
        }
      }
      racine.querySelectorAll('*').forEach((el) => {
        if (el.children.length || el.closest('footer, nav')) return
        const texte = (el.textContent ?? '').trim()
        if (texte) noter(el, texte.slice(0, 45))
      })
      racine.querySelectorAll('svg').forEach((el) => noter(el, '(diagramme)'))
    }
    return { bas: Math.round(bas), extrait }
  })

  const depassement = mesure.bas - CADRE
  if (depassement > 4) {
    debordent.push({ n, depassement, extrait: mesure.extrait })
    console.log(`⚠️  diapo ${String(n).padStart(2)} : déborde de ${depassement} px — « ${mesure.extrait} »`)
  }
}

console.log(
  debordent.length
    ? `\n❌ ${debordent.length} diapositive(s) coupée(s) : ${debordent.map((d) => d.n).join(', ')}`
    : '\n✅ les 40 diapositives tiennent dans le cadre',
)

await navigateur.close()
process.exit(debordent.length ? 1 : 0)
