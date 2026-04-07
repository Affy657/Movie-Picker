import { TMDB_ATTRIBUTION_URL, TMDB_INDICATIVE_DISCLAIMER } from '../constants/tmdbIndicative';

interface TmdbIndicativeFooterProps {
  /** Si fourni (ex. réponse API recherche), prioritaire sur la constante locale. */
  disclaimer?: string;
  /** URL d’attribution (ex. champ API `tmdbAttributionUrl`). */
  tmdbUrl?: string;
  className?: string;
}

export default function TmdbIndicativeFooter({
  disclaimer,
  tmdbUrl,
  className,
}: TmdbIndicativeFooterProps) {
  const text = disclaimer?.trim() || TMDB_INDICATIVE_DISCLAIMER;
  const href = tmdbUrl?.trim() || TMDB_ATTRIBUTION_URL;
  return (
    <p className={className ?? 'tmdb-indicative-footer'}>
      {text}{' '}
      <a href={href} target="_blank" rel="noreferrer noopener">
        TMDB
      </a>
      .
    </p>
  );
}
