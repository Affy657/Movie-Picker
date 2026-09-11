import type { MyEventWinnerMovie } from '@/features/events/types';

export const MAX_WINNER_POSTERS = 3;

export function winnerPosterPaths(winners: readonly MyEventWinnerMovie[]): string[] {
  return winners
    .map((w) => w.posterPath)
    .filter((path): path is string => !!path)
    .slice(0, MAX_WINNER_POSTERS);
}

export function winnerTitles(winners: readonly MyEventWinnerMovie[], locale: string): string {
  const titles = winners.map((w) => w.title).filter((title) => title.length > 0);
  if (titles.length === 0) return '';
  if (titles.length === 1) return titles[0]!;
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(titles);
}
