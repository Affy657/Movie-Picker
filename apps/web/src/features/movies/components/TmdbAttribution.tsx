import { useTranslation } from '@/shared/i18n';

const TMDB_URL = 'https://www.themoviedb.org/';

export default function TmdbAttribution({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={className ?? 'hint'} style={{ marginTop: '0.75rem', textAlign: 'right' }}>
      {t('movies.tmdb.attributionPrefix')}{' '}
      <a
        href={TMDB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('movies.tmdb.attributionLinkAria')}
      >
        {t('movies.tmdb.attributionLinkLabel')}
      </a>
    </p>
  );
}
