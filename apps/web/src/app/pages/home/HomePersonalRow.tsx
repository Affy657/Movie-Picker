import { useTranslation, type TranslationKey } from '@/shared/i18n';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
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
  eagerCount?: number;
  library: MovieLibraryActions;
  onSelect: (item: PersonalRowItem) => void;
}

function toCardItem(item: PersonalRowItem): MovieBrowseCardItem {
  return {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType ?? 'movie',
    title: item.title,
    year: item.meta,
    posterPath: item.posterPath,
  };
}

export default function HomePersonalRow({
  headingKey,
  seeAllTo,
  seeAllLabel,
  items,
  isPending,
  eagerCount = 0,
  library,
  onSelect,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (isPending || items.length === 0) return null;

  return (
    <MoviePreviewRow heading={t(headingKey)} seeAllTo={seeAllTo} seeAllLabel={seeAllLabel}>
      <MoviePreviewRail size="md" itemCount={items.length}>
        {items.map((item, index) => {
          const cardItem = toCardItem(item);
          return (
            <MovieBrowseCard
              key={`${cardItem.tmdbId}|${cardItem.mediaType}`}
              item={cardItem}
              meta={item.meta}
              eager={index < eagerCount}
              hasHover={library.hasHover}
              isLoggedIn={library.isLoggedIn}
              inWatchlist={library.has(cardItem)}
              onToggleWatchlist={() => library.toggle(cardItem)}
              onProposeToEvent={() => library.propose(cardItem)}
              onOpenDetails={() => onSelect(item)}
            />
          );
        })}
      </MoviePreviewRail>
    </MoviePreviewRow>
  );
}
