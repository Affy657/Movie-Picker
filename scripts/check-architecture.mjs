#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAYER_RULES, apiLayerViolations } from './architecture/apiLayers.mjs';
import {
  FRONT_ROUTES_CS,
  GENERIC_API_ERRORS_CS,
  frontPathViolations,
  genericErrorMessageViolations,
} from './architecture/apiSingleSource.mjs';
import { APPLICATION_DIR, writeSeqViolations } from './architecture/apiWriteSeq.mjs';
import { commentViolations } from './architecture/comments.mjs';
import {
  backdropTokenViolations,
  browserSupportViolations,
  jsApiViolations,
  readSafariFloor,
} from './architecture/browserSupport.mjs';
import { FOUNDATION } from './architecture/cssSyntax.mjs';
import { designTokenViolations } from './architecture/cssValues.mjs';
import {
  deadGlobalClassViolations,
  deadModuleClassViolations,
  globalTargetViolations,
} from './architecture/deadCss.mjs';
import {
  appLayerViolations,
  featureLayerViolations,
  importCycleViolations,
  sharedLeafViolations,
} from './architecture/frontImports.mjs';
import {
  ariaRoleViolations,
  backdropViolations,
  buttonClassViolations,
  modalViolations,
  tapTargetViolations,
} from './architecture/primitives.mjs';
import { isTestFile, readTexts, rel, root, walk, webSrc } from './architecture/sources.mjs';
import { undeclaredTokenViolations } from './architecture/tokenDeclarations.mjs';
import {
  AVATAR_TSX,
  ICON_SIZE_TS,
  avatarScaleViolations,
  iconScaleViolations,
  inlineStyleViolations,
} from './architecture/tsTokens.mjs';

const API_PROJECT = 'apps/api-dotnet/MoviePicker.Api/';

function only(texts, ...extensions) {
  return new Map([...texts].filter(([file]) => extensions.some((ext) => file.endsWith(ext))));
}

function underDirectory(texts, directory) {
  return new Map([...texts].filter(([file]) => rel(file).startsWith(directory)));
}

function loadSources() {
  const web = readTexts(walk(webSrc, ['.ts', '.tsx', '.css']));
  const indexHtmlPath = join(root, 'apps/web/index.html');
  const indexHtml = readFileSync(indexHtmlPath, 'utf8');
  const scripts = only(web, '.ts', '.tsx');
  return {
    web,
    scripts,
    components: only(web, '.tsx'),
    sheets: only(web, '.css'),
    indexHtml,
    markup: new Map([...scripts, [indexHtmlPath, indexHtml]]),
    api: readTexts(walk(join(root, 'apps/api-dotnet'), ['.cs'])),
    e2e: readTexts(walk(join(root, 'e2e'), ['.ts'])),
  };
}

function collectViolations(sources) {
  const { web, scripts, components, sheets, indexHtml, markup, api, e2e } = sources;
  const foundation = sheets.get(join(root, FOUNDATION)) ?? '';
  const violations = [];
  const eachFile = (texts, rule) => {
    for (const [file, text] of texts) violations.push(...rule(file, text));
  };
  const eachPath = (texts, rule) => eachFile(texts, (file, text) => rule(rel(file), text));

  for (const texts of [web, api, e2e]) eachPath(texts, commentViolations);
  eachFile(scripts, sharedLeafViolations);
  eachFile(scripts, featureLayerViolations);
  eachFile(scripts, appLayerViolations);
  violations.push(...importCycleViolations(scripts));
  const floor = readSafariFloor(root);
  eachPath(sheets, (path, text) => [
    ...designTokenViolations(path, text),
    ...backdropViolations(path, text),
    ...browserSupportViolations(path, text, floor),
  ]);
  eachPath(scripts, (path, text) => (isTestFile(path) ? [] : jsApiViolations(path, text, floor)));
  violations.push(
    ...backdropTokenViolations(
      new Map([...sheets].map(([file, text]) => [rel(file), text])),
      foundation
    )
  );
  violations.push(...undeclaredTokenViolations(sheets, scripts, indexHtml));
  eachPath(components, modalViolations);
  eachPath(components, ariaRoleViolations);
  eachPath(components, buttonClassViolations);
  violations.push(...tapTargetViolations(sheets, components, foundation));
  eachPath(scripts, inlineStyleViolations);
  violations.push(...iconScaleViolations(foundation, web.get(join(root, ICON_SIZE_TS)) ?? ''));
  violations.push(...avatarScaleViolations(foundation, web.get(join(root, AVATAR_TSX)) ?? ''));
  violations.push(...globalTargetViolations(sheets, markup));
  const deadClasses = deadModuleClassViolations(sheets, scripts);
  violations.push(...deadClasses.violations);
  violations.push(...deadGlobalClassViolations(sheets, markup));
  for (const { layer } of LAYER_RULES)
    eachPath(underDirectory(api, `${API_PROJECT}${layer}/`), (path, text) =>
      apiLayerViolations(layer, path, text)
    );
  const application = underDirectory(api, APPLICATION_DIR);
  violations.push(
    ...writeSeqViolations(new Map([...application].map(([file, text]) => [rel(file), text])))
  );
  const apiSources = new Map(
    [...underDirectory(api, API_PROJECT)].map(([file, text]) => [rel(file), text])
  );
  violations.push(...frontPathViolations(apiSources, apiSources.get(FRONT_ROUTES_CS) ?? ''));
  violations.push(
    ...genericErrorMessageViolations(apiSources, apiSources.get(GENERIC_API_ERRORS_CS) ?? '')
  );
  return { violations, cssModulesExcluded: deadClasses.excluded };
}

function main() {
  const { violations, cssModulesExcluded } = collectViolations(loadSources());
  if (violations.length > 0) {
    console.error(`\n${violations.length} architecture rule violation(s):\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error(
      '\nRules: AGENTS.md (style) and hexagonal architecture (Domain < Application < Infrastructure).\n'
    );
    process.exit(1);
  }
  console.log(
    'Architecture: no violation (comments, API layers, writeSeq of the event view, front paths and generic error messages written once, shared/ as a leaf, feature layers, app/ above features and shared, import cycles through import() included, design system tokens, CSS and browser APIs the oldest supported Safari knows, tokens read by ::backdrop, colours in TypeScript, hover and reduced motion, icon, avatar and size scales, Modal, Button and ARIA primitives, tap targets, dead CSS classes, :global targets and tokens).'
  );
  if (cssModulesExcluded.length > 0)
    console.log(
      `Dead classes: ${cssModulesExcluded.length} module(s) excluded, bracket access makes them unanalysable: ${cssModulesExcluded.join(', ')}`
    );
}

main();
