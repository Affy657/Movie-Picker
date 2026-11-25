import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { WORKSTATION_CONTAINER, mongosh, startWorkstationMongo } from '../mongo-replica-set.mjs';
import { REMOVED_FIELDS, removePhoto } from '../remove-photo.mjs';

const MONGO_DOCUMENTS_DIR = resolve(
  import.meta.dirname,
  '../../apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo'
);
const DATABASE = `remove_photo_${randomBytes(4).toString('hex')}`;
const URI_INSIDE_THE_CONTAINER = 'mongodb://127.0.0.1:27017/?directConnection=true';
const AT = { $date: '2026-11-20T09:00:00.000Z' };

const id = (n) => n.toString(16).padStart(24, '0');
const key = (letter) => letter.repeat(32);
const [lea, sam, noe] = [1, 2, 3].map((n) => id(0x100 + n));

const blob = (photoKey, userId, extra = {}) => ({
  _id: photoKey,
  userId,
  contentType: 'image/webp',
  data: { $binary: { base64: 'AQID', subType: '00' } },
  createdAt: AT,
  ...extra,
});

const SEED = {
  users: [
    {
      _id: { $oid: lea },
      handle: 'lea',
      version: { $numberLong: '4' },
      updatedAt: AT,
      avatarPhoto: { key: key('a'), isActive: true, updatedAt: AT },
      bannerPhoto: { key: key('b'), updatedAt: AT },
      banner: { source: 'photo', updatedAt: AT },
    },
    {
      _id: { $oid: sam },
      handle: 'sam',
      version: { $numberLong: '1' },
      updatedAt: AT,
      bannerPhoto: { key: key('d'), updatedAt: AT },
      banner: { source: 'film', tmdbId: 693134, title: 'Dune', imagePath: '/x.jpg', updatedAt: AT },
    },
    { _id: { $oid: noe }, handle: 'noe', version: { $numberLong: '1' }, updatedAt: AT },
  ],
  avatar_photos: [
    blob(key('a'), lea),
    blob(key('e'), lea, { expiresAt: { $date: '2026-11-20T09:10:00.000Z' } }),
    blob(key('c'), sam),
  ],
  banner_photos: [blob(key('b'), lea), blob(key('d'), sam)],
};

function read(script) {
  const result = mongosh(
    WORKSTATION_CONTAINER,
    `const target = db.getSiblingDB('${DATABASE}'); print(EJSON.stringify(${script}, { relaxed: true }));`
  );
  assert.ok(result.ok, result.output);
  return JSON.parse(result.output.split(/\r?\n/).pop());
}

const userOf = (handle) => read(`target.users.findOne({ handle: '${handle}' })`);
const photoKeys = (collection) =>
  read(`target.${collection}.find().toArray()`)
    .map((document) => document._id)
    .sort();

function remove(handle, photo) {
  return removePhoto({
    handle,
    photo,
    database: DATABASE,
    uri: URI_INSIDE_THE_CONTAINER,
    dockerNetwork: `container:${WORKSTATION_CONTAINER}`,
  });
}

function declaredApiFields() {
  const fields = new Set(['_id']);
  for (const file of readdirSync(MONGO_DOCUMENTS_DIR).filter((name) => name.endsWith('.cs'))) {
    const text = readFileSync(join(MONGO_DOCUMENTS_DIR, file), 'utf8');
    for (const [, field] of text.matchAll(/\[BsonElement\("([^"]+)"\)\]/g)) fields.add(field);
  }
  return fields;
}

describe('the removal of a reported photo against MongoDB', () => {
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

  it('reads and writes only fields the documents of the API declare', () => {
    const declared = declaredApiFields();
    assert.deepEqual(
      REMOVED_FIELDS.filter((field) => !declared.has(field)),
      []
    );
  });

  it('deletes the profile photo and its pointer, so the profile falls back to its avatar', () => {
    const result = remove('lea', 'avatar');

    assert.deepEqual(result, {
      handle: 'lea',
      photo: 'avatar',
      removed: true,
      key: key('a'),
      deletedPhotos: 2,
    });
    const user = userOf('lea');
    assert.equal(user.avatarPhoto, undefined);
    assert.equal(user.version, 5);
    assert.notEqual(user.updatedAt, AT.$date);
    assert.equal(user.bannerPhoto.key, key('b'));
    assert.deepEqual(photoKeys('avatar_photos'), [key('c')]);
  });

  it('deletes the banner photo and takes the banner off when the photo was shown', () => {
    const result = remove('lea', 'banner');

    assert.equal(result.removed, true);
    assert.equal(result.deletedPhotos, 1);
    const user = userOf('lea');
    assert.equal(user.bannerPhoto, undefined);
    assert.equal(user.banner, undefined);
    assert.deepEqual(photoKeys('banner_photos'), [key('d')]);
  });

  it('keeps a film banner when the photo was only kept aside', () => {
    remove('sam', 'banner');

    const user = userOf('sam');
    assert.equal(user.bannerPhoto, undefined);
    assert.equal(user.banner.source, 'film');
    assert.deepEqual(photoKeys('banner_photos'), []);
  });

  it('writes nothing for an account without that photo', () => {
    const result = remove('noe', 'avatar');

    assert.deepEqual(result, { handle: 'noe', photo: 'avatar', removed: false });
    assert.equal(userOf('noe').version, 1);
  });

  it('refuses a handle no account carries', () => {
    assert.throws(() => remove('nobody', 'avatar'), /No account has the handle @nobody/);
  });
});
