import { ExternalLink } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import {
  allocineUrl,
  imdbUrl,
  letterboxdUrl,
  tmdbPageUrl,
} from '@/features/movies/utils/movieExternalLinks';
import styles from './MovieExternalLinksRow.module.css';

interface MovieExternalLinksRowProps {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  year?: string;
}

export default function MovieExternalLinksRow({
  tmdbId,
  mediaType,
  title,
  year,
}: Readonly<MovieExternalLinksRowProps>) {
  const { t } = useTranslation();
  const links = [
    {
      href: letterboxdUrl(tmdbId, mediaType, title),
      label: t('movies.details.letterboxdShort'),
      aria: t('movies.list.letterboxdButton'),
    },
    {
      href: imdbUrl(title, year),
      label: t('movies.details.imdbShort'),
      aria: t('movies.list.imdbButton'),
    },
    {
      href: allocineUrl(title),
      label: t('movies.details.allocineShort'),
      aria: t('movies.list.allocineButton'),
    },
    {
      href: tmdbPageUrl(tmdbId, mediaType),
      label: t('movies.details.tmdbShort'),
      aria: t('movies.list.tmdbButton'),
    },
  ];

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>{t('movies.details.externalLinksLabel')}</p>
      <div className={styles.links}>
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={link.aria}
          >
            <ExternalLink aria-hidden size={13} />
            <span className={styles.linkLabel}>{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
