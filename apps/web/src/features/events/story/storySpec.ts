import type { LocaleCode, Translate } from '@/shared/i18n';
import { ratingCountLabel } from '@/features/events/components/RatingNotes';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import type { EventData } from '@/features/events/types';
import type { EventParticipantSummary } from '@/shared/types/event';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { avatarUrl } from '@/shared/utils/avatar';
import { averageOfRatings, formatRating } from '@/shared/utils/formatRating';
import { formatEventDateLong } from '@/shared/utils/formatMyEventsListDate';
import { initialsOf } from '@/shared/utils/initials';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import type { StoryFamilyKey, StorySlide } from './storySlides';

export const MAX_STORY_ROWS = 9;
export const MAX_STORY_AVATARS = 4;

export type StoryRating = {
  ratingValue: number | null;
  ratingText: string | null;
  fallbackText: string;
};

export type StorySpecFilm = StoryRating & {
  title: string;
  year: string;
  posterSrc: string | null;
  countText: string | null;
};

export type StorySpecRow = StoryRating & {
  name: string;
  avatarSrc: string | null;
  initials: string;
  isHost: boolean;
  hostText: string;
};

export type StorySpecPeople = {
  label: string;
  avatars: Array<{ src: string | null; initials: string }>;
};

export type StoryImageSpec = {
  layout: StoryFamilyKey;
  title: string;
  date: string;
  footer: string;
  people: StorySpecPeople | null;
  theme: string | null;
  films: StorySpecFilm[];
  rows: StorySpecRow[];
  moreText: string | null;
};

export type StorySpecInput = {
  event: EventData;
  winners: readonly MovieData[];
  slide: StorySlide;
  scale: RatingScale;
  locale: LocaleCode;
  t: Translate;
};

function ratingTextOf(value: number | null, scale: RatingScale, locale: LocaleCode): string | null {
  return value === null ? null : formatRating(value, scale, locale, { decimals: 1 });
}

function avatarOf(participant: EventParticipantSummary): { src: string | null; initials: string } {
  return {
    src: participant.avatarId ? avatarUrl(participant.avatarId) : null,
    initials: initialsOf(participant.pseudo),
  };
}

function filmOf(
  movie: MovieData,
  scale: RatingScale,
  locale: LocaleCode,
  t: Translate
): StorySpecFilm {
  const average = averageOfRatings(movie.ratings);
  return {
    title: movie.title,
    year: movie.year,
    posterSrc: posterImageSrc(movie.posterPath) ?? null,
    ratingValue: average,
    ratingText: ratingTextOf(average, scale, locale),
    countText: average === null ? null : ratingCountLabel(movie.ratings?.length ?? 0, t),
    fallbackText: t('events.recap.share.noRating'),
  };
}

function rowsOf(
  movie: MovieData,
  event: EventData,
  scale: RatingScale,
  locale: LocaleCode,
  t: Translate
): { rows: StorySpecRow[]; moreText: string | null } {
  const byParticipant = new Map((movie.ratings ?? []).map((r) => [r.participantId, r.value]));
  const all: StorySpecRow[] = (event.participants ?? []).map((participant) => {
    const value = byParticipant.get(participant.id) ?? null;
    const avatar = avatarOf(participant);
    return {
      name: participant.pseudo,
      avatarSrc: avatar.src,
      initials: avatar.initials,
      isHost: !!participant.isCreator,
      hostText: t('events.participants.hostBadge'),
      ratingValue: value,
      ratingText: ratingTextOf(value, scale, locale),
      fallbackText: t('events.ratings.pending'),
    };
  });
  const rated = all
    .filter((row) => row.ratingValue !== null)
    .sort((a, b) => (b.ratingValue ?? 0) - (a.ratingValue ?? 0));
  const ordered = [...rated, ...all.filter((row) => row.ratingValue === null)];
  if (ordered.length <= MAX_STORY_ROWS) return { rows: ordered, moreText: null };
  const rows = ordered.slice(0, MAX_STORY_ROWS - 1);
  return {
    rows,
    moreText: t('events.recap.story.moreParticipants', { count: ordered.length - rows.length }),
  };
}

function peopleOf(event: EventData, t: Translate): StorySpecPeople {
  const participants = event.participants ?? [];
  const count = event.participantCount ?? participants.length;
  return {
    label: participantsCountLabel(count, t),
    avatars: participants.slice(0, MAX_STORY_AVATARS).map(avatarOf),
  };
}

export function storyImageSpec({
  event,
  winners,
  slide,
  scale,
  locale,
  t,
}: StorySpecInput): StoryImageSpec {
  const movies = slide.movie ? [slide.movie] : winners;
  const ratings = slide.family === 'ratings' && slide.movie ? slide.movie : null;
  const { rows, moreText } = ratings
    ? rowsOf(ratings, event, scale, locale, t)
    : { rows: [], moreText: null };

  return {
    layout: slide.family,
    title: event.title,
    date: formatEventDateLong(event.date, event.time, locale, t('events.detail.dateTimeJoiner'), {
      keepsake: true,
    }),
    footer: t('events.recap.story.footer'),
    people: slide.family === 'films' ? peopleOf(event, t) : null,
    theme: event.config?.theme?.trim() || null,
    films: movies.map((movie) => filmOf(movie, scale, locale, t)),
    rows,
    moreText,
  };
}
