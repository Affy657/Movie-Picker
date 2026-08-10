import { fetchApi } from '@/shared/api/client';
import type { MovieMediaType } from '@/shared/types/movie';

export interface LetterboxdImportCandidate {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
}

export interface LetterboxdImportRow {
  rowIndex: number;
  title: string;
  year: string;
  letterboxdSlug: string | null;
  alreadyInWatchlist: boolean;
  candidates: LetterboxdImportCandidate[];
}

export interface LetterboxdImportPreview {
  rows: LetterboxdImportRow[];
  totalParsed: number;
  totalTruncated: number;
}

export interface LetterboxdImportSelection {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  letterboxdSlug: string | null;
}

export interface LetterboxdImportConfirmResult {
  added: number;
  alreadyPresent: number;
}

export async function previewLetterboxdImport(csv: string): Promise<LetterboxdImportPreview> {
  return fetchApi<LetterboxdImportPreview>('/letterboxd-import/preview', {
    method: 'POST',
    body: JSON.stringify({ csv }),
  });
}

export async function previewLetterboxdImportFromAccount(): Promise<LetterboxdImportPreview> {
  return fetchApi<LetterboxdImportPreview>('/letterboxd-import/preview-from-account', {
    method: 'POST',
  });
}

export async function confirmLetterboxdImport(
  selections: LetterboxdImportSelection[]
): Promise<LetterboxdImportConfirmResult> {
  return fetchApi<LetterboxdImportConfirmResult>('/letterboxd-import/confirm', {
    method: 'POST',
    body: JSON.stringify({ selections }),
  });
}
