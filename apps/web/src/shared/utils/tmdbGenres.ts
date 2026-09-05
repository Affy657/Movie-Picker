interface GenreLabel {
  fr: string;
  en: string;
}

const TMDB_GENRES: Record<number, GenreLabel> = {
  28: { fr: 'Action', en: 'Action' },
  12: { fr: 'Aventure', en: 'Adventure' },
  16: { fr: 'Animation', en: 'Animation' },
  35: { fr: 'Comédie', en: 'Comedy' },
  80: { fr: 'Crime', en: 'Crime' },
  99: { fr: 'Documentaire', en: 'Documentary' },
  18: { fr: 'Drame', en: 'Drama' },
  10751: { fr: 'Familial', en: 'Family' },
  14: { fr: 'Fantastique', en: 'Fantasy' },
  36: { fr: 'Histoire', en: 'History' },
  27: { fr: 'Horreur', en: 'Horror' },
  10402: { fr: 'Musique', en: 'Music' },
  9648: { fr: 'Mystère', en: 'Mystery' },
  10749: { fr: 'Romance', en: 'Romance' },
  878: { fr: 'Science-fiction', en: 'Science Fiction' },
  10770: { fr: 'Téléfilm', en: 'TV Movie' },
  53: { fr: 'Thriller', en: 'Thriller' },
  10752: { fr: 'Guerre', en: 'War' },
  37: { fr: 'Western', en: 'Western' },
  10759: { fr: 'Action & Aventure', en: 'Action & Adventure' },
  10762: { fr: 'Enfants', en: 'Kids' },
  10763: { fr: 'Actualités', en: 'News' },
  10764: { fr: 'Téléréalité', en: 'Reality' },
  10765: { fr: 'Sci-Fi & Fantastique', en: 'Sci-Fi & Fantasy' },
  10766: { fr: 'Feuilleton', en: 'Soap' },
  10767: { fr: 'Talk', en: 'Talk' },
  10768: { fr: 'Guerre & Politique', en: 'War & Politics' },
};

export function genreLabel(genreId: number, locale: string): string {
  const entry = TMDB_GENRES[genreId];
  if (!entry) return locale.startsWith('fr') ? 'Autre' : 'Other';
  return locale.startsWith('fr') ? entry.fr : entry.en;
}
