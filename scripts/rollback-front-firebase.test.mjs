import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickRollbackTarget } from './rollback-front-firebase.mjs';

const OLDER = 'aaaaaaa1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const NEWER = 'ccccccc2dddddddddddddddddddddddddddddddd';
const SAME_PREFIX = 'aaaaaaa2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

function version(name, commit) {
  return { time: `time of ${name}`, version: name, commit, run: '1' };
}

describe('pickRollbackTarget', () => {
  it('takes the most recent version of a commit deployed twice', () => {
    const deployed = [
      version('versions/v4', NEWER),
      version('versions/v3', OLDER),
      version('versions/v2', OLDER),
      version('versions/v1', SAME_PREFIX),
    ];

    const { target, error } = pickRollbackTarget(deployed, 'versions/v4', OLDER);

    assert.equal(error, undefined);
    assert.equal(target.version, 'versions/v3');
  });

  it('counts a version released twice once', () => {
    const deployed = [version('versions/v2', OLDER), version('versions/v2', OLDER)];

    const { target } = pickRollbackTarget(deployed, 'versions/v9', OLDER);

    assert.equal(target.version, 'versions/v2');
  });

  it('refuses a prefix that names two commits', () => {
    const deployed = [version('versions/v2', OLDER), version('versions/v1', SAME_PREFIX)];

    const { target, error } = pickRollbackTarget(deployed, 'versions/v9', 'aaaaaaa');

    assert.equal(target, undefined);
    assert.match(error, /aaaaaaa/);
  });

  it('refuses a commit that was never deployed', () => {
    const { target, error } = pickRollbackTarget(
      [version('versions/v1', OLDER)],
      'versions/v1',
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

    assert.equal(pickRollbackTarget(deployed, 'versions/v3', '').target.version, 'versions/v2');
  });

  it('refuses when the served version is the only one ever released', () => {
    const { target, error } = pickRollbackTarget(
      [version('versions/v1', OLDER)],
      'versions/v1',
      ''
    );

    assert.equal(target, undefined);
    assert.ok(error);
  });
});
