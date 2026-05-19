import { useEffect } from 'react';

export const APP_DOCUMENT_TITLE = 'Movie Picker';

export function pageTitle(segment: string): string {
  return `${segment} — ${APP_DOCUMENT_TITLE}`;
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
