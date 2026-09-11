const SEPARATOR = String.raw`[\s\-–—]`;
const REDUNDANT_SUFFIXES = [
  new RegExp(`${SEPARATOR}*[-–—]${SEPARATOR}*saga$`, 'i'),
  new RegExp(`${SEPARATOR}+collection$`, 'i'),
];

export function collectionDisplayName(name: string): string {
  let trimmed = name.trim();
  for (const suffix of REDUNDANT_SUFFIXES) {
    const stripped = trimmed.replace(suffix, '').trim();
    if (stripped.length > 0) trimmed = stripped;
  }
  return trimmed;
}
