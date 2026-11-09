const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser, openArtboard, isLocalFileError } = require('./browser.cjs');

const dir = process.argv[2] || path.join(__dirname, '..', 'build', 'canvas', 'project');
const shots = process.argv[3] || path.join(__dirname, '..', 'build', 'shots');
const results = [];
const check = (name, ok, extra = '') =>
  results.push(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? `: ${extra}` : ''}`);

function inspectArtboard() {
  const root = document.querySelector('#dc-root .S');
  const box = root.getBoundingClientRect();
  const fonts = [
    ...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)),
  ];
  const links = [...root.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  return {
    width: box.width,
    height: Math.round(box.height),
    fonts,
    links,
    holes: root.innerHTML.includes('{{'),
  };
}

async function renderAll(page, errors) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.dc.html'))
    .sort();
  for (const file of files) {
    const before = errors.length;
    try {
      await openArtboard(page, dir, file);
      const info = await page.evaluate(inspectArtboard);
      const missing = info.links.filter(
        (h) => !h.startsWith('http') && !h.startsWith('#') && !fs.existsSync(path.join(dir, h))
      );
      const fontsOk = info.fonts.includes('Archivo') && info.fonts.includes('Inter');
      check(
        `${file} renders ${info.width}x${info.height}`,
        !info.holes && missing.length === 0 && fontsOk,
        [
          `links ${info.links.length}`,
          missing.length ? `missing ${missing.join(',')}` : '',
          info.holes ? 'unresolved holes' : '',
          fontsOk ? '' : `fonts ${info.fonts.join('/')}`,
        ]
          .filter(Boolean)
          .join(', ')
      );
      const root = await page.$('#dc-root .S');
      await root.screenshot({ path: path.join(shots, file.replace('.dc.html', '.png')) });
    } catch (e) {
      check(`${file} renders`, false, String(e).slice(0, 160));
    }
    if (errors.length > before) check(`${file} console`, false, errors.slice(before).join(' | '));
  }
}

async function scrollsTo(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector('#dc-root .S');
    root.scrollTop = 10000;
    const link = root.querySelector(sel);
    if (!link) return false;
    const r = link.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const frame = root.getBoundingClientRect();
    return (
      y > frame.top && y < frame.bottom && document.elementFromPoint(x, y)?.closest('a') === link
    );
  }, selector);
}

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 2300, height: 1300 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !isLocalFileError(m.text())) errors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`));
  const open = (file) => openArtboard(page, dir, file);
  const text = (sel) => page.$eval(sel, (e) => e.textContent.trim());
  const count = (sel) => page.$$eval(sel, (l) => l.length);

  await renderAll(page, errors);

  await open('Sommaire.dc.html');
  const contentsLinks = await page.$$eval('a.contents-i', (l) =>
    l.map((a) => a.getAttribute('href'))
  );
  const screens = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.dc\.html$/.test(f));
  check(
    'contents page links every screen',
    screens.every((f) => contentsLinks.includes(f)),
    `${contentsLinks.length} links for ${screens.length} screens`
  );

  await open('02-soiree.dc.html');
  await page.click('.gc:nth-child(2) .vb:first-of-type');
  check('02 upvote Orbite basse', (await text('.gc:nth-child(2) .sc')) === '+4');
  await page.click('.gc:nth-child(1) .vb:first-of-type');
  check('02 withdraw the vote on the leader', (await text('.gc:nth-child(1) .sc')) === '+3');

  await open('12-m-soiree.dc.html');
  await page.click('.mr:nth-child(3) .vb:nth-of-type(2)');
  check('12 downvote Minuit à Kyoto', (await text('.mr:nth-child(3) .g')) === '0');

  await open('15-m-noter.dc.html');
  await page.click('.stars5 .st:nth-child(2)');
  check(
    '15 two stars',
    (await text('.rlab')) === '4 sur 10, bof' && (await count('.stars5 .st.on')) === 2
  );

  await open('08-creer.dc.html');
  await page.fill('.cform .fld input', 'Ciné du dimanche');
  check('08 preview follows the title', (await text('.inv .it')) === 'Ciné du dimanche');
  await page.click('.sugg .chip:nth-child(2)');
  check('08 theme suggestion', (await text('.inv .ith .chip')) === 'Années 80');

  await open('19-m-creer.dc.html');
  check('19 error shown at start', !!(await page.$('.msg')));
  await page.fill('.mcf .fld:nth-of-type(3) input, .mcf input.err', 'Nuits blanches');
  check('19 error cleared', !(await page.$('.msg')));

  await open('06-ma-liste.dc.html');
  const all = await count('.wlc');
  await page.fill('.wsrch input', 'orbite');
  const searched = await count('.wlc');
  const counter = await text('.wcnt');
  await page.click('.wclr');
  await page.click('.wfb');
  await page.click('.wfp .chip:has-text("Séries")');
  const series = await count('.wlc');
  await page.click('[aria-label="Affichage liste"]');
  const rows = await count('.wlr');
  check(
    '06 search, filters and list view',
    all === 14 &&
      searched === 2 &&
      counter === '2 sur 48' &&
      series === 1 &&
      rows === 1 &&
      !(await page.$('.wgr')),
    `all ${all}, orbite ${searched} (${counter}), series ${series}, list ${rows}`
  );

  await open('05-mes-soirees.dc.html');
  await page.click('.ph .seg button:nth-child(2)');
  check(
    '05 history tab',
    !(await page.$('.egrid')) &&
      (await text('.sh h2')) === 'Historique' &&
      (await count('.hrow')) === 6
  );

  await open('16-m-mes-soirees.dc.html');
  await page.click('.mseg .seg button:nth-child(2)');
  check('16 history tab', !(await page.$('.mec')) && (await count('.mh')) === 6);

  await open('01-explorer.dc.html');
  await page.click('.hb button.btn');
  check('01 add to my list', (await text('.hb button.btn')) === 'Dans ma liste');
  check(
    '01 scrolls to the collections row',
    await scrollsTo(page, 'a.more[href="37-collections.dc.html"]')
  );

  await open('10-explorer-clair.dc.html');
  check(
    '10 scrolls to the trending row',
    await scrollsTo(page, 'a.more[href="36-tendances.dc.html"]')
  );

  await open('11-m-explorer.dc.html');
  check(
    '11 scrolls to the trending row',
    await scrollsTo(page, 'a.more[href="43-m-tendances.dc.html"]')
  );

  await open('63-menu-compte.dc.html');
  await page.click('.xd-th button[aria-label="Clair"]');
  await page.waitForTimeout(150);
  check(
    '63 light theme closes onto 10',
    (await page.$eval('#dc-root .xd-catch', (a) => a.getAttribute('href'))) ===
      '10-explorer-clair.dc.html'
  );

  await open('57-m-partager.dc.html');
  check(
    '57 share link opens the phone invitation',
    (await page.$eval('#dc-root .xc-url', (a) => a.getAttribute('href'))) ===
      '20-m-invitation.dc.html'
  );

  await open('03-roue.dc.html');
  check('03 wheel spinning', (await text('.wtxt h1')) === 'Ça tourne');
  await page.waitForTimeout(5200);
  check(
    '03 wheel stopped',
    (await text('.wtxt h1')) === 'Verdict' && !!(await page.$('.wres[href="51-film-tire.dc.html"]'))
  );

  await open('13-m-roue.dc.html');
  await page.waitForTimeout(5200);
  check('13 wheel stopped', !!(await page.$('.wres[href="14-m-film-tire.dc.html"]')));

  await open('11-m-explorer.dc.html');
  await page.click('.mcd');
  await page.waitForTimeout(300);
  check('11 event card opens 12', page.url().endsWith('12-m-soiree.dc.html'));

  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`${results.length - failed} passed, ${failed} failed`);
  await browser.close();
  if (failed) process.exitCode = 1;
})();
