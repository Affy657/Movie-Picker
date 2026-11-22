import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUsageReport,
  formatUsageReport,
  gcloudSecretCommand,
  parisDayBounds,
  parseUsageArgs,
  sumCounts,
} from './usage.mjs';

const TODAY = '2026-11-18';

describe('parseUsageArgs', () => {
  it('reads the last 30 days of the production database by default', () => {
    assert.deepEqual(parseUsageArgs([], TODAY), {
      since: '2026-10-20',
      until: '2026-11-18',
      database: 'moviepicker',
      json: false,
    });
  });

  it('takes a number of days, an explicit start, a database and the raw report', () => {
    assert.deepEqual(parseUsageArgs(['--days', '7'], TODAY).since, '2026-11-12');
    assert.deepEqual(parseUsageArgs(['--since', '2026-11-01'], TODAY), {
      since: '2026-11-01',
      until: '2026-11-18',
      database: 'moviepicker',
      json: false,
    });
    assert.equal(parseUsageArgs(['--db', 'moviepicker_dev'], TODAY).database, 'moviepicker_dev');
    assert.equal(parseUsageArgs(['--json'], TODAY).json, true);
  });

  it('ignores the separator pnpm passes before the arguments', () => {
    assert.equal(parseUsageArgs(['--', '--days', '7'], TODAY).since, '2026-11-12');
  });

  it('refuses what it cannot read rather than guessing', () => {
    assert.throws(() => parseUsageArgs(['--days', '0'], TODAY), /--days/);
    assert.throws(() => parseUsageArgs(['--days', 'abc'], TODAY), /--days/);
    assert.throws(() => parseUsageArgs(['--since', '18/11/2026'], TODAY), /--since/);
    assert.throws(() => parseUsageArgs(['--since', '2026-11-19'], TODAY), /--since/);
    assert.throws(() => parseUsageArgs(['--verbose'], TODAY), /--verbose/);
  });
});

describe('parisDayBounds', () => {
  it('turns Paris calendar days into the instants the database stores', () => {
    assert.deepEqual(parisDayBounds('2026-11-01', '2026-11-18'), {
      from: '2026-10-31T23:00:00.000Z',
      to: '2026-11-18T23:00:00.000Z',
    });
  });

  it('follows the summer time of Paris', () => {
    assert.deepEqual(parisDayBounds('2026-07-01', '2026-07-01'), {
      from: '2026-06-30T22:00:00.000Z',
      to: '2026-07-01T22:00:00.000Z',
    });
  });
});

describe('sumCounts', () => {
  it('adds up the days of each metric and variant', () => {
    const totals = sumCounts([
      { metric: 'event_joined', variant: 'new_account', count: 2 },
      { metric: 'event_joined', variant: 'new_account', count: 3 },
      { metric: 'event_joined', variant: 'existing_account', count: 1 },
    ]);

    assert.equal(totals.get('event_joined', 'new_account'), 5);
    assert.equal(totals.get('event_joined', 'existing_account'), 1);
    assert.equal(totals.get('event_joined'), 6);
    assert.equal(totals.get('recap_viewed'), 0);
    assert.equal(
      totals.matching('user_signed_up', (variant) => variant.endsWith('.event')),
      0
    );
  });
});

const counts = [
  { metric: 'event_link_opened', variant: 'visitor.open', count: 40 },
  { metric: 'event_link_opened', variant: 'visitor.full', count: 2 },
  { metric: 'event_link_opened', variant: 'visitor.closed', count: 8 },
  { metric: 'event_link_opened', variant: 'account.open', count: 10 },
  { metric: 'join_prompt_clicked', variant: 'register', count: 12 },
  { metric: 'join_prompt_clicked', variant: 'login', count: 6 },
  { metric: 'user_signed_up', variant: 'email.event', count: 5 },
  { metric: 'user_signed_up', variant: 'google.event', count: 3 },
  { metric: 'user_signed_up', variant: 'email.other', count: 4 },
  { metric: 'user_logged_in', variant: 'github.event', count: 4 },
  { metric: 'event_joined', variant: 'new_account', count: 7 },
  { metric: 'event_joined', variant: 'existing_account', count: 13 },
  { metric: 'recap_viewed', variant: 'visitor', count: 9 },
  { metric: 'recap_viewed', variant: 'account', count: 3 },
  { metric: 'random_pick_opened', variant: 'watchlist', count: 5 },
  { metric: 'global_search_result_opened', variant: 'title', count: 4 },
  { metric: 'global_search_result_opened', variant: 'night', count: 2 },
  { metric: 'letterboxd_synced', variant: 'auto', count: 20 },
  { metric: 'letterboxd_synced', variant: 'manual', count: 2 },
  { metric: 'letterboxd_linked', variant: 'connected', count: 1 },
  { metric: 'letterboxd_choices_confirmed', variant: 'selected', count: 1 },
];

const truth = {
  accountsCreated: 12,
  eventsCreated: 3,
  arrivals: 20,
  arrivingPeople: 15,
  ratings: 40,
  raters: 6,
  watchlistAdds: 30,
  watchlistPeople: 4,
  watchlistImports: 250,
  letterboxdConnected: 5,
  letterboxdSyncedPeople: 3,
};

describe('buildUsageReport', () => {
  const report = buildUsageReport({ since: '2026-10-20', until: TODAY, counts, truth });

  it('walks the event link from the opening to the arrival of a new account', () => {
    assert.deepEqual(
      report.funnel.map((step) => [step.key, step.value]),
      [
        ['opened_by_visitor', 50],
        ['opened_by_visitor_joinable', 40],
        ['prompt_register', 12],
        ['signed_up_from_event', 8],
        ['joined_new_account', 7],
      ]
    );
  });

  it('gives each step its share of the step before', () => {
    const shares = Object.fromEntries(
      report.funnel.map((step) => [step.key, step.shareOfPrevious])
    );
    assert.equal(shares.opened_by_visitor, null);
    assert.equal(shares.prompt_register, 0.3);
    assert.equal(shares.joined_new_account, 0.875);
  });

  it('never divides a step the server records by one the browser may not send', () => {
    assert.deepEqual(
      report.funnel.map((step) => [step.key, step.source]),
      [
        ['opened_by_visitor', 'browser'],
        ['opened_by_visitor_joinable', 'browser'],
        ['prompt_register', 'browser'],
        ['signed_up_from_event', 'server'],
        ['joined_new_account', 'server'],
      ]
    );
    assert.equal(
      report.funnel.find((step) => step.key === 'signed_up_from_event').shareOfPrevious,
      null
    );
  });

  it('never divides by an empty step', () => {
    const empty = buildUsageReport({ since: TODAY, until: TODAY, counts: [], truth });
    assert.ok(empty.funnel.every((step) => step.value === 0));
    assert.ok(empty.funnel.slice(1).every((step) => step.shareOfPrevious === null));
  });

  it('keeps the side doors of the funnel apart', () => {
    assert.deepEqual(report.sideDoors, {
      openedByAccount: 10,
      openedFull: 2,
      openedClosed: 8,
      promptLogin: 6,
      loggedInFromEvent: 4,
      joinedExistingAccount: 13,
    });
  });

  it('reports what each feature is used for, from the counters and from the database', () => {
    assert.deepEqual(report.features, {
      signUps: {
        total: 12,
        fromEvent: 8,
        byMethod: { email: 9, google: 3, github: 0 },
        inDatabase: 12,
      },
      ratings: { ratings: 40, people: 6 },
      recaps: { visitor: 9, account: 3 },
      randomPicks: { watchlist: 5, list: 0, saved_list: 0, catalog: 0 },
      globalSearch: {
        title: 4,
        all_titles: 0,
        saga: 0,
        member: 0,
        night: 2,
        group: 0,
        list: 0,
        public_list: 0,
      },
      watchlist: { adds: 30, people: 4, imports: 250 },
      letterboxd: {
        connectedAccounts: 5,
        syncedPeople: 3,
        syncs: { manual: 2, auto: 20 },
        connections: 1,
        disconnections: 0,
        choicesConfirmed: 1,
      },
      events: { created: 3, arrivals: 20, arrivingPeople: 15 },
    });
  });
});

describe('formatUsageReport', () => {
  it('prints the period, the funnel with its shares and every feature', () => {
    const text = formatUsageReport(
      buildUsageReport({ since: '2026-10-20', until: TODAY, counts, truth })
    );

    assert.match(text, /2026-10-20 to 2026-11-18/);
    assert.match(text, /Event link opened by a visitor\s+50/);
    assert.match(
      text,
      /Global search results opened\s+6 \(title 4, all titles 0, saga 0, member 0, night 2, group 0, list 0, public list 0\)/
    );
    assert.match(text, /Reported by the browser, unless measurement was refused/);
    assert.match(text, /Recorded by the server for everyone/);
    assert.match(text, /Account created from an event link\s+8$/m);
    assert.match(text, /Joined by an account under 24 hours old\s+7\s+87\.5%/);
    assert.match(text, /Watchlist additions\s+30 by 4 people, plus 250 linked to Letterboxd/);
    assert.match(text, /Ratings\s+40 by 6 people/);
    assert.match(text, /Letterboxd syncs\s+22 \(2 manual, 20 automatic\)/);
    assert.doesNotMatch(text, /NaN|undefined/);
  });

  it('says so when the counters are still empty', () => {
    const text = formatUsageReport(
      buildUsageReport({ since: TODAY, until: TODAY, counts: [], truth })
    );

    assert.match(text, /No anonymous count recorded over this period/);
  });
});

describe('gcloudSecretCommand', () => {
  it('reads the secret from the active project when none is named', () => {
    assert.equal(
      gcloudSecretCommand(undefined),
      'gcloud secrets versions access latest --secret=MONGODB_URI'
    );
  });

  it('names the project when one is given', () => {
    assert.equal(
      gcloudSecretCommand('example-project-42'),
      'gcloud secrets versions access latest --secret=MONGODB_URI --project=example-project-42'
    );
  });

  it('refuses a project id that is not one', () => {
    assert.throws(() => gcloudSecretCommand('x & calc'), /GCP_PROJECT_ID/);
    assert.throws(() => gcloudSecretCommand('a$(whoami)b'), /GCP_PROJECT_ID/);
  });
});
