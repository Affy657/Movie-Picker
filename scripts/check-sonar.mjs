const HOST = 'https://sonarcloud.io';
const PROJECT = 'Affy657_Movie-Picker';
const COVERAGE_FLOOR = 90.7;
const BRANCH_RATINGS = [
  'reliability_rating',
  'security_rating',
  'sqale_rating',
  'security_review_rating',
];
const NEW_CODE_RATINGS = [
  'new_reliability_rating',
  'new_security_rating',
  'new_maintainability_rating',
  'new_security_review_rating',
];

function readScope(argv) {
  const scope = {
    branch: process.env.SONAR_BRANCH || 'master',
    pullRequest: process.env.SONAR_PULL_REQUEST || '',
  };
  argv.forEach((arg, index) => {
    if (arg === '--branch') scope.branch = argv[index + 1];
    if (arg === '--pull-request') scope.pullRequest = argv[index + 1];
  });
  return scope.pullRequest ? { pullRequest: scope.pullRequest } : { branch: scope.branch };
}

const scope = readScope(process.argv.slice(2));
const headers = process.env.SONAR_TOKEN
  ? { Authorization: `Basic ${Buffer.from(`${process.env.SONAR_TOKEN}:`).toString('base64')}` }
  : {};
const annotate = process.env.GITHUB_ACTIONS === 'true';
const failures = [];

async function get(path, params) {
  const url = `${HOST}${path}?${new URLSearchParams(params)}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${path} answered HTTP ${response.status}`);
  return response.json();
}

function fileOf(component) {
  return component.replace(`${PROJECT}:`, '');
}

function fail(message, location) {
  failures.push(message);
  if (annotate && location) {
    console.log(`::error file=${location.file},line=${location.line ?? 1}::${message}`);
  } else if (annotate) {
    console.log(`::error::${message}`);
  } else {
    console.log(`FAIL ${location ? `${location.file}:${location.line ?? 1} ` : ''}${message}`);
  }
}

function reportIssues(issues, total, kind) {
  for (const issue of issues) {
    fail(`${kind} ${issue.rule}: ${issue.message}`, {
      file: fileOf(issue.component),
      line: issue.line,
    });
  }
  if (total > issues.length) fail(`${total - issues.length} more ${kind}(s) not listed`);
}

function valueOf(measure) {
  const raw = measure.value ?? measure.period?.value ?? measure.periods?.[0]?.value;
  return raw === undefined ? undefined : Number.parseFloat(raw);
}

async function checkIssues() {
  const open = await get('/api/issues/search', {
    componentKeys: PROJECT,
    ...scope,
    resolved: 'false',
    ps: '100',
  });
  reportIssues(open.issues, open.paging.total, 'open issue');

  const dismissed = await get('/api/issues/search', {
    componentKeys: PROJECT,
    ...scope,
    statuses: 'RESOLVED',
    resolutions: 'WONTFIX,FALSE-POSITIVE',
    ps: '100',
  });
  reportIssues(
    dismissed.issues,
    dismissed.paging.total,
    'issue accepted or dismissed in SonarCloud'
  );

  const hotspots = await get('/api/hotspots/search', {
    projectKey: PROJECT,
    ...scope,
    status: 'TO_REVIEW',
    ps: '100',
  });
  for (const hotspot of hotspots.hotspots) {
    fail(`security hotspot to review: ${hotspot.message}`, {
      file: fileOf(hotspot.component),
      line: hotspot.line,
    });
  }
  return {
    open: open.paging.total,
    dismissed: dismissed.paging.total,
    hotspots: hotspots.paging.total,
  };
}

async function checkMeasures() {
  const ratings = scope.pullRequest ? NEW_CODE_RATINGS : BRANCH_RATINGS;
  const duplication = scope.pullRequest
    ? 'new_duplicated_lines_density'
    : 'duplicated_lines_density';
  const metricKeys = [...ratings, duplication, 'coverage'];
  const { component } = await get('/api/measures/component', {
    component: PROJECT,
    ...scope,
    metricKeys: metricKeys.join(','),
  });
  const measures = new Map(component.measures.map((m) => [m.metric, valueOf(m)]));

  for (const rating of ratings) {
    const value = measures.get(rating);
    if (value !== undefined && value !== 1) fail(`${rating} is ${value}, only A (1.0) is accepted`);
  }
  const duplicated = measures.get(duplication);
  if (duplicated !== undefined && duplicated > 0) {
    fail(`${duplication} is ${duplicated} %, duplication must stay at 0 %`);
  }
  const coverage = measures.get('coverage');
  if (!scope.pullRequest && (coverage === undefined || coverage < COVERAGE_FLOOR)) {
    fail(
      `coverage is ${coverage} %, below the floor of ${COVERAGE_FLOOR} % set in scripts/check-sonar.mjs`
    );
  }
  return { duplicated, coverage };
}

const where = scope.pullRequest ? `pull request #${scope.pullRequest}` : `branch ${scope.branch}`;
const counts = await checkIssues();
const measures = await checkMeasures();
console.log(
  `SonarCloud ${where}: ${counts.open} open issue(s), ${counts.dismissed} accepted or dismissed, ` +
    `${counts.hotspots} hotspot(s) to review, duplication ${measures.duplicated ?? 0} %, ` +
    `coverage ${measures.coverage ?? 'n/a'} % (floor ${COVERAGE_FLOOR} %)`
);
if (failures.length > 0) {
  console.log(`${failures.length} failing check(s): master stays at zero issues and A everywhere.`);
  process.exitCode = 1;
}
