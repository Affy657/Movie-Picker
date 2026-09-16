import clsx from 'clsx';
import { useTranslation } from '@/shared/i18n';
import styles from './TmdbAttribution.module.css';

const TMDB_URL = 'https://www.themoviedb.org/';

export default function TmdbAttribution({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();
  return (
    <p className={clsx(className ?? 'hint', styles.attribution)}>
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
