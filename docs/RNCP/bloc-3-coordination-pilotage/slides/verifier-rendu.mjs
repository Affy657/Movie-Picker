import { chromium } from 'playwright-chromium'
import { createServer } from 'node:http'
import { readFile, writeFile, access } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const RACINE = resolve(import.meta.dirname, 'dist')
const SOURCE = resolve(import.meta.dirname, 'slides.md')
const POLICE = 'nunitosans.woff2'
const CADRE = 720
const MARGE = 4

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const echec = (message) => {
  console.error(`\n❌ ${message}`)
  process.exit(1)
}

async function compterDiapositives() {
  const source = await readFile(SOURCE, 'utf8').catch(() => echec(`slides.md introuvable : ${SOURCE}`))
  const separateurs = source.split('\n').filter((ligne) => ligne.trim() === '---').length
  if (separateurs < 3) echec('slides.md ne contient pas de séparateur de diapositive.')
  return separateurs - 1
}

async function assurerPolice() {
  const cible = join(RACINE, POLICE)
  if (await access(cible).then(() => true, () => false)) return

  const entete = {
    'user-agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
  const css = await fetch('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200;400;600', {
    headers: entete,
  })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null)

  const url = css?.match(/https:\/\/[^)"' ]+\.woff2/)?.[0]
  const octets = url
    ? await fetch(url, { headers: entete })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null)
    : null

  if (!octets) {
    echec(
      `police du thème absente et non téléchargeable.\n` +
        `   Sans Nunito Sans le navigateur retombe sur une police plus large et le contrôle\n` +
        `   signale des débordements qui n'existent pas. Placer le fichier puis relancer :\n` +
        `   dist/${POLICE}`,
    )
  }
  await writeFile(cible, Buffer.from(octets))
}

function servir() {
  const serveur = createServer(async (requete, reponse) => {
    const chemin = decodeURIComponent(new URL(requete.url, 'http://x').pathname)
    const candidat = join(RACINE, chemin)
    const fichier = candidat.startsWith(RACINE)
      ? await readFile(candidat).catch(() => null)
      : null
    const corps = fichier ?? (await readFile(join(RACINE, 'index.html')).catch(() => null))
    if (!corps) {
      reponse.writeHead(500).end()
      return
    }
    reponse.writeHead(200, {
      'content-type': fichier ? (TYPES[extname(candidat)] ?? 'application/octet-stream') : TYPES['.html'],
    })
    reponse.end(corps)
  })
  return new Promise((ok) => serveur.listen(0, '127.0.0.1', () => ok(serveur)))
}

const mesurer = (numero) => {
  const racine =
    document.querySelector(`[data-slidev-no="${numero}"]`) ??
    [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().height > 10)
  if (!racine) return { absent: true }
  let bas = 0
  let extrait = ''
  const noter = (el, libelle) => {
    const r = el.getBoundingClientRect()
    if (r.height < 1 || r.width < 1 || r.bottom <= bas) return
    bas = r.bottom
    extrait = libelle
  }
  for (const el of racine.querySelectorAll('*')) {
    if (el.closest('footer, nav')) continue
    if (el.tagName === 'svg') {
      noter(el, '(diagramme)')
      continue
    }
    const texte = (el.textContent ?? '').trim()
    noter(el, texte ? texte.slice(0, 45) : `<${el.tagName.toLowerCase()}>`)
  }
  return { bas: Math.round(bas), extrait }
}

const FACE = `@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:200 700;font-stretch:100%;src:url('/${POLICE}') format('woff2');}`

const total = await compterDiapositives()
await readFile(join(RACINE, 'index.html')).catch(() =>
  echec(`dist/ absent ou incomplet. Lancer « npm run build » d'abord.`),
)
await assurerPolice()

const serveur = await servir()
const base = `http://127.0.0.1:${serveur.address().port}`
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const debordent = []
const muettes = []

try {
  const page = await navigateur.newPage({ viewport: { width: 1280, height: CADRE } })

  for (let numero = 1; numero <= total; numero += 1) {
    const rendue = await page
      .goto(`${base}/${numero}`, { waitUntil: 'networkidle', timeout: 20000 })
      .then(async () => {
        await page.addStyleTag({ content: FACE })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForFunction(
          (n) => document.querySelector(`[data-slidev-no="${n}"]`) !== null,
          numero,
          { timeout: 15000 },
        )
        return true
      })
      .catch(() => false)

    const mesure = rendue ? await page.evaluate(mesurer, numero) : { absent: true }

    if (mesure.absent || mesure.bas === 0) {
      muettes.push(numero)
      console.error(`❌ diapo ${numero} : rien de mesurable — la page ne s'est pas rendue`)
      continue
    }
    const depassement = mesure.bas - CADRE
    if (depassement > MARGE) {
      debordent.push(numero)
      console.log(`⚠️  diapo ${numero} : déborde de ${depassement} px — « ${mesure.extrait} »`)
    }
  }
} finally {
  await navigateur.close()
  serveur.close()
}

if (muettes.length) {
  echec(
    `${muettes.length} diapositive(s) n'ont rien rendu : ${muettes.join(', ')}.\n` +
      `   Le contrôle n'a rien vérifié — ne pas lire ce résultat comme un succès.`,
  )
}
if (debordent.length) {
  echec(`${debordent.length} diapositive(s) coupée(s) : ${debordent.join(', ')}`)
}
console.log(`\n✅ les ${total} diapositives tiennent dans le cadre`)
