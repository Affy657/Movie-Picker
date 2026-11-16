export const LIST_NAME_MAX_LENGTH = 60;

export const LIST_DESCRIPTION_MAX_LENGTH = 300;

const RESERVED_LIST_NAMES = ['À voir', 'Watchlist', 'Films vus', 'Watched'];

export function normalizeListName(name: string): string {
  return name
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function isListNameTaken(
  name: string,
  existingNames: readonly string[],
  ownName?: string
): boolean {
  const candidate = normalizeListName(name);
  if (!candidate) return false;
  if (ownName !== undefined && normalizeListName(ownName) === candidate) return false;
  return [...RESERVED_LIST_NAMES, ...existingNames].some(
    (existing) => normalizeListName(existing) === candidate
  );
}
