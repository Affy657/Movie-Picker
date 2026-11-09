import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import exportOpenapi from './export-openapi.cjs';

const { publishContract } = exportOpenapi;

function failure(code) {
  return Object.assign(new Error(code), { code });
}

function workspace(run) {
  const dir = mkdtempSync(join(tmpdir(), 'export-openapi-'));
  try {
    const staged = join(dir, 'staged.json');
    const published = join(dir, 'published.json');
    writeFileSync(staged, '{"openapi":"new"}');
    writeFileSync(published, '{"openapi":"old"}');
    run({ staged, published });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('publishContract', () => {
  it('replaces the previous contract with the staged one', () => {
    workspace(({ staged, published }) => {
      publishContract(staged, published);

      assert.equal(readFileSync(published, 'utf8'), '{"openapi":"new"}');
    });
  });

  it('waits for a process that holds the previous contract', () => {
    workspace(({ staged, published }) => {
      const waits = [];
      let refusals = 2;
      const write = (target, content) => {
        if (refusals-- > 0) throw failure('EBUSY');
        writeFileSync(target, content);
      };

      publishContract(staged, published, { write, wait: (ms) => waits.push(ms), delayMs: 7 });

      assert.equal(readFileSync(published, 'utf8'), '{"openapi":"new"}');
      assert.deepEqual(waits, [7, 7]);
    });
  });

  it('gives up when the contract is never released', () => {
    workspace(({ staged, published }) => {
      let calls = 0;
      const write = () => {
        calls++;
        throw failure('EBUSY');
      };

      assert.throws(
        () => publishContract(staged, published, { write, wait: () => {}, attempts: 3 }),
        { code: 'EBUSY' }
      );
      assert.equal(calls, 3);
    });
  });

  it('does not retry a failure that is not a sharing violation', () => {
    workspace(({ staged, published }) => {
      let calls = 0;
      const write = () => {
        calls++;
        throw failure('ENOSPC');
      };

      assert.throws(() => publishContract(staged, published, { write, wait: () => {} }), {
        code: 'ENOSPC',
      });
      assert.equal(calls, 1);
    });
  });
});
