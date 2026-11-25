export const API_SOURCE_DIR = 'apps/api-dotnet/MoviePicker.Api/';
export const FRONT_ROUTES_CS = `${API_SOURCE_DIR}Application/FrontRoutes.cs`;
export const GENERIC_API_ERRORS_CS = `${API_SOURCE_DIR}Infrastructure/Web/GenericApiErrors.cs`;

const CONST_STRING_RE = /\bconst\s+string\s+\w+\s*=\s*"((?:[^"\\\n]|\\.)*)"\s*;/g;
const CSHARP_LITERAL_RE = /(?:\$@|@\$|\$|@)?"((?:[^"\\\n]|\\.)*)"/g;
const ROUTE_ATTRIBUTE_RE = /^\s*\[(?:Route|Http[A-Z]\w*)\s*\(/;

const constantValuesIn = (text) => [...text.matchAll(CONST_STRING_RE)].map(([, value]) => value);

export function frontPathsIn(frontRoutesText) {
  return constantValuesIn(frontRoutesText)
    .filter((value) => value.startsWith('/') && value !== '/')
    .map((value) => (value.includes(':') ? value.slice(0, value.indexOf(':')) : value));
}

function opensWith(literal, path) {
  if (!literal.startsWith(path)) return false;
  return (
    path.endsWith('/') || literal.length === path.length || '/?#'.includes(literal[path.length])
  );
}

function literalsByLine(text) {
  return text
    .split('\n')
    .flatMap((line, index) =>
      ROUTE_ATTRIBUTE_RE.test(line)
        ? []
        : [...line.matchAll(CSHARP_LITERAL_RE)].map(([, literal]) => ({ literal, line: index + 1 }))
    );
}

export function frontPathViolations(apiFiles, frontRoutesText) {
  const paths = frontPathsIn(frontRoutesText);
  if (paths.length === 0)
    return [
      `${FRONT_ROUTES_CS}: no front path found, the rule that keeps them in one place reads nothing`,
    ];
  const found = [];
  for (const [path, text] of apiFiles) {
    if (path === FRONT_ROUTES_CS) continue;
    for (const { literal, line } of literalsByLine(text)) {
      const route = paths.find((candidate) => opensWith(literal, candidate));
      if (route)
        found.push(
          `${path}:${line}: "${literal}" writes the front path ${route} again, build it from FrontRoutes (AGENTS.md, FrontRoutes)`
        );
    }
  }
  return found;
}

export function genericErrorMessageViolations(apiFiles, genericErrorsText) {
  const messages = new Set(constantValuesIn(genericErrorsText));
  if (messages.size === 0)
    return [
      `${GENERIC_API_ERRORS_CS}: no generic error message found, the rule that keeps them in one place reads nothing`,
    ];
  const found = [];
  for (const [path, text] of apiFiles) {
    if (path === GENERIC_API_ERRORS_CS) continue;
    for (const { literal, line } of literalsByLine(text))
      if (messages.has(literal))
        found.push(
          `${path}:${line}: "${literal}" writes a generic error message again, take it from GenericApiErrors (AGENTS.md, GenericApiErrors)`
        );
  }
  return found;
}
