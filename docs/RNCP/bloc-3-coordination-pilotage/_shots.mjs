import { chromium } from 'playwright-chromium';
const pages = process.argv.slice(2).map(Number);
const out = 'C:/Users/adrie/AppData/Local/Temp/claude/C--ynov-movie-picker/4bb6a6de-62ed-49c9-a4c2-5dddc659fd5d/scratchpad/shots';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (const n of pages) {
  await p.goto(`http://localhost:3031/${n}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/d${n}.png` });
}
await b.close();
