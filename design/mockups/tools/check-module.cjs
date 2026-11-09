const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser, openArtboard, isLocalFileError } = require('./browser.cjs');

const [dir, shots, slugsFile] = process.argv.slice(2);
const slugs = new Set(JSON.parse(fs.readFileSync(slugsFile, 'utf8')));
const BANNED_TYPOGRAPHY = new RegExp('[\\u2014\\u2013\\u00b7\\u2192\\u2190]', 'g');

function inspectArtboard() {
  const root = document.querySelector('#dc-root .S');
  const box = root.getBoundingClientRect();
  const fonts = [
    ...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)),
  ];
  const links = [...root.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  const clipped = (el) => {
    for (let n = el.parentElement; n && n !== root; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflow !== 'visible' || s.overflowX !== 'visible') return true;
    }
    return false;
  };
  const overflow = [];
  const small = [];
  root.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const outside = r.right > box.right + 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1;
    if (outside && !clipped(el) && getComputedStyle(el).position !== 'fixed') {
      overflow.push((el.className.toString() || el.tagName).slice(0, 30));
    }
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (ownText && !el.closest('.poster,.av,.sbar,.lphone,.scale')) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 11) small.push(`${size}px ${el.textContent.trim().slice(0, 20)}`);
    }
  });
  return {
    width: box.width,
    height: Math.round(box.height),
    fonts,
    links,
    holes: root.innerHTML.includes('{{'),
    overflow: [...new Set(overflow)].slice(0, 6),
    small: [...new Set(small)].slice(0, 6),
    text: root.innerText,
  };
}

function isKnownTarget(href) {
  if (href.startsWith('http') || href.startsWith('#')) return true;
  if (href === 'Main.dc.html' || href === 'Sommaire.dc.html') return true;
  return slugs.has(href.replace('.dc.html', ''));
}

function report(file, info, errors) {
  const unknown = info.links.filter((h) => !isKnownTarget(h));
  const typography = (info.text.match(BANNED_TYPOGRAPHY) || []).length;
  const fontsOk = info.fonts.includes('Archivo') && info.fonts.includes('Inter');
  const problems = [
    unknown.length ? `UNKNOWN_LINKS=${unknown.join(',')}` : '',
    info.holes ? 'UNRESOLVED_HOLES' : '',
    info.overflow.length ? `OVERFLOW=${info.overflow.join('|')}` : '',
    info.small.length ? `TEXT_UNDER_11PX=${info.small.join('|')}` : '',
    typography ? `BANNED_TYPOGRAPHY=${typography}` : '',
    fontsOk ? '' : `FONTS=${info.fonts.join('/')}`,
    errors.length ? `CONSOLE=${errors.join(' | ')}` : '',
  ].filter(Boolean);
  const head = `${problems.length ? 'FAIL' : 'OK  '} ${file} ${info.width}x${info.height} links=${info.links.length}`;
  return [head, ...problems].join(' ');
}

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  let errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !isLocalFileError(m.text())) errors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`));
  const lines = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.dc.html'))
    .sort();
  for (const file of files) {
    errors = [];
    try {
      await openArtboard(page, dir, file);
      lines.push(report(file, await page.evaluate(inspectArtboard), errors));
      const root = await page.$('#dc-root .S');
      await root.screenshot({ path: path.join(shots, file.replace('.dc.html', '.png')) });
    } catch (e) {
      lines.push(`FAIL ${file} ${String(e).slice(0, 200)}`);
    }
  }
  console.log(lines.join('\n'));
  await browser.close();
  if (lines.some((l) => l.startsWith('FAIL'))) process.exitCode = 1;
})();
