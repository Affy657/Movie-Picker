const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { chromium } = require('@playwright/test');

function executablePath() {
  const fromEnv = process.env.MOCKUP_CHROMIUM;
  if (fromEnv) return fromEnv;
  const bundled = chromium.executablePath();
  if (fs.existsSync(bundled)) return bundled;
  throw new Error(
    `Chromium for Playwright is missing (${bundled}). Run "pnpm exec playwright install chromium" or set MOCKUP_CHROMIUM to a Chromium executable.`
  );
}

async function launchBrowser() {
  return chromium.launch({
    executablePath: executablePath(),
    args: ['--allow-file-access-from-files'],
  });
}

async function openArtboard(page, dir, file) {
  await page.goto(url.pathToFileURL(path.join(dir, file)).href);
  await page.waitForFunction(() => document.querySelector('#dc-root .S'), null, {
    timeout: 15000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

function isLocalFileError(text) {
  return /Fetch API cannot load file|ERR_FILE_NOT_FOUND|Failed to load resource/.test(text);
}

module.exports = { launchBrowser, openArtboard, isLocalFileError };
