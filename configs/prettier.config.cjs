/** @type {import('prettier').Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  // 'auto' évite les faux positifs Windows (`core.autocrlf=true`) sur `format:check` :
  // la CI Ubuntu reste en LF par défaut, et personne n'est forcé de désactiver autocrlf.
  endOfLine: 'auto',
};
