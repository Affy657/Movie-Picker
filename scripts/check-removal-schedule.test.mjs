import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  backupRetentionDays,
  evaluateSchedule,
  formatReport,
  migrationOnlyPortMethods,
  migrationsOf,
  parseSchedule,
  releasesToResolve,
} from './check-removal-schedule.mjs';

const API = 'apps/api-dotnet/MoviePicker.Api';
const MIGRATIONS = `${API}/Infrastructure/Migrations`;
const DTOS = `${API}/Application/DTOs/SyncDtos.cs`;

const TERRAFORM = `resource "google_storage_bucket" "state" {
  soft_delete_policy {
    retention_duration_seconds = 0
  }
}

resource "google_storage_bucket" "backups" {
  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age            = 30
      matches_prefix = ["mongodb/", "pending/"]
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age            = 400
      matches_prefix = ["monthly/"]
    }
  }
}
`;

const ASSIGN_HANDLES = `public sealed class AssignHandlesMigration : IDataMigration
{
    public string Id => "2026-09-05-001-assign-handles";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        foreach (var user in await _users.ListMissingHandleAsync(ct))
            await _users.UpdateAsync(user, ct);
        return await BackfillSteps.RunBatchesAsync(_users.ListMissingAvatarAsync, ct);
    }
}`;

const FILES = {
  [`${API}/Application/Ports/IDataMigration.cs`]:
    'public interface IDataMigration\n{\n    string Id { get; }\n}\n\npublic interface IRepeatableDataMigration : IDataMigration;',
  [`${API}/Application/Ports/IUserRepository.cs`]: [
    'public interface IUserRepository',
    '{',
    '    Task UpdateAsync(User user, CancellationToken ct = default);',
    '    Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct = default);',
    '    Task<IReadOnlyList<User>> ListMissingAvatarAsync(int limit, CancellationToken ct = default);',
    '}',
  ].join('\n'),
  [`${MIGRATIONS}/AssignHandlesMigration.cs`]: ASSIGN_HANDLES,
  [`${MIGRATIONS}/RefreshCountersMigration.cs`]:
    'public sealed class RefreshCountersMigration : IRepeatableDataMigration\n{\n    public string Id => "refresh-counters";\n}',
  [`${MIGRATIONS}/BackfillSteps.cs`]:
    'public static class BackfillSteps\n{\n    public static Task<long> RunBatchesAsync() => Task.FromResult(0L);\n}',
  [`${MIGRATIONS}/DataMigrationServiceCollectionExtensions.cs`]:
    'services.AddScoped<IDataMigration, AssignHandlesMigration>();',
  [`${API}/Infrastructure/Persistence/Mongo/MongoUserRepository.cs`]:
    'public Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct) => _users.Find(x => x.Handle == null).ToListAsync(ct);',
  [`${API}/Application/UseCases/Profile/PatchProfileHandler.cs`]:
    'await _users.UpdateAsync(user with { DisplayName = name }, ct);',
  [`${API}/Application/UseCases/Avatar/AvatarSweep.cs`]:
    'var users = await _users.ListMissingAvatarAsync(100, ct);',
  [`${API}/obj/Debug/net10.0/Generated.cs`]: 'ListMissingHandleAsync AssignHandlesMigration',
  ['apps/api-dotnet/MoviePicker.Api.Tests/Migrations/AssignHandlesMigrationTests.cs']:
    'var migration = new AssignHandlesMigration(users.Object, logger);\nusers.Setup(r => r.ListMissingHandleAsync(It.IsAny<CancellationToken>()));',
  ['apps/api-dotnet/MoviePicker.Api.Tests/Persistence/InMemoryUserRepositoryTests.cs']:
    'var missing = await repository.ListMissingHandleAsync();',
  [DTOS]:
    'public sealed class SyncResponse\n{\n    public int Added { get; init; }\n    public int WatchedAdded { get; init; }\n}',
  'infra/terraform/environments/production/main.tf': TERRAFORM,
};

function repoOf(files) {
  const paths = Object.keys(files);
  return {
    read: (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`);
      return files[path];
    },
    isFile: (path) => path in files,
    isDirectory: (path) => paths.some((file) => file.startsWith(`${path}/`)),
    list: (dir) => paths.filter((file) => file.startsWith(`${dir}/`)).sort(),
  };
}

const REPO = repoOf(FILES);

const FLAT_FIELDS = {
  what: 'The flat fields of SyncResponse, now carried per list',
  why: 'The front of 1.31.1 reads them and a service worker keeps it for days',
  after: { release: 'v1.32.1', days: 30 },
  exists: { path: DTOS, pattern: 'public int WatchedAdded\\b' },
};

function evaluate({ removals = [], migrationAppliedAt, today, releaseDates = new Map(), files }) {
  const schedule = parseSchedule({ removals, migrationAppliedAt });
  return evaluateSchedule({
    schedule,
    repo: files ? repoOf(files) : REPO,
    today,
    releaseDates,
    retentionDays: 410,
  });
}

describe('backupRetentionDays', () => {
  it('adds the life of a monthly copy, its soft delete and the lifecycle passes', () => {
    assert.equal(backupRetentionDays(TERRAFORM), 410);
  });

  it('follows a retention change of the bucket', () => {
    assert.equal(backupRetentionDays(TERRAFORM.replace('age            = 400', 'age = 365')), 375);
  });

  it('refuses a bucket without monthly copies or without soft delete', () => {
    assert.throws(
      () => backupRetentionDays(TERRAFORM.replace('"monthly/"', '"yearly/"')),
      /no lifecycle age for the monthly\/ copies/
    );
    assert.throws(
      () => backupRetentionDays(TERRAFORM.replace('retention_duration_seconds = 604800', '')),
      /no soft delete retention/
    );
  });
});

describe('migrationsOf', () => {
  it('reads every recorded migration with the date of its identifier', () => {
    const { migrations, errors } = migrationsOf(REPO);

    assert.deepEqual(errors, []);
    assert.deepEqual(
      migrations.map(({ id, className, file, identifierDate }) => ({
        id,
        className,
        file,
        identifierDate,
      })),
      [
        {
          id: '2026-09-05-001-assign-handles',
          className: 'AssignHandlesMigration',
          file: `${MIGRATIONS}/AssignHandlesMigration.cs`,
          identifierDate: '2026-09-05',
        },
      ]
    );
  });

  it('refuses a migration whose identifier does not start with its date', () => {
    const { errors } = migrationsOf(
      repoOf({
        ...FILES,
        [`${MIGRATIONS}/AssignHandlesMigration.cs`]: ASSIGN_HANDLES.replace(
          '"2026-09-05-001-assign-handles"',
          '"assign-handles"'
        ),
      })
    );

    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /AssignHandlesMigration\.cs: the identifier "assign-handles" does not start/
    );
  });
});

describe('migrationOnlyPortMethods', () => {
  it('lists the port methods no other production code calls', () => {
    const [migration] = migrationsOf(REPO).migrations;

    assert.deepEqual(migrationOnlyPortMethods(REPO, migration), ['ListMissingHandleAsync']);
  });

  it('keeps a method another migration still calls', () => {
    const repo = repoOf({
      ...FILES,
      [`${MIGRATIONS}/RenameHandlesMigration.cs`]:
        'public sealed class RenameHandlesMigration : IDataMigration\n{\n    public string Id => "2026-10-01-001-rename-handles";\n    var users = await _users.ListMissingHandleAsync(ct);\n}',
    });
    const migrations = migrationsOf(repo).migrations;

    for (const migration of migrations)
      assert.deepEqual(migrationOnlyPortMethods(repo, migration), []);
  });
});

describe('evaluateSchedule', () => {
  it('waits for a fixed date while the thing is still there', () => {
    const result = evaluate({
      removals: [{ ...FLAT_FIELDS, after: { date: '2027-01-15' } }],
      today: '2027-01-14',
    });

    assert.deepEqual(result.due, []);
    assert.deepEqual(result.dead, []);
    assert.deepEqual(
      result.waiting.map(({ label, date }) => ({ label, date })),
      [
        { label: FLAT_FIELDS.what, date: '2027-01-15' },
        { label: 'migration 2026-09-05-001-assign-handles', date: '2027-10-20' },
      ]
    );
    assert.equal(formatReport(result).ok, true);
  });

  it('fails on the due date and says what to remove, why it waited and where it is', () => {
    const result = evaluate({
      removals: [{ ...FLAT_FIELDS, after: { date: '2027-01-15' } }],
      today: '2027-01-15',
    });
    const report = formatReport(result);

    assert.equal(report.ok, false);
    assert.deepEqual(
      result.due.map(({ label, date }) => ({ label, date })),
      [{ label: FLAT_FIELDS.what, date: '2027-01-15' }]
    );
    assert.match(report.text, /The flat fields of SyncResponse, now carried per list/);
    assert.match(report.text, /due since 2027-01-15 \(fixed date\)/);
    assert.match(report.text, /The front of 1\.31\.1 reads them/);
    assert.match(
      report.text,
      /\/public int WatchedAdded\\b\/ still matches apps\/api-dotnet\/MoviePicker\.Api\/Application\/DTOs\/SyncDtos\.cs/
    );
    assert.match(report.text, /then delete this entry from scripts\/removal-schedule\.json/);
  });

  it('fails on a line whose thing is gone, due or not', () => {
    const files = {
      ...FILES,
      [DTOS]: 'public sealed class SyncResponse\n{\n    public int Added { get; init; }\n}',
    };
    const result = evaluate({
      removals: [
        { ...FLAT_FIELDS, after: { date: '2099-01-01' } },
        {
          ...FLAT_FIELDS,
          what: 'A deleted file',
          exists: { path: `${API}/Gone.cs`, pattern: 'x' },
        },
      ],
      today: '2027-01-14',
      files,
    });
    const report = formatReport(result);

    assert.equal(report.ok, false);
    assert.deepEqual(
      result.dead.map(({ label }) => label),
      [FLAT_FIELDS.what, 'A deleted file']
    );
    assert.match(
      report.text,
      /no longer matches .*SyncDtos\.cs: the removal is done, delete this entry/
    );
    assert.match(report.text, /Gone\.cs does not exist any more/);
  });

  it('searches every file of a directory, build outputs excluded', () => {
    const removal = {
      ...FLAT_FIELDS,
      after: { date: '2099-01-01' },
      exists: { path: API, pattern: 'Generated' },
    };
    const result = evaluate({ removals: [removal], today: '2027-01-14' });

    assert.deepEqual(
      result.dead.map(({ label }) => label),
      [FLAT_FIELDS.what]
    );
  });

  it('counts a release delay from the day the release reached production', () => {
    const releaseDates = new Map([['v1.32.1', { tag: 'v1.32.1', publishedOn: '2026-12-02' }]]);

    const before = evaluate({ removals: [FLAT_FIELDS], today: '2026-12-31', releaseDates });
    const on = evaluate({ removals: [FLAT_FIELDS], today: '2027-01-01', releaseDates });

    assert.deepEqual(before.due, []);
    assert.deepEqual(
      on.due.map(({ date, basis }) => ({ date, basis })),
      [{ date: '2027-01-01', basis: '30 days after v1.32.1 reached production on 2026-12-02' }]
    );
  });

  it('waits without a date while the release has not reached production', () => {
    const result = evaluate({
      removals: [FLAT_FIELDS],
      today: '2027-01-14',
      releaseDates: new Map([['v1.32.1', { unpublished: true }]]),
    });
    const report = formatReport(result);

    assert.deepEqual(result.due, []);
    assert.equal(result.waiting[0].date, null);
    assert.equal(report.ok, true);
    assert.match(report.text, /30 days after v1\.32\.1 reaches production, not there yet/);
  });

  it('warns without failing when the production date cannot be read', () => {
    const result = evaluate({
      removals: [FLAT_FIELDS],
      today: '2027-01-14',
      releaseDates: new Map([['v1.32.1', { unknown: 'GitHub answered 403 for v1.32.1' }]]),
    });
    const report = formatReport(result);

    assert.equal(report.ok, true);
    assert.deepEqual(result.warnings, [
      `${FLAT_FIELDS.what}: production date of v1.32.1 unreadable: GitHub answered 403 for v1.32.1`,
    ]);
    assert.match(report.text, /production date of v1\.32\.1 unreadable/);
  });

  it('derives the removal date of a migration from its identifier and the backup retention', () => {
    const before = evaluate({ today: '2027-10-19' });
    const on = evaluate({ today: '2027-10-20' });
    const report = formatReport(on);

    assert.deepEqual(before.due, []);
    assert.deepEqual(
      on.due.map(({ label, date, basis }) => ({ label, date, basis })),
      [
        {
          label: 'migration 2026-09-05-001-assign-handles',
          date: '2027-10-20',
          basis: 'identifier date 2026-09-05 plus 410 days of backup retention',
        },
      ]
    );
    assert.match(
      report.text,
      /db\.migrations\.findOne\(\{ _id: "2026-09-05-001-assign-handles" \}\)/
    );
    assert.match(report.text, /record it under migrationAppliedAt/);
    assert.match(
      report.text,
      /AssignHandlesMigration, its line in DataMigrationServiceCollectionExtensions/
    );
    assert.match(report.text, /port methods only it calls: ListMissingHandleAsync/);
    assert.match(
      report.text,
      /apps\/api-dotnet\/MoviePicker\.Api\.Tests\/Migrations\/AssignHandlesMigrationTests\.cs/
    );
    assert.match(
      report.text,
      /MoviePicker\.Api\/Infrastructure\/Persistence\/Mongo\/MongoUserRepository\.cs/
    );
    assert.doesNotMatch(report.text, /obj\/Debug/);
    assert.doesNotMatch(report.text, /PatchProfileHandler/);
  });

  it('moves the date of a migration to its production appliedAt once recorded', () => {
    const migrationAppliedAt = { '2026-09-05-001-assign-handles': '2026-10-01' };

    const before = evaluate({ migrationAppliedAt, today: '2027-11-14' });
    const on = evaluate({ migrationAppliedAt, today: '2027-11-15' });

    assert.deepEqual(before.due, []);
    assert.deepEqual(
      on.due.map(({ date, basis }) => ({ date, basis })),
      [
        {
          date: '2027-11-15',
          basis: 'production appliedAt 2026-10-01 plus 410 days of backup retention',
        },
      ]
    );
  });

  it('refuses an appliedAt before the identifier date and one of a migration that is gone', () => {
    const result = evaluate({
      migrationAppliedAt: {
        '2026-09-05-001-assign-handles': '2026-09-01',
        '2026-08-01-001-removed-long-ago': '2026-08-02',
      },
      today: '2027-01-14',
    });
    const report = formatReport(result);

    assert.equal(report.ok, false);
    assert.deepEqual(result.errors, [
      'migrationAppliedAt["2026-09-05-001-assign-handles"]: 2026-09-01 is before the identifier date 2026-09-05',
    ]);
    assert.deepEqual(
      result.dead.map(({ label }) => label),
      ['migrationAppliedAt["2026-08-01-001-removed-long-ago"]']
    );
    assert.match(report.text, /no migration carries this identifier any more, delete the key/);
  });

  it('reports a migration identifier that gives no date', () => {
    const result = evaluate({
      today: '2027-01-14',
      files: {
        ...FILES,
        [`${MIGRATIONS}/AssignHandlesMigration.cs`]: ASSIGN_HANDLES.replace(
          '"2026-09-05-001-assign-handles"',
          '"assign-handles"'
        ),
      },
    });

    assert.equal(formatReport(result).ok, false);
    assert.equal(result.errors.length, 1);
  });
});

describe('parseSchedule', () => {
  it('reports every malformed entry by its position', () => {
    const schedule = parseSchedule({
      removals: [
        { ...FLAT_FIELDS, what: '' },
        { ...FLAT_FIELDS, exists: { path: DTOS, pattern: '(' } },
        { ...FLAT_FIELDS, after: { release: 'v1.32.1' } },
      ],
      migrationAppliedAt: { 'some-id': 'soon' },
    });

    assert.equal(schedule.removals.length, 0);
    assert.deepEqual(
      schedule.errors.map((error) => error.split(':')[0]),
      ['removals[0]', 'removals[1]', 'removals[2]', 'migrationAppliedAt["some-id"]']
    );
  });

  it('refuses a file without a removals array', () => {
    assert.match(parseSchedule({}).errors[0], /"removals" must be an array/);
  });
});

describe('releasesToResolve', () => {
  it('lists the release of each removal still to do, once', () => {
    const schedule = parseSchedule({
      removals: [
        FLAT_FIELDS,
        { ...FLAT_FIELDS, what: 'Another field of the same release' },
        {
          ...FLAT_FIELDS,
          what: 'A later release',
          after: { firstReleaseAfter: 'v1.32.1', days: 30 },
        },
        { ...FLAT_FIELDS, what: 'A fixed date', after: { date: '2027-01-01' } },
        {
          ...FLAT_FIELDS,
          what: 'Already gone',
          after: { release: 'v1.40.0', days: 30 },
          exists: { path: DTOS, pattern: 'Nope' },
        },
      ],
    });

    assert.deepEqual(releasesToResolve(schedule, REPO), [
      { release: 'v1.32.1', days: 30 },
      { firstReleaseAfter: 'v1.32.1', days: 30 },
    ]);
  });
});
