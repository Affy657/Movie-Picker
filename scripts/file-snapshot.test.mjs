import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import fileSnapshot from './file-snapshot.cjs';

const { snapshotFile } = fileSnapshot;

function workspace(run) {
  const dir = mkdtempSync(join(tmpdir(), 'file-snapshot-'));
  try {
    const file = join(dir, 'generated.ts');
    writeFileSync(file, 'export const tests = 1;\n');
    run(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('snapshotFile', () => {
  it('puts back the content a later step rewrote', () => {
    workspace((file) => {
      const restore = snapshotFile(file);
      writeFileSync(file, 'export const tests = 2;\n');

      restore();

      assert.equal(readFileSync(file, 'utf8'), 'export const tests = 1;\n');
    });
  });

  it('recreates the file a later step deleted', () => {
    workspace((file) => {
      const restore = snapshotFile(file);
      rmSync(file);

      restore();

      assert.equal(readFileSync(file, 'utf8'), 'export const tests = 1;\n');
    });
  });

  it('leaves an unchanged file untouched', () => {
    workspace((file) => {
      const past = new Date('2020-01-01T00:00:00Z');
      utimesSync(file, past, past);
      const restore = snapshotFile(file);

      restore();

      assert.equal(statSync(file).mtimeMs, past.getTime());
    });
  });

  it('can be called again after a second rewrite', () => {
    workspace((file) => {
      const restore = snapshotFile(file);
      writeFileSync(file, 'export const tests = 2;\n');
      restore();
      writeFileSync(file, 'export const tests = 3;\n');

      restore();

      assert.equal(readFileSync(file, 'utf8'), 'export const tests = 1;\n');
    });
  });
});
