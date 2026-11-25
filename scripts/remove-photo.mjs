/**
 * Takes down a reported profile photo or banner photo (DEBT-068), the gesture the moderation
 * e-mail of `POST /users/{handle}/photo-reports` points to.
 *
 * In one transaction it clears the pointer on the account (`avatarPhoto`, or `bannerPhoto` and a
 * banner that showed it), bumps the optimistic `version` so an API write holding the old account
 * fails instead of restoring the photo, and deletes every stored image of that kind the account
 * owns, a replaced one still waiting for its TTL included. Clearing the pointer is what makes the
 * profile fall back to its generated avatar or to no banner; deleting the image alone would leave
 * the profile pointing at a 404.
 *
 * Usage: `pnpm run photo:remove -- --handle <handle> --photo avatar|banner [--db moviepicker]`.
 * The URI comes from `MONGODB_URI`, or else from the `MONGODB_URI` secret through gcloud, as for
 * `pnpm run usage`; the command runs in the MongoDB image pinned by `scripts/mongo-replica-set.mjs`,
 * through Docker. The arguments are tested by `scripts/remove-photo.test.mjs`, the removal itself
 * against seeded documents by `scripts/mongo-tests/remove-photo.test.mjs`. Runbook:
 * `docs/runbook-photo-moderation.md`.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MONGO_IMAGE } from './mongo-replica-set.mjs';
import { mongoUri } from './usage.mjs';

const DEFAULT_DATABASE = 'moviepicker';
const PHOTOS = ['avatar', 'banner'];

export const REMOVED_FIELDS = [
  'handle',
  'version',
  'updatedAt',
  'avatarPhoto',
  'bannerPhoto',
  'banner',
  'key',
  'source',
  'userId',
];

export function parseRemovePhotoArgs(argv) {
  const options = { handle: '', photo: '', database: DEFAULT_DATABASE };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--') continue;
    if (argument === '--handle') {
      options.handle = (value ?? '').trim().replace(/^@/, '').toLowerCase();
      index += 1;
    } else if (argument === '--photo') {
      if (!PHOTOS.includes(value)) {
        throw new Error(`--photo expects avatar or banner, got "${value}"`);
      }
      options.photo = value;
      index += 1;
    } else if (argument === '--db') {
      if (!value) throw new Error('--db expects a database name');
      options.database = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument ${argument}: use --handle, --photo or --db`);
    }
  }
  if (!options.handle) throw new Error('--handle expects the handle of the account');
  if (!options.photo) throw new Error('--photo expects avatar or banner');
  return options;
}

const MONGOSH_REMOVAL = `
const client = new Mongo(process.env.MONGODB_URI);
const database = process.env.PHOTO_DB;
const avatar = process.env.PHOTO_KIND === 'avatar';
const pointer = avatar ? 'avatarPhoto' : 'bannerPhoto';
const photos = avatar ? 'avatar_photos' : 'banner_photos';
const user = client.getDB(database).users.findOne({ handle: process.env.PHOTO_HANDLE });
if (!user) {
  print(JSON.stringify({ found: false }));
} else if (!user[pointer]) {
  print(JSON.stringify({ found: true, removed: false }));
} else {
  const unset = { [pointer]: '' };
  if (!avatar && user.banner && user.banner.source === 'photo') unset.banner = '';
  const session = client.startSession();
  let deletedPhotos = 0;
  try {
    session.withTransaction(() => {
      const db = session.getDatabase(database);
      const updated = db.users.updateOne(
        { _id: user._id, version: user.version },
        { $unset: unset, $set: { updatedAt: new Date() }, $inc: { version: 1 } }
      );
      if (updated.matchedCount !== 1) {
        throw new Error('The account changed during the removal: run the command again.');
      }
      deletedPhotos = db.getCollection(photos).deleteMany({ userId: user._id.toHexString() }).deletedCount;
    });
  } finally {
    session.endSession();
  }
  print(JSON.stringify({ found: true, removed: true, key: user[pointer].key, deletedPhotos: Number(deletedPhotos) }));
}
`;

export function removePhoto({ handle, photo, database, uri = mongoUri(), dockerNetwork }) {
  const env = {
    ...process.env,
    MONGODB_URI: uri,
    PHOTO_DB: database,
    PHOTO_HANDLE: handle,
    PHOTO_KIND: photo,
  };
  const passed = ['MONGODB_URI', 'PHOTO_DB', 'PHOTO_HANDLE', 'PHOTO_KIND'].flatMap((name) => [
    '-e',
    name,
  ]);
  const result = spawnSync(
    process.platform === 'win32' ? 'docker.exe' : 'docker',
    [
      'run',
      '--rm',
      ...(dockerNetwork ? ['--network', dockerNetwork] : []),
      '-e',
      'HOME=/tmp',
      ...passed,
      MONGO_IMAGE,
      'mongosh',
      '--nodb',
      '--quiet',
      '--eval',
      MONGOSH_REMOVAL,
    ],
    { encoding: 'utf8', env }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `The removal failed (is Docker running?): ${(result.stderr || result.stdout).trim()}`
    );
  }
  const outcome = JSON.parse(result.stdout.trim().split(/\r?\n/).pop());
  if (!outcome.found) throw new Error(`No account has the handle @${handle} in ${database}`);
  return outcome.removed
    ? { handle, photo, removed: true, key: outcome.key, deletedPhotos: outcome.deletedPhotos }
    : { handle, photo, removed: false };
}

function describeOutcome(outcome) {
  const what = outcome.photo === 'avatar' ? 'profile photo' : 'banner photo';
  if (!outcome.removed) return `@${outcome.handle} has no ${what}: nothing was changed.`;
  return `Removed the ${what} ${outcome.key} of @${outcome.handle} (${outcome.deletedPhotos} stored image(s) deleted).`;
}

function main() {
  try {
    console.log(describeOutcome(removePhoto(parseRemovePhotoArgs(process.argv.slice(2)))));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
