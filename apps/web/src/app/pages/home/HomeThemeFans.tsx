import { Link } from 'react-router';
import InlineError from '@/shared/components/InlineError';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import MoviePreviewRow from '@/features/movies/components/MoviePreviewRow';
import { useShowcaseThemes } from '@/features/movies/hooks/useMovieShowcase';
import { THEME_KEYS, THEME_LABEL_KEYS } from '@/features/movies/showcaseSections';
import type { ShowcaseTheme, ShowcaseThemePreview } from '@/features/movies/api/showcaseApi';
import PosterFan from '@/features/events/components/PosterFan';
import styles from './HomeThemeFans.module.css';

const SKELETON_FANS = 5;

function orderedThemes(previews: ShowcaseThemePreview[]) {
  const byTheme = new Map(previews.map((preview) => [preview.theme, preview.posters]));
  return THEME_KEYS.flatMap((theme: ShowcaseTheme) => {
    const posters = (byTheme.get(theme) ?? []).filter((poster) =>
      posterImageSrc(poster.posterPath)
    );
    return posters.length > 0 ? [{ theme, posters }] : [];
  });
}

export default function HomeThemeFans() {
  const { t } = useTranslation();
  const themes = useShowcaseThemes();
  const items = orderedThemes(themes.data ?? []);

  if (themes.isSuccess && items.length === 0) return null;

  let body;
  if (themes.isPending) {
    body = (
      <SkeletonScreen label={t('showcase.loading')}>
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_FANS }, (_, index) => (
            <Skeleton key={index} variant="block" height="var(--space-24)" />
          ))}
        </div>
      </SkeletonScreen>
    );
  } else if (themes.isError) {
    body = (
      <InlineError
        message={t('showcase.error')}
        retryLabel={t('showcase.retry')}
        onRetry={() => void themes.refetch()}
        messageRole="status"
      />
    );
  } else {
    body = (
      <ul className={styles.grid}>
        {items.map(({ theme, posters }) => (
          <li key={theme}>
            <Link to={ROUTES.showcaseTheme(theme)} className={styles.themeLink}>
              <PosterFan posters={posters} className={styles.fan} />
              <span className={styles.name}>{t(THEME_LABEL_KEYS[theme])}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <MoviePreviewRow
      heading={t('showcase.sections.themeTitle')}
      subtitle={t('showcase.themeSubtitle')}
    >
      {body}
    </MoviePreviewRow>
  );
}
