import { fetchApi } from '@/shared/api/client';
import type { MovieMediaType } from '@/shared/types/movie';

export interface LetterboxdCandidate {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
}

export interface LetterboxdPendingChoice {
  rowIndex: number;
  title: string;
  year: string;
  letterboxdSlug: string | null;
  candidates: LetterboxdCandidate[];
}

export interface LetterboxdSyncReport {
  skipped: boolean;
  added: number;
  removed: number;
  unmatchedTitles: string[];
  pendingChoices: LetterboxdPendingChoice[];
  totalOnLetterboxd: number;
  totalTruncated: number;
}

export interface LetterboxdSelection {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  letterboxdSlug: string | null;
}

export interface LetterboxdConfirmResult {
  added: number;
  alreadyPresent: number;
}

export async function syncLetterboxd(force: boolean): Promise<LetterboxdSyncReport> {
  return fetchApi<LetterboxdSyncReport>(`/letterboxd/sync?force=${force ? 'true' : 'false'}`, {
    method: 'POST',
  });
}

export async function confirmLetterboxdChoices(
  selections: LetterboxdSelection[]
): Promise<LetterboxdConfirmResult> {
  return fetchApi<LetterboxdConfirmResult>('/letterboxd/confirm', {
    method: 'POST',
    body: JSON.stringify({ selections }),
  });
}
