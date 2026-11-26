import type { Plugin } from 'vite';

export const NOT_FOUND_DOCUMENT = '404.html';

export function notFoundDocumentPlugin(): Plugin {
  return {
    name: 'moviepicker-not-found-document',
    apply: (config, { command }) => command === 'build' && !config.build?.ssr,
    enforce: 'post',
    generateBundle(_options, bundle) {
      const shell = bundle['index.html'];
      if (shell?.type !== 'asset') {
        this.error('index.html is missing from the bundle: no 404 document to derive');
      }
      this.emitFile({ type: 'asset', fileName: NOT_FOUND_DOCUMENT, source: shell.source });
    },
  };
}
