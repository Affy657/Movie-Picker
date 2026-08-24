export const SITE_URL = 'https://web.movie-picker.fr';

export const SITE_NAME = 'Movie Picker';

export const DEFAULT_DESCRIPTION =
  'Movie Picker — organisez une soirée cinéma : créez un événement, partagez le lien, proposez des films (TMDB), votez et tirez au sort le film gagnant.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export const DEFAULT_OG_IMAGE_ALT = 'Movie Picker — choisissez le film de la soirée ensemble';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${suffix}`;
}
