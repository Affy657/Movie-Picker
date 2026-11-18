import {
  CLASS_IN_COMPOUND_RE,
  CSS_MODULE_IMPORT_RE,
  selectorsOf,
  withoutAttributeSelectors,
} from './cssSyntax.mjs';
import { isTestFile, rel, resolveImport as resolveOnDisk } from './sources.mjs';

/*
 * Dead classes in CSS modules. A class wrongly deleted went to production on 2026-09-09 because
 * a search for `styles.<class>` did not see its usage: the module was re-exported under another
 * name. The rule is therefore calibrated for zero false positives, even if it lets some truly dead
 * classes through, and the four known cases are handled.
 *
 * 1. Aliased import: the local binding name is resolved per file, never assumed to be `styles`.
 * 2. Re-exported styles object: `export { styles as xStyles }` adds `xStyles` to the searched names.
 * 3. Bracket access: `styles[variable]` makes the module unanalysable, so it is excluded and
 *    **listed** in the output, so that the exclusion is a visible choice, not a silent false negative.
 * 4. CSS-only usage: the target of a `composes:` (from the same module or, with `from '...'`, from
 *    another one) or a class inside a `:global(...)` is really used without appearing in
 *    TypeScript. A class in descendant position (`.footer .btn`) is not: it still has to be
 *    rendered, otherwise the rule styles nothing. Attribute selectors are ignored, so the dot in
 *    `a[href$='.pdf']` is not read as a class.
 */
const GLOBAL_SELECTOR_RE = /:global\s*\(([^)]*)\)/g;
const COMPOSES_RE = /composes\s*:\s*([^;}]+)/g;
const COMPOSES_FROM_RE = /composes\s*:\s*([^;}]+?)\s+from\s*['"]([^'"]+)['"]/g;
const GLOBAL_CLASS_ADDED_BY_LIBRARIES = new Set(['lucide']);
const LIBRARY_CLASS_PREFIXES = ['lucide-'];
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

const isModule = (file) => file.endsWith('.module.css');
const addedByLibrary = (name) =>
  GLOBAL_CLASS_ADDED_BY_LIBRARIES.has(name) ||
  LIBRARY_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix));

function classesOfCssModule(text) {
  const leading = new Set();
  const usedInCss = new Set();

  for (const [, inside] of text.matchAll(GLOBAL_SELECTOR_RE))
    for (const [, name] of inside.matchAll(CLASS_IN_COMPOUND_RE)) usedInCss.add(name);

  for (const [, value] of text.matchAll(COMPOSES_RE))
    for (const name of value.trim().split(/\s+/)) if (name !== 'from') usedInCss.add(name);

  const withoutGlobals = text.replace(GLOBAL_SELECTOR_RE, ' ');
  for (const selector of selectorsOf(withoutGlobals).map(withoutAttributeSelectors)) {
    for (const alternative of selector.split(',')) {
      const compounds = alternative
        .trim()
        .split(/[\s>+~]+/)
        .filter(Boolean);
      for (const compound of compounds)
        for (const [, name] of compound.matchAll(CLASS_IN_COMPOUND_RE)) leading.add(name);
    }
  }
  return { leading, usedInCss };
}

function classesComposedFromOtherModules(cssTexts, resolveImport) {
  const composed = new Map();
  for (const [file, text] of cssTexts) {
    if (!isModule(file)) continue;
    for (const [, names, spec] of text.matchAll(COMPOSES_FROM_RE)) {
      const target = resolveImport(spec, file);
      if (!target || target === file) continue;
      if (!composed.has(target)) composed.set(target, new Set());
      for (const name of names.trim().split(/\s+/)) composed.get(target).add(name);
    }
  }
  return composed;
}

function moduleBindings(cssTexts, tsTexts, resolveImport) {
  const modules = new Map();
  for (const file of cssTexts.keys())
    if (isModule(file)) modules.set(file, { bindingsByFile: new Map(), aliases: new Set() });
  for (const [file, source] of tsTexts) {
    for (const [, defaultName, namespaceName, spec] of source.matchAll(CSS_MODULE_IMPORT_RE)) {
      const binding = defaultName || namespaceName;
      const target = resolveImport(spec, file);
      const entry = target && modules.get(target);
      if (!entry) continue;
      entry.bindingsByFile.set(file, binding);
      for (const [, clause] of source.matchAll(/export\s*\{([^}]*)\}/g))
        for (const specifier of clause.split(',')) {
          const [local, exported] = specifier.split(/\s+as\s+/).map((part) => part.trim());
          if (local === binding && exported) entry.aliases.add(exported);
        }
    }
  }
  return modules;
}

function classesReadFromTypeScript(entry, tsTexts) {
  const names = new Set();
  let bracketAccess = false;
  for (const [source, text] of tsTexts) {
    const bindings = new Set();
    const own = entry.bindingsByFile.get(source);
    if (own) bindings.add(own);
    for (const alias of entry.aliases) if (text.includes(alias)) bindings.add(alias);
    for (const binding of bindings) {
      if (new RegExp(`\\b${binding}\\s*\\[`).test(text)) bracketAccess = true;
      for (const [, name] of text.matchAll(new RegExp(`\\b${binding}\\.(\\w+)`, 'g')))
        names.add(name);
    }
  }
  return { names, bracketAccess };
}

export function deadModuleClassViolations(cssTexts, tsTexts, resolveImport = resolveOnDisk) {
  const violations = [];
  const excluded = [];
  const composedFromOutside = classesComposedFromOtherModules(cssTexts, resolveImport);
  for (const [file, entry] of moduleBindings(cssTexts, tsTexts, resolveImport)) {
    const path = rel(file);
    if (entry.bindingsByFile.size === 0) continue;
    const { names, bracketAccess } = classesReadFromTypeScript(entry, tsTexts);
    if (bracketAccess) {
      excluded.push(path);
      continue;
    }
    const { leading, usedInCss } = classesOfCssModule(cssTexts.get(file));
    for (const name of composedFromOutside.get(file) ?? []) usedInCss.add(name);
    for (const name of leading) {
      if (usedInCss.has(name) || names.has(name)) continue;
      const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (names.has(camel)) continue;
      violations.push(`${path}: .${name} is declared and never used, delete the class`);
    }
  }
  return { violations, excluded };
}

function classesOfGlobalSheets(cssTexts) {
  const declared = new Map();
  for (const [file, text] of cssTexts) {
    if (isModule(file)) continue;
    const names = new Set();
    for (const selector of selectorsOf(text))
      for (const [, name] of withoutAttributeSelectors(selector).matchAll(CLASS_IN_COMPOUND_RE))
        names.add(name);
    declared.set(file, names);
  }
  return declared;
}

export function deadGlobalClassViolations(cssTexts, sourceTexts) {
  const found = [];
  const haystack = [...sourceTexts.values()].join('\n');
  for (const [file, declared] of classesOfGlobalSheets(cssTexts))
    for (const name of declared) {
      if (addedByLibrary(name)) continue;
      if (new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(haystack)) continue;
      found.push(`${rel(file)}: .${name} is declared and never used, delete the class`);
    }
  return found;
}

function classNamesInStrings(sources) {
  const names = new Set();
  for (const source of sources)
    for (const [, , content] of source.matchAll(STRING_LITERAL))
      for (const token of content.split(/\$\{[^}]*\}|[\s'"`]+/)) if (token) names.add(token);
  return names;
}

export function globalTargetViolations(cssTexts, sourceTexts) {
  const found = [];
  const declared = new Set(
    [...classesOfGlobalSheets(cssTexts).values()].flatMap((names) => [...names])
  );
  const rendered = classNamesInStrings(
    [...sourceTexts].filter(([file]) => !isTestFile(file)).map(([, text]) => text)
  );
  for (const [file, text] of cssTexts) {
    if (!isModule(file)) continue;
    for (const [, inside] of text.matchAll(GLOBAL_SELECTOR_RE))
      for (const [, name] of withoutAttributeSelectors(inside).matchAll(CLASS_IN_COMPOUND_RE)) {
        if (declared.has(name) || addedByLibrary(name)) continue;
        if (rendered.has(name)) continue;
        found.push(
          `${rel(file)}: :global(.${name}) targets a class that no stylesheet declares and no component renders, the rule is dead`
        );
      }
  }
  return found;
}
