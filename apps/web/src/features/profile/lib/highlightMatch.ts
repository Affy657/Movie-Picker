export interface MatchSegment {
  text: string;
  matched: boolean;
}

function foldCharacter(character: string): string {
  const folded = character.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return folded.length === 1 ? folded.toLowerCase() : character.toLowerCase();
}

export function splitOnMatch(value: string, query: string): MatchSegment[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return [{ text: value, matched: false }];

  const characters = [...value];
  const foldedValue = characters.map(foldCharacter).join('');
  const foldedQuery = [...trimmedQuery].map(foldCharacter).join('');

  const start = foldedValue.indexOf(foldedQuery);
  if (start < 0) return [{ text: value, matched: false }];

  const end = start + [...foldedQuery].length;
  const segments: MatchSegment[] = [];
  if (start > 0) segments.push({ text: characters.slice(0, start).join(''), matched: false });
  segments.push({ text: characters.slice(start, end).join(''), matched: true });
  if (end < characters.length)
    segments.push({ text: characters.slice(end).join(''), matched: false });

  return segments;
}
