import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MoviePosterCard from '@/features/movies/components/MoviePosterCard';
import type { MovieMediaType } from '@/shared/types/movie';

export interface PersonalRowItem {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  meta: string;
  posterPath: string | null;
}

interface Props {
  headingKey: TranslationKey;
  seeAllTo?: string;
  seeAllLabel?: string;
  items: PersonalRowItem[];
  isPending: boolean;
  onSelect: (item: PersonalRowItem) => void;
}

export default function HomePersonalRow({
  headingKey,
  seeAllTo,
  seeAllLabel,
  items,
  isPending,
  onSelect,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (isPending || items.length === 0) return null;

  return (
    <MoviePreviewRow heading={t(headingKey)} seeAllTo={seeAllTo} seeAllLabel={seeAllLabel}>
      <MoviePreviewRail size="md" itemCount={items.length}>
        {items.map((item) => (
          <MoviePosterCard
            key={`${item.tmdbId}|${item.mediaType ?? 'movie'}`}
            title={item.title}
            meta={item.meta}
            posterSrc={tmdbPosterSrcForListDisplay(posterImageSrc(item.posterPath))}
            onSelect={() => onSelect(item)}
            selectLabel={item.title}
          />
        ))}
      </MoviePreviewRail>
    </MoviePreviewRow>
  );
}
