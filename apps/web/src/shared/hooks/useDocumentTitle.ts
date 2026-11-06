export const APP_DOCUMENT_TITLE = 'Movie Picker';

export function pageTitle(segment: string): string {
  return `${segment} | ${APP_DOCUMENT_TITLE}`;
}
