import { describe, expect, it } from 'vitest';
import { NOT_FOUND_DOCUMENT, notFoundDocumentPlugin } from './notFoundDocument';

interface EmittedAsset {
  type: string;
  fileName: string;
  source: string;
}

type GenerateBundle = (
  this: { emitFile: (file: EmittedAsset) => void; error: (message: string) => never },
  options: unknown,
  bundle: Record<string, unknown>
) => void;

function generate(bundle: Record<string, unknown>) {
  const emitted: EmittedAsset[] = [];
  const hook = notFoundDocumentPlugin().generateBundle as unknown as GenerateBundle;
  hook.call(
    {
      emitFile: (file) => emitted.push(file),
      error: (message) => {
        throw new Error(message);
      },
    },
    {},
    bundle
  );
  return emitted;
}

describe('notFoundDocumentPlugin', () => {
  it('emits the application shell as the page Hosting serves with a 404', () => {
    const shell = '<!doctype html><html><head><meta name="release" content="abc" /></head></html>';
    expect(generate({ 'index.html': { type: 'asset', source: shell } })).toEqual([
      { type: 'asset', fileName: '404.html', source: shell },
    ]);
    expect(NOT_FOUND_DOCUMENT).toBe('404.html');
  });

  it('fails the build when the shell is missing rather than publishing a site without its 404 page', () => {
    expect(() => generate({})).toThrow(/index\.html is missing from the bundle/);
  });
});
