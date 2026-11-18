const ALLOWED_COMMENT =
  /^(?:\{?\/\*+|\/\/+)\s*(eslint|stylelint|@ts-|ts-expect|prettier-ignore|<reference|!|#!|Copyright|SPDX)/i;

export function commentViolations(path, text) {
  const found = [];
  let inBlock = false;
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      found.push(`${path}:${index + 1} forbidden comment`);
      return;
    }
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('{/*')) {
      if (ALLOWED_COMMENT.test(line)) return;
      if (line.startsWith('/*') && !line.includes('*/')) inBlock = true;
      if (line.startsWith('{/*') && !line.includes('*/')) inBlock = true;
      found.push(`${path}:${index + 1} forbidden comment`);
    }
  });
  return found;
}
