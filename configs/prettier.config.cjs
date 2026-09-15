/** @type {import('prettier').Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  // 'auto' avoids Windows false positives (`core.autocrlf=true`) on `format:check`:
  // the Ubuntu CI stays on LF by default, and nobody is forced to disable autocrlf.
  endOfLine: 'auto',
};
