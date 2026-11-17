import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickRollbackTarget } from './rollback-front-firebase.mjs';

const OLDEST = '9999999ffffffffffffffffffffffffffffffff0';
const OLDER = 'aaaaaaa1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const NEWER = 'ccccccc2dddddddddddddddddddddddddddddddd';
const SAME_PREFIX = 'aaaaaaa2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

function createdAt(name) {
  return `2026-11-0${name.slice(-1)}T10:00:00.000Z`;
}

function version(name, commit) {
  return { time: `time of ${name}`, version: name, created: createdAt(name), commit, run: '1' };
}

function served(name) {
  return { version: name, created: createdAt(name) };
}

describe('pickRollbackTarget', () => {
  it('takes the most recent version of a commit deployed twice', () => {
    const deployed = [
      version('versions/v4', NEWER),
      version('versions/v3', OLDER),
      version('versions/v2', OLDER),
      version('versions/v1', SAME_PREFIX),
    ];

    const { target, error } = pickRollbackTarget(deployed, served('versions/v4'), OLDER);

    assert.equal(error, undefined);
    assert.equal(target.version, 'versions/v3');
  });

  it('counts a version released twice once', () => {
    const deployed = [version('versions/v2', OLDER), version('versions/v2', OLDER)];

    const { target } = pickRollbackTarget(deployed, served('versions/v9'), OLDER);

    assert.equal(target.version, 'versions/v2');
  });

  it('refuses a prefix that names two commits', () => {
    const deployed = [version('versions/v2', OLDER), version('versions/v1', SAME_PREFIX)];

    const { target, error } = pickRollbackTarget(deployed, served('versions/v9'), 'aaaaaaa');

    assert.equal(target, undefined);
    assert.match(error, /aaaaaaa/);
  });

  it('refuses a commit that was never deployed', () => {
    const { target, error } = pickRollbackTarget(
      [version('versions/v1', OLDER)],
      served('versions/v1'),
      'fffffff'
    );

    assert.equal(target, undefined);
    assert.match(error, /fffffff/);
  });

  it('takes the version released before the served one when no commit is given', () => {
    const deployed = [
      version('versions/v3', NEWER),
      version('versions/v3', NEWER),
      version('versions/v2', OLDER),
    ];

    assert.equal(
      pickRollbackTarget(deployed, served('versions/v3'), '').target.version,
      'versions/v2'
    );
  });

  it('refuses when the served version is the only one ever released', () => {
    const { target, error } = pickRollbackTarget(
      [version('versions/v1', OLDER)],
      served('versions/v1'),
      ''
    );

    assert.equal(target, undefined);
    assert.ok(error);
  });

  it('steps back past the version a first rollback served again', () => {
    const deployed = [
      version('versions/v2', OLDER),
      version('versions/v3', NEWER),
      version('versions/v2', OLDER),
      version('versions/v1', OLDEST),
    ];

    const { target, error } = pickRollbackTarget(deployed, served('versions/v2'), '');

    assert.equal(error, undefined);
    assert.equal(target.version, 'versions/v1');
  });

  it('takes the deployed version created last before an unlabelled one being served', () => {
    const deployed = [version('versions/v3', NEWER), version('versions/v1', OLDEST)];

    const { target } = pickRollbackTarget(deployed, served('versions/v4'), '');

    assert.equal(target.version, 'versions/v3');
  });

  it('refuses when every deployed version is newer than the one served', () => {
    const deployed = [
      version('versions/v1', OLDEST),
      version('versions/v3', NEWER),
      version('versions/v1', OLDEST),
    ];

    const { target, error } = pickRollbackTarget(deployed, served('versions/v1'), '');

    assert.equal(target, undefined);
    assert.ok(error);
  });

  it('refuses when the served version tells no creation time', () => {
    const deployed = [version('versions/v2', OLDER), version('versions/v1', OLDEST)];

    const { target, error } = pickRollbackTarget(deployed, { version: undefined, created: '' }, '');

    assert.equal(target, undefined);
    assert.match(error, /--commit|commit/);
  });
});
