import { useEffect } from 'react';

/** Titre par défaut (aligné sur `index.html`). */
export const APP_DOCUMENT_TITLE = 'Movie Picker';

/** Titre d’onglet : segment descriptif + suffixe produit. */
export function pageTitle(segment: string): string {
  return `${segment} — ${APP_DOCUMENT_TITLE}`;
}

/** Met à jour `document.title` quand la route ou les données changent. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
