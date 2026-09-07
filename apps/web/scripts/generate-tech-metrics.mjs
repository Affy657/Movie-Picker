import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const outputDir = join(repoRoot, 'apps/web/src/app/pages/tech/generated');
const outputFile = join(outputDir, 'techMetrics.ts');

const SKIPPED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', 'coverage', '.git']);

function walk(dir, matches, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, matches, found);
    else if (matches(entry, full)) found.push(full);
  }
  return found;
}

function listDir(dir) {
  return existsSync(dir) ? readdirSync(dir) : [];
}

function countLines(files) {
  return files.reduce((total, file) => total + readFileSync(file, 'utf8').split('\n').length, 0);
}

function readText(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function countMatches(file, pattern) {
  return (readText(file).match(pattern) ?? []).length;
}

function readPreviousMetrics() {
  if (!existsSync(outputFile)) return {};
  const raw = readFileSync(outputFile, 'utf8');
  const entries = [...raw.matchAll(/^\s{2}(\w+):\s*(\d+),$/gm)];
  return Object.fromEntries(entries.map(([, key, value]) => [key, Number(value)]));
}

function countCommits(previous) {
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    if (shallow === 'true') return previous.commits ?? 0;
    const count = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    return Number(count);
  } catch {
    return previous.commits ?? 0;
  }
}

function roundToThousand(value) {
  return Math.round(value / 1000) * 1000;
}

function extractWheelSnippet() {
  const file = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Domain/WheelWinnerPicker.cs');
  const source = readText(file);
  const opening = '    public static Movie Pick(';
  const closing = '\n    }';
  const start = source.indexOf(opening);
  const end = start === -1 ? -1 : source.indexOf(`${closing}\n`, start);
  if (end === -1) throw new Error('WheelWinnerPicker.Pick introuvable');
  return source
    .slice(start, end + closing.length)
    .split('\n')
    .map((line) => (line.startsWith('    ') ? line.slice(4) : line).trimEnd())
    .join('\n');
}

function toTemplateLiteral(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
}

function computeMetrics(previous) {
  const webSources = walk(join(repoRoot, 'apps/web/src'), (name) => /\.(ts|tsx|css)$/.test(name));
  const apiSources = walk(join(repoRoot, 'apps/api-dotnet'), (name) => name.endsWith('.cs'));

  const webTests = webSources.filter((file) => /\.test\.tsx?$/.test(file));
  const apiTests = apiSources.filter((file) => file.endsWith('Tests.cs'));

  const controllersDir = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Controllers');
  const controllers = walk(controllersDir, (name) => name.endsWith('Controller.cs'));
  const endpoints = controllers.reduce(
    (total, file) => total + countMatches(file, /\[Http(Get|Post|Put|Patch|Delete)/g),
    0
  );

  const portsDir = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Application/Ports');
  const ports = walk(portsDir, (name) => /^I[A-Z].*\.cs$/.test(name));

  const useCasesDir = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Application/UseCases');
  const useCases = walk(useCasesDir, (name) => /Handler\.cs$/.test(name) && !/^I[A-Z]/.test(name));

  const inMemoryDir = join(
    repoRoot,
    'apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/InMemory'
  );
  const doubledRepositories = walk(inMemoryDir, (name) => /Repository\.cs$/.test(name));

  const sharedComponents = listDir(join(repoRoot, 'apps/web/src/shared/components')).filter(
    (name) => name.endsWith('.tsx') && !name.includes('.test.')
  );

  const featuresDir = join(repoRoot, 'apps/web/src/features');
  const features = listDir(featuresDir).filter((name) =>
    statSync(join(featuresDir, name)).isDirectory()
  );

  const e2eScenarios = listDir(join(repoRoot, 'e2e')).filter((name) => name.endsWith('.spec.ts'));

  const a11yViews = countMatches(
    join(repoRoot, 'apps/web/src/app/pages/a11y.test.tsx'),
    /^ +it\(/gm
  );

  const workflow = readText(join(repoRoot, '.github/workflows/ci-cd.yml'));
  const jobsSection = workflow.slice(workflow.search(/^jobs:$/m));
  const ciJobs = (jobsSection.match(/^ {2}[a-z][a-z0-9-]*:$/gm) ?? []).length;

  const architectureScriptLines = countLines(
    [join(repoRoot, 'scripts/check-architecture.mjs')].filter((file) => existsSync(file))
  );

  const vitestConfig = readText(join(repoRoot, 'apps/web/vitest.config.ts'));
  const threshold = (key) => Number(vitestConfig.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1] ?? 0);

  const migrationsDir = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Infrastructure/Migrations');
  const migrations = walk(migrationsDir, (name) => name.endsWith('Migration.cs'));

  return {
    linesOfCode: roundToThousand(countLines(webSources) + countLines(apiSources)),
    endpoints,
    testFiles: webTests.length + apiTests.length,
    webTestFiles: webTests.length,
    apiTestFiles: apiTests.length,
    e2eScenarios: e2eScenarios.length,
    ciJobs,
    commits: countCommits(previous),
    controllers: controllers.length,
    ports: ports.length,
    useCases: useCases.length,
    doubledRepositories: doubledRepositories.length,
    sharedComponents: sharedComponents.length,
    features: features.length,
    a11yViews,
    migrations: migrations.length,
    architectureScriptLines: Math.round(architectureScriptLines / 10) * 10,
    coverageLines: threshold('lines'),
    coverageFunctions: threshold('functions'),
    coverageBranches: threshold('branches'),
  };
}

const previous = readPreviousMetrics();
const measurable = Object.values(previous).length > 0;

let metrics;
let wheelSnippet;
try {
  metrics = computeMetrics(previous);
  wheelSnippet = extractWheelSnippet();
} catch (error) {
  if (!measurable) throw error;
  process.stderr.write(
    `tech metrics: mesure impossible (${error.message}), chiffres precedents conserves\n`
  );
  process.exit(0);
}

if (Object.values(metrics).some((value) => !Number.isFinite(value))) {
  if (!measurable) throw new Error('métrique non numérique et aucun repli disponible');
  process.stderr.write('tech metrics: metrique non numerique, chiffres precedents conserves\n');
  process.exit(0);
}

const buildDate = new Date().toISOString().slice(0, 10);

const body = `// Généré par apps/web/scripts/generate-tech-metrics.mjs — ne pas éditer à la main.

export const TECH_METRICS = {
${Object.entries(metrics)
  .map(([key, value]) => `  ${key}: ${value},`)
  .join('\n')}
} as const;

export const TECH_METRICS_BUILD_DATE = '${buildDate}';

export const TECH_WHEEL_SNIPPET = \`${toTemplateLiteral(wheelSnippet)}\`;
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, body, 'utf8');

process.stdout.write(`tech metrics -> ${outputFile}\n`);
