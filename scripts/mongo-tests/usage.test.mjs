import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { WORKSTATION_CONTAINER, mongosh, startWorkstationMongo } from '../mongo-replica-set.mjs';
import { readUsage } from '../usage.mjs';

const MONGO_DOCUMENTS_DIR = resolve(
  import.meta.dirname,
  '../../apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo'
);
const DATABASE = `usage_query_${randomBytes(4).toString('hex')}`;
const URI_INSIDE_THE_CONTAINER = 'mongodb://127.0.0.1:27017/?directConnection=true';

const IN_PERIOD = { $date: '2026-11-02T12:00:00.000Z' };
const BEFORE_PERIOD = { $date: '2026-10-20T12:00:00.000Z' };
const AFTER_PERIOD = { $date: '2026-11-10T12:00:00.000Z' };

const id = (n) => ({ $oid: n.toString(16).padStart(24, '0') });
const [host, guest, secondGuest, formerGuest] = [1, 2, 3, 4].map((n) => id(0x100 + n));
const [night, otherNight] = [1, 2].map((n) => id(0x200 + n));
const participants = [1, 2, 3, 4, 5, 6].map((n) => id(0x300 + n));

const SEED = {
  users: [
    {
      _id: host,
      createdAt: IN_PERIOD,
      letterboxdUsername: 'host-lbx',
      letterboxdLastSyncAt: IN_PERIOD,
    },
    {
      _id: guest,
      createdAt: IN_PERIOD,
      letterboxdUsername: '',
      letterboxdLastSyncAt: AFTER_PERIOD,
    },
    { _id: secondGuest, createdAt: BEFORE_PERIOD, letterboxdUsername: 'guest-lbx' },
    { _id: formerGuest, createdAt: BEFORE_PERIOD, letterboxdUsername: null },
  ],
  events: [
    { _id: night, creatorUserId: host, createdAt: IN_PERIOD },
    { _id: otherNight, creatorUserId: secondGuest, createdAt: BEFORE_PERIOD },
  ],
  participants: [
    { _id: participants[0], eventId: night, userId: host, createdAt: IN_PERIOD },
    { _id: participants[1], eventId: night, userId: guest, createdAt: IN_PERIOD },
    { _id: participants[2], eventId: otherNight, userId: guest, createdAt: IN_PERIOD },
    { _id: participants[3], eventId: night, userId: secondGuest, createdAt: IN_PERIOD },
    { _id: participants[4], eventId: otherNight, userId: secondGuest, createdAt: IN_PERIOD },
    { _id: participants[5], eventId: night, userId: formerGuest, createdAt: AFTER_PERIOD },
  ],
  movie_ratings: [
    { participantId: participants[1], createdAt: IN_PERIOD },
    { participantId: participants[2], createdAt: IN_PERIOD },
    { participantId: participants[3], createdAt: IN_PERIOD },
    { participantId: participants[0], createdAt: BEFORE_PERIOD },
  ],
  watchlist: [
    { userId: host, createdAt: IN_PERIOD },
    { userId: host, createdAt: IN_PERIOD, letterboxdSlug: '' },
    { userId: guest, createdAt: IN_PERIOD, letterboxdSlug: null },
    { userId: guest, createdAt: IN_PERIOD, letterboxdSlug: 'dune-part-two' },
    { userId: secondGuest, createdAt: BEFORE_PERIOD },
  ],
  usage_counts: [
    { day: '2026-10-31', metric: 'event_link_opened', variant: 'visitor.open', count: 5 },
    { day: '2026-11-01', metric: 'event_link_opened', variant: 'visitor.open', count: 3 },
    { day: '2026-11-03', metric: 'user_signed_up', variant: 'email.event', count: 2 },
    { day: '2026-11-04', metric: 'user_signed_up', variant: 'email.event', count: 7 },
  ].map((row) => ({
    _id: `${row.day}|${row.metric}|${row.variant}`,
    ...row,
    count: { $numberLong: String(row.count) },
  })),
};

function apiDocumentFieldsOf(collection) {
  const sources = new Map(
    readdirSync(MONGO_DOCUMENTS_DIR)
      .filter((file) => file.endsWith('.cs'))
      .map((file) => [file, readFileSync(join(MONGO_DOCUMENTS_DIR, file), 'utf8')])
  );
  const documentType = [...sources.values()]
    .map((text) => {
      const declared = /CollectionName\s*=\s*"([^"]+)"/.exec(text)?.[1];
      const read = /GetCollection<(\w+)>\(\s*(?:"([^"]+)"|CollectionName)\s*\)/.exec(text);
      return read && (read[2] ?? declared) === collection ? read[1] : null;
    })
    .find(Boolean);
  assert.ok(documentType, `no API repository reads the ${collection} collection`);
  const fields = new Set(['_id']);
  for (let type = documentType; type;) {
    const text = sources.get(`${type}.cs`) ?? '';
    for (const [, field] of text.matchAll(/\[BsonElement\("([^"]+)"\)\]/g)) fields.add(field);
    type = new RegExp(String.raw`class\s+${type}\s*:\s*(\w+Document)\b`).exec(text)?.[1];
  }
  return fields;
}

describe('the usage query against MongoDB', () => {
  before(async () => {
    await startWorkstationMongo();
    const seed = Buffer.from(JSON.stringify(SEED)).toString('base64');
    const seeded = mongosh(
      WORKSTATION_CONTAINER,
      `const target = db.getSiblingDB('${DATABASE}');
       const seed = EJSON.parse(Buffer.from('${seed}', 'base64').toString());
       for (const [collection, documents] of Object.entries(seed)) target.getCollection(collection).insertMany(documents);`
    );
    assert.ok(seeded.ok, seeded.output);
  });

  after(() => {
    mongosh(WORKSTATION_CONTAINER, `db.getSiblingDB('${DATABASE}').dropDatabase()`);
  });

  it('seeds only fields the documents of the API declare', () => {
    const undeclared = Object.entries(SEED).flatMap(([collection, documents]) => {
      const fields = apiDocumentFieldsOf(collection);
      const seeded = new Set(documents.flatMap((document) => Object.keys(document)));
      return [...seeded]
        .filter((field) => !fields.has(field))
        .map((field) => `${collection}.${field}`);
    });
    assert.deepEqual(undeclared, []);
  });

  it('counts the period from the anonymous totals and the records themselves', () => {
    const usage = readUsage({
      since: '2026-11-01',
      until: '2026-11-03',
      database: DATABASE,
      uri: URI_INSIDE_THE_CONTAINER,
      dockerNetwork: `container:${WORKSTATION_CONTAINER}`,
    });

    assert.deepEqual(
      usage.counts.toSorted((a, b) => a.metric.localeCompare(b.metric)),
      [
        { metric: 'event_link_opened', variant: 'visitor.open', count: 3 },
        { metric: 'user_signed_up', variant: 'email.event', count: 2 },
      ]
    );
    assert.deepEqual(usage.truth, {
      accountsCreated: 2,
      eventsCreated: 1,
      arrivals: 3,
      arrivingPeople: 2,
      ratings: 3,
      raters: 2,
      watchlistAdds: 3,
      watchlistPeople: 2,
      watchlistImports: 1,
      letterboxdConnected: 2,
      letterboxdSyncedPeople: 1,
    });
  });
});
