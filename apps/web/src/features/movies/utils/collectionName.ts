const REDUNDANT_SUFFIXES = [/\s*[-–—]\s*saga$/i, /(?:\s+|\s*[-–—]\s*)collection$/i];

export function collectionDisplayName(name: string): string {
  let trimmed = name.trim();
  for (const suffix of REDUNDANT_SUFFIXES) {
    const stripped = trimmed.replace(suffix, '').trim();
    if (stripped.length > 0) trimmed = stripped;
  }
  return trimmed;
}
