import { useTranslation } from '@/shared/i18n';

const TMDB_URL = 'https://www.themoviedb.org/';

/**
 * Mini attribution TMDB (texte + lien). Affichée sous toute liste de films
 * issus de TMDB pour respecter les conditions d'utilisation de l'API
 * (« You shall provide attribution to TMDB […] in any application that uses
 * the TMDB API »). Volontairement minimaliste : pas de disclaimer long ici,
 * la note d'aide « TMDB » sur la valeur reste consultable au survol.
 */
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
