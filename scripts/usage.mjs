/**
 * Prints what Movie Picker is used for over a period of Paris days: the funnel of an event link,
 * from its opening to the arrival of a new account, and how many people rate a film, open a
 * recap, pick at random in a list or sync Letterboxd.
 *
 * Two sources, read together from the database:
 *   - the anonymous daily totals of `usage_counts`, written by the API (`UsageCount`) with no
 *     cookie and no identifier, so they also see the visitor who never answered the consent
 *     banner, the one PostHog cannot see. They start with the release that brings them;
 *   - the records themselves (accounts, participations, ratings, watchlist, Letterboxd), the only
 *     way to count people rather than actions.
 * PostHog keeps the paths and the properties of the visitors who accepted the measure, in its
 * "Ce qui sert" dashboard.
 *
 * Usage: `pnpm run usage [-- --days 30 | --since 2026-11-01] [--db moviepicker] [--json]`.
 * The URI comes from `MONGODB_URI`, or else from the `MONGODB_URI` secret through gcloud (the
 * project of `GCP_PROJECT_ID`, or the active gcloud project). The queries run in the MongoDB
 * image pinned by `scripts/mongo-replica-set.mjs`, through Docker: no driver to install.
 * Read-only. The report itself is pure and tested by `scripts/usage.test.mjs`.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MONGO_IMAGE } from './mongo-replica-set.mjs';

const DEFAULT_DAYS = 30;
const DEFAULT_DATABASE = 'moviepicker';
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(day, days) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date) + days * DAY_MS).toISOString().slice(0, 10);
}

function isCalendarDay(value) {
  return DAY_PATTERN.test(value) && addDays(value, 0) === value;
}

export function parseUsageArgs(argv, today) {
  const options = {
    since: addDays(today, 1 - DEFAULT_DAYS),
    until: today,
    database: DEFAULT_DATABASE,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--') continue;
    if (argument === '--json') {
      options.json = true;
    } else if (argument === '--days') {
      const days = Number(value);
      if (!Number.isInteger(days) || days < 1)
        throw new Error(`--days expects a whole number of days, got "${value}"`);
      options.since = addDays(today, 1 - days);
      index += 1;
    } else if (argument === '--since') {
      if (!value || !isCalendarDay(value) || value > today) {
        throw new Error(`--since expects a past day as YYYY-MM-DD, got "${value}"`);
      }
      options.since = value;
      index += 1;
    } else if (argument === '--db') {
      if (!value) throw new Error('--db expects a database name');
      options.database = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument ${argument}: use --days, --since, --db or --json`);
    }
  }
  return options;
}

function parisOffsetMinutes(instant) {
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(instant))
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(zone ?? '');
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

function parisMidnight(day) {
  const [year, month, date] = day.split('-').map(Number);
  const utcMidnight = Date.UTC(year, month - 1, date);
  return new Date(utcMidnight - parisOffsetMinutes(utcMidnight) * 60 * 1000);
}

export function parisDayBounds(since, until) {
  return {
    from: parisMidnight(since).toISOString(),
    to: parisMidnight(addDays(until, 1)).toISOString(),
  };
}

export function sumCounts(rows) {
  const totals = new Map();
  for (const { metric, variant, count } of rows) {
    const variants = totals.get(metric) ?? new Map();
    variants.set(variant, (variants.get(variant) ?? 0) + Number(count));
    totals.set(metric, variants);
  }
  const matching = (metric, keep) =>
    [...(totals.get(metric) ?? new Map()).entries()]
      .filter(([variant]) => keep(variant))
      .reduce((sum, [, count]) => sum + count, 0);
  return {
    matching,
    get: (metric, variant) =>
      matching(metric, (candidate) => variant === undefined || candidate === variant),
  };
}

function shareOf(value, previous) {
  return previous > 0 ? value / previous : null;
}

export function buildUsageReport({ since, until, counts, truth }) {
  const totals = sumCounts(counts);
  const fromEvent = (variant) => variant.endsWith('.event');
  const steps = [
    [
      'opened_by_visitor',
      'browser',
      'Event link opened by a visitor',
      totals.matching('event_link_opened', (v) => v.startsWith('visitor.')),
    ],
    [
      'opened_by_visitor_joinable',
      'browser',
      'Opened while the event could be joined',
      totals.get('event_link_opened', 'visitor.open'),
    ],
    [
      'prompt_register',
      'browser',
      'Sign-up chosen on the join prompt',
      totals.get('join_prompt_clicked', 'register'),
    ],
    [
      'signed_up_from_event',
      'server',
      'Account created from an event link',
      totals.matching('user_signed_up', fromEvent),
    ],
    [
      'joined_new_account',
      'server',
      'Joined by an account under 24 hours old',
      totals.get('event_joined', 'new_account'),
    ],
  ];
  const funnel = steps.map(([key, source, label, value], index) => {
    const previous = steps[index - 1];
    return {
      key,
      source,
      label,
      value,
      shareOfPrevious: previous?.[1] === source ? shareOf(value, previous[3]) : null,
    };
  });

  return {
    since,
    until,
    hasCounts: counts.length > 0,
    funnel,
    sideDoors: {
      openedByAccount: totals.matching('event_link_opened', (v) => v.startsWith('account.')),
      openedFull: totals.matching('event_link_opened', (v) => v.endsWith('.full')),
      openedClosed: totals.matching('event_link_opened', (v) => v.endsWith('.closed')),
      promptLogin: totals.get('join_prompt_clicked', 'login'),
      loggedInFromEvent: totals.matching('user_logged_in', fromEvent),
      joinedExistingAccount: totals.get('event_joined', 'existing_account'),
    },
    features: {
      signUps: {
        total: totals.get('user_signed_up'),
        fromEvent: totals.matching('user_signed_up', fromEvent),
        byMethod: Object.fromEntries(
          ['email', 'google', 'github'].map((method) => [
            method,
            totals.matching('user_signed_up', (v) => v.startsWith(`${method}.`)),
          ])
        ),
        inDatabase: truth.accountsCreated,
      },
      ratings: { ratings: truth.ratings, people: truth.raters },
      recaps: {
        visitor: totals.get('recap_viewed', 'visitor'),
        account: totals.get('recap_viewed', 'account'),
      },
      randomPicks: Object.fromEntries(
        ['watchlist', 'list', 'saved_list', 'catalog'].map((source) => [
          source,
          totals.get('random_pick_opened', source),
        ])
      ),
      watchlist: {
        adds: truth.watchlistAdds,
        people: truth.watchlistPeople,
        imports: truth.watchlistImports,
      },
      letterboxd: {
        connectedAccounts: truth.letterboxdConnected,
        syncedPeople: truth.letterboxdSyncedPeople,
        syncs: {
          manual: totals.get('letterboxd_synced', 'manual'),
          auto: totals.get('letterboxd_synced', 'auto'),
        },
        connections: totals.get('letterboxd_linked', 'connected'),
        disconnections: totals.get('letterboxd_linked', 'disconnected'),
        choicesConfirmed: totals.get('letterboxd_choices_confirmed'),
      },
      events: {
        created: truth.eventsCreated,
        arrivals: truth.arrivals,
        arrivingPeople: truth.arrivingPeople,
      },
    },
  };
}

const LABEL_WIDTH = 44;

function row(label, value, share) {
  const shareText = share === null || share === undefined ? '' : `  ${(share * 100).toFixed(1)}%`;
  return `  ${label.padEnd(LABEL_WIDTH)}${String(value).padStart(6)}${shareText}`;
}

function line(label, text) {
  return `  ${label.padEnd(LABEL_WIDTH)}${text}`;
}

export function formatUsageReport(report) {
  const { sideDoors, features } = report;
  const { signUps, letterboxd, randomPicks, recaps } = features;
  const lines = [
    `Usage from ${report.since} to ${report.until} (Paris days)`,
    '',
    'Event link funnel (anonymous daily counts)',
  ];
  if (!report.hasCounts) {
    lines.push(
      '  No anonymous count recorded over this period: the counters start with the release that brings them.'
    );
  }
  const sourceTitles = {
    browser: '  Reported by the browser, unless measurement was refused',
    server: '  Recorded by the server for everyone',
  };
  report.funnel.forEach((step, index) => {
    if (report.funnel[index - 1]?.source !== step.source) lines.push(sourceTitles[step.source]);
    lines.push(row(step.label, step.value, step.shareOfPrevious));
  });
  lines.push(
    '',
    'Other ways in',
    row('Event link opened by a signed-in account', sideDoors.openedByAccount),
    row('Event full when opened', sideDoors.openedFull),
    row('Event over when opened', sideDoors.openedClosed),
    row('Sign-in chosen on the join prompt', sideDoors.promptLogin),
    row('Signed in from an event link', sideDoors.loggedInFromEvent),
    row('Joined by an older account', sideDoors.joinedExistingAccount),
    '',
    'What gets used',
    line(
      'Accounts created',
      `${signUps.total} counted (${signUps.fromEvent} from an event link; email ${signUps.byMethod.email}, Google ${signUps.byMethod.google}, GitHub ${signUps.byMethod.github}), ${signUps.inDatabase} in the database`
    ),
    line('Ratings', `${features.ratings.ratings} by ${features.ratings.people} people`),
    line(
      'Recaps opened',
      `${recaps.visitor + recaps.account} (${recaps.visitor} by visitors, ${recaps.account} by accounts)`
    ),
    line(
      'Random picks',
      `${randomPicks.watchlist + randomPicks.list + randomPicks.saved_list + randomPicks.catalog} (watchlist ${randomPicks.watchlist}, list ${randomPicks.list}, saved list ${randomPicks.saved_list}, saga or selection ${randomPicks.catalog})`
    ),
    line(
      'Watchlist additions',
      `${features.watchlist.adds} by ${features.watchlist.people} people, plus ${features.watchlist.imports} linked to Letterboxd`
    ),
    line(
      'Letterboxd accounts',
      `${letterboxd.connectedAccounts} connected now, ${letterboxd.syncedPeople} synced over the period`
    ),
    line(
      'Letterboxd syncs',
      `${letterboxd.syncs.manual + letterboxd.syncs.auto} (${letterboxd.syncs.manual} manual, ${letterboxd.syncs.auto} automatic)`
    ),
    line(
      'Letterboxd links',
      `${letterboxd.connections} connected, ${letterboxd.disconnections} disconnected, ${letterboxd.choicesConfirmed} choice screens confirmed`
    ),
    line(
      'Events',
      `${features.events.created} created, ${features.events.arrivals} arrivals of guests by ${features.events.arrivingPeople} people`
    )
  );
  return lines.join('\n');
}

const MONGOSH_QUERY = `
const db = new Mongo(process.env.MONGODB_URI).getDB(process.env.USAGE_DB);
const inPeriod = { $gte: new Date(process.env.USAGE_FROM), $lt: new Date(process.env.USAGE_TO) };
const first = (rows, fallback) => rows[0] || fallback;
const counts = db.usage_counts.aggregate([
  { $match: { day: { $gte: process.env.USAGE_SINCE, $lte: process.env.USAGE_UNTIL } } },
  { $project: { _id: 0, metric: 1, variant: 1, count: { $toDouble: '$count' } } }
]).toArray();
const raters = first(db.movie_ratings.aggregate([
  { $match: { createdAt: inPeriod } },
  { $lookup: { from: 'participants', localField: 'participantId', foreignField: '_id', as: 'participant' } },
  { $unwind: '$participant' },
  { $group: { _id: '$participant.userId' } },
  { $count: 'people' }
]).toArray(), { people: 0 }).people;
const guests = first(db.participants.aggregate([
  { $match: { createdAt: inPeriod } },
  { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
  { $unwind: '$event' },
  { $match: { $expr: { $ne: ['$userId', '$event.creatorUserId'] } } },
  { $group: { _id: null, arrivals: { $sum: 1 }, people: { $addToSet: '$userId' } } },
  { $project: { _id: 0, arrivals: 1, people: { $size: '$people' } } }
]).toArray(), { arrivals: 0, people: 0 });
const addedByHand = { createdAt: inPeriod, letterboxdSlug: { $in: [null, ''] } };
const watchlistPeople = first(db.watchlist.aggregate([
  { $match: addedByHand },
  { $group: { _id: '$userId' } },
  { $count: 'people' }
]).toArray(), { people: 0 }).people;
print(JSON.stringify({
  counts,
  truth: {
    accountsCreated: db.users.countDocuments({ createdAt: inPeriod }),
    eventsCreated: db.events.countDocuments({ createdAt: inPeriod }),
    arrivals: guests.arrivals,
    arrivingPeople: guests.people,
    ratings: db.movie_ratings.countDocuments({ createdAt: inPeriod }),
    raters,
    watchlistAdds: db.watchlist.countDocuments(addedByHand),
    watchlistPeople,
    watchlistImports: db.watchlist.countDocuments({ createdAt: inPeriod, letterboxdSlug: { $nin: [null, ''] } }),
    letterboxdConnected: db.users.countDocuments({ letterboxdUsername: { $nin: [null, ''] } }),
    letterboxdSyncedPeople: db.users.countDocuments({ letterboxdLastSyncAt: inPeriod })
  }
}));
`;

function todayInParis() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

const GCP_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export function gcloudSecretCommand(project) {
  const command = 'gcloud secrets versions access latest --secret=MONGODB_URI';
  if (!project) return command;
  if (!GCP_PROJECT_ID_PATTERN.test(project)) {
    throw new Error(`GCP_PROJECT_ID is not a Google Cloud project id: ${JSON.stringify(project)}`);
  }
  return `${command} --project=${project}`;
}

function mongoUri() {
  const fromEnvironment = process.env.MONGODB_URI?.trim();
  if (fromEnvironment) return fromEnvironment;
  const result = spawnSync(gcloudSecretCommand(process.env.GCP_PROJECT_ID), {
    encoding: 'utf8',
    shell: true,
  });
  const uri = result.stdout?.trim();
  if (result.status !== 0 || !uri) {
    throw new Error(
      'No MongoDB URI: set MONGODB_URI, or sign in with gcloud on the project that holds the MONGODB_URI secret.'
    );
  }
  return uri;
}

function readUsage({ since, until, database }) {
  const { from, to } = parisDayBounds(since, until);
  const env = {
    ...process.env,
    MONGODB_URI: mongoUri(),
    USAGE_DB: database,
    USAGE_FROM: from,
    USAGE_TO: to,
    USAGE_SINCE: since,
    USAGE_UNTIL: until,
  };
  const passed = [
    'MONGODB_URI',
    'USAGE_DB',
    'USAGE_FROM',
    'USAGE_TO',
    'USAGE_SINCE',
    'USAGE_UNTIL',
  ].flatMap((name) => ['-e', name]);
  const result = spawnSync(
    process.platform === 'win32' ? 'docker.exe' : 'docker',
    [
      'run',
      '--rm',
      '-e',
      'HOME=/tmp',
      ...passed,
      MONGO_IMAGE,
      'mongosh',
      '--nodb',
      '--quiet',
      '--eval',
      MONGOSH_QUERY,
    ],
    { encoding: 'utf8', env, maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `The usage query failed (is Docker running?): ${(result.stderr || result.stdout).trim()}`
    );
  }
  const lastLine = result.stdout.trim().split(/\r?\n/).pop();
  return JSON.parse(lastLine);
}

function main() {
  try {
    const options = parseUsageArgs(process.argv.slice(2), todayInParis());
    const report = buildUsageReport({
      since: options.since,
      until: options.until,
      ...readUsage(options),
    });
    console.log(options.json ? JSON.stringify(report, null, 2) : formatUsageReport(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
