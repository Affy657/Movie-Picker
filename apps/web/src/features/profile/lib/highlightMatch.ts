export interface MatchSegment {
  text: string;
  matched: boolean;
}

function foldCharacter(character: string): string {
  const folded = character.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return folded.length === 1 ? folded.toLowerCase() : character.toLowerCase();
}

function characterIndexAtOffset(foldedCharacters: readonly string[], offset: number): number {
  let foldedLength = 0;
  for (const [index, folded] of foldedCharacters.entries()) {
    foldedLength += folded.length;
    if (offset < foldedLength) return index;
  }
  return foldedCharacters.length;
}

export function splitOnMatch(value: string, query: string): MatchSegment[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return [{ text: value, matched: false }];

  const characters = [...value];
  const foldedCharacters = characters.map(foldCharacter);
  const foldedQuery = [...trimmedQuery].map(foldCharacter).join('');

  const matchOffset = foldedCharacters.join('').indexOf(foldedQuery);
  if (matchOffset < 0) return [{ text: value, matched: false }];

  const start = characterIndexAtOffset(foldedCharacters, matchOffset);
  const end = characterIndexAtOffset(foldedCharacters, matchOffset + foldedQuery.length - 1) + 1;
  const segments: MatchSegment[] = [];
  if (start > 0) segments.push({ text: characters.slice(0, start).join(''), matched: false });
  segments.push({ text: characters.slice(start, end).join(''), matched: true });
  if (end < characters.length)
    segments.push({ text: characters.slice(end).join(''), matched: false });

  return segments;
}
