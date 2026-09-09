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

function countIn(files, pattern) {
  return files.reduce((total, file) => total + countMatches(file, pattern), 0);
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

function countMonthsSinceFirstCommit(previous) {
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    if (shallow === 'true') return previous.monthsActive ?? 0;
    const rootCommitDates = execFileSync(
      'git',
      ['log', '--max-parents=0', '--reverse', '--format=%ad', '--date=short'],
      { cwd: repoRoot, encoding: 'utf8' }
    )
      .trim()
      .split('\n');
    const [firstDate] = rootCommitDates;
    if (!firstDate) return previous.monthsActive ?? 0;
    const [year, month, day] = firstDate.split('-').map(Number);
    const today = new Date();
    const elapsed = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
    return today.getDate() < day ? elapsed - 1 : elapsed;
  } catch {
    return previous.monthsActive ?? 0;
  }
}

function roundToThousand(value) {
  return Math.round(value / 1000) * 1000;
}

function computeMetrics(previous) {
  const webSources = walk(join(repoRoot, 'apps/web/src'), (name) => /\.(ts|tsx|css)$/.test(name));
  const apiSources = walk(join(repoRoot, 'apps/api-dotnet'), (name) => name.endsWith('.cs'));

  const webTests = webSources.filter((file) => /\.test\.tsx?$/.test(file));
  const apiTests = apiSources.filter((file) => file.endsWith('Tests.cs'));

  const xunitCases = (files) =>
    countIn(files, /^\s*\[Fact[\]( ]/gm) + countIn(files, /^\s*\[InlineData/gm);
  const apiUnitTests = apiTests.filter((file) => file.includes('MoviePicker.Api.Tests'));
  const apiIntegrationTests = apiTests.filter((file) =>
    file.includes('MoviePicker.Api.IntegrationTests')
  );

  const webTestCases = countIn(webTests, /^\s*(?:it|test)(?:\.\w+)?\(/gm);
  const mswTestFiles = webTests.filter((file) => readText(file).includes('msw')).length;
  const apiUnitTestCases = xunitCases(apiUnitTests);
  const integrationTestCases = xunitCases(apiIntegrationTests);
  const apiTestCases = apiUnitTestCases + integrationTestCases;
  const unitTestCases = webTestCases + apiUnitTestCases;
  const e2eTestCases = countIn(
    walk(join(repoRoot, 'e2e'), (name) => name.endsWith('.spec.ts')),
    /^\s*test(?:\.\w+)?\(/gm
  );

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
  const secretsLine = workflow.match(/SECRETS="[^"]+"/)?.[0] ?? '';
  const deploySecrets = (secretsLine.match(/:latest/g) ?? []).length;
  const ciJobs = (jobsSection.match(/^ {2}[a-z][a-z0-9-]*:$/gm) ?? []).length;
  const apiCoverageLines = Number(
    workflow.match(/Gate couverture back \(lignes >= (\d+)%/)?.[1] ?? 0
  );
  const mongoCoverageLines = Number(
    readText(join(repoRoot, 'scripts/check-mongo-coverage.mjs')).match(
      /MONGO_COVERAGE_MIN_SEQUENCE \?\? (\d+)/
    )?.[1] ?? 0
  );

  const architectureScriptLines = countLines(
    [join(repoRoot, 'scripts/check-architecture.mjs')].filter((file) => existsSync(file))
  );

  const vitestConfig = readText(join(repoRoot, 'apps/web/vitest.config.ts'));
  const threshold = (key) => Number(vitestConfig.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1] ?? 0);

  const agentsDoc = readText(join(repoRoot, 'AGENTS.md'));
  const toolsTable = agentsDoc.slice(agentsDoc.indexOf('| Outil | Accès | Usage |'));
  const assistantTools = toolsTable
    .split('\n')
    .slice(2)
    .findIndex((line) => !line.startsWith('|'));

  const rateLimitPolicies = countMatches(
    join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/RateLimitingExtensions.cs'),
    /^\s+new\([A-Za-z]+Policy,/gm
  );

  const migrationsDir = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Infrastructure/Migrations');
  const migrations = walk(migrationsDir, (name) => name.endsWith('Migration.cs'));

  const infrastructureDir = join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Infrastructure');
  const collections = new Set();
  for (const file of walk(infrastructureDir, (name) => name.endsWith('.cs'))) {
    const source = readText(file);
    for (const match of source.matchAll(/GetCollection<\w+>\("([a-z_]+)"\)/g)) {
      collections.add(match[1]);
    }
    for (const match of source.matchAll(/const string CollectionName = "([a-z_]+)"/g)) {
      collections.add(match[1]);
    }
  }

  const indexInitializer = readText(
    join(infrastructureDir, 'Persistence/Mongo/MongoIndexInitializer.cs')
  );
  const mongoIndexes = (indexInitializer.match(/new CreateIndexModel</g) ?? []).length;
  const ttlIndexes = (indexInitializer.match(/ExpireAfter =/g) ?? []).length;
  const uniqueIndexes = (indexInitializer.match(/Unique = true/g) ?? []).length;
  const inventoriedIndexes = countMatches(
    join(repoRoot, 'apps/api-dotnet/MoviePicker.Api.IntegrationTests/MongoIndexInventoryTests.cs'),
    /new\("/g
  );

  const posterCacheTtlDays = Number(
    readText(
      join(repoRoot, 'apps/api-dotnet/MoviePicker.Api/Configuration/MoviePickerOptions.cs')
    ).match(/PosterCacheTtlDays \{ get; set; \} = (\d+)/)?.[1] ?? 0
  );

  const budgets = JSON.parse(readText(join(repoRoot, 'configs/lighthouse-budgets.json')));
  const lighthousePages = (
    readText(join(repoRoot, 'scripts/lighthouse-run.mjs')).match(/^\s*\{ path: '/gm) ?? []
  ).length;
  const lighthouseWatchlistPerformance = budgets.perPageMinimumScores.watchlist.performance;

  const webPackage = JSON.parse(readText(join(repoRoot, 'apps/web/package.json')));
  const dependencyMajor = (name) => {
    const range = webPackage.dependencies?.[name] ?? webPackage.devDependencies?.[name] ?? '';
    return Number(range.replace(/^[^\d]*/, '').split('.')[0]);
  };
  const reactMajor = dependencyMajor('react');
  const typescriptMajor = dependencyMajor('typescript');
  const viteMajor = dependencyMajor('vite');
  const routerMajor = dependencyMajor('react-router');
  const queryMajor = dependencyMajor('@tanstack/react-query');

  const lazyRoutes = countMatches(join(repoRoot, 'apps/web/src/app/App.tsx'), /lazy\(/g);

  const contractResponses = countMatches(
    join(repoRoot, 'apps/web/src/shared/api/generated/openapiSchema.ts'),
    /^ {8}[A-Za-z0-9]+Response\??: /gm
  );
  const contractCheckedTypes = countMatches(
    join(repoRoot, 'apps/web/src/shared/api/apiContract.test.ts'),
    /^\s+ServedBy</gm
  );
  const contractRoutesChecked = countMatches(
    join(repoRoot, 'apps/web/src/shared/api/apiContract.test.ts'),
    /^ {2}'\/api\/v1\//gm
  );

  const measured = {
    collections: collections.size,
    mongoIndexes,
    ttlIndexes,
    lighthousePages,
    uniqueIndexes,
    posterCacheTtlDays,
    reactMajor,
    typescriptMajor,
    viteMajor,
    routerMajor,
    queryMajor,
    lazyRoutes,
    contractResponses,
    contractCheckedTypes,
    contractRoutesChecked,
    mswTestFiles,
    deploySecrets,
    lighthouseWatchlistPerformance,
    rateLimitPolicies,
    assistantTools,
    apiCoverageLines,
    mongoCoverageLines,
    inventoriedIndexes,
  };
  for (const [name, value] of Object.entries(measured)) {
    if (value === 0) throw new Error(`mesure vide : ${name}`);
  }

  return {
    linesOfCode: roundToThousand(countLines(webSources) + countLines(apiSources)),
    endpoints,
    testFiles: webTests.length + apiTests.length,
    webTestFiles: webTests.length,
    apiTestFiles: apiTests.length,
    testCases: webTestCases + apiTestCases,
    webTestCases,
    apiTestCases,
    unitTestCases,
    apiUnitTestCases,
    integrationTestCases,
    e2eTestCases,
    e2eScenarios: e2eScenarios.length,
    ciJobs,
    commits: countCommits(previous),
    monthsActive: countMonthsSinceFirstCommit(previous),
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
    mongoCollections: collections.size,
    mongoIndexes,
    ttlIndexes,
    uniqueIndexes,
    posterCacheTtlDays,
    lighthousePages,
    lighthousePerformance: budgets.minimumScores.performance,
    lighthouseAccessibility: budgets.minimumScores.accessibility,
    lighthouseBestPractices: budgets.minimumScores['best-practices'],
    lighthouseSeo: budgets.minimumScores.seo,
    reactMajor,
    typescriptMajor,
    viteMajor,
    routerMajor,
    queryMajor,
    lazyRoutes,
    contractResponses,
    contractCheckedTypes,
    contractRoutesChecked,
    mswTestFiles,
    deploySecrets,
    lighthouseWatchlistPerformance,
    rateLimitPolicies,
    assistantTools,
    apiCoverageLines,
    mongoCoverageLines,
    inventoriedIndexes,
  };
}

const previous = readPreviousMetrics();
const measurable = Object.values(previous).length > 0;

let metrics;
try {
  metrics = computeMetrics(previous);
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
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, body, 'utf8');

process.stdout.write(`tech metrics -> ${outputFile}\n`);
