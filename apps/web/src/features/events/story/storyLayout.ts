export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 250;
export const STORY_SIDE = 72;
export const STORY_CONTENT_WIDTH = STORY_WIDTH - STORY_SIDE * 2;
export const STORY_CONTENT_BOTTOM = STORY_HEIGHT - STORY_SAFE_BOTTOM;
export const STORY_FOOT_CENTER_Y = 1812;

const ELLIPSIS = '…';

export type Measure = (text: string) => number;

type WrapOptions = { maxWidth: number; maxLines: number; measure: Measure };

export function truncateLine(text: string, { maxWidth, measure }: Omit<WrapOptions, 'maxLines'>) {
  if (measure(text) <= maxWidth) return text;
  return withEllipsis(text, maxWidth, measure);
}

function withEllipsis(text: string, maxWidth: number, measure: Measure): string {
  let cut = text.trimEnd();
  while (cut.length > 1 && measure(cut + ELLIPSIS) > maxWidth) cut = cut.slice(0, -1);
  return cut.trimEnd() + ELLIPSIS;
}

export function wrapLines(text: string, { maxWidth, maxLines, measure }: WrapOptions): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);

  const kept = lines.slice(0, maxLines);
  const cutShort = kept.join(' ') !== words.join(' ');
  return kept.map((line, index) =>
    measure(line) > maxWidth || (cutShort && index === kept.length - 1)
      ? withEllipsis(line, maxWidth, measure)
      : line
  );
}

type FitOptions = {
  sizes: readonly number[];
  maxWidth: number;
  maxLines: number;
  measureAt: (size: number) => Measure;
};

export type FittedTitle = { size: number; lines: string[] };

export function fitTitle(text: string, options: FitOptions): FittedTitle {
  const { sizes, maxWidth, maxLines, measureAt } = options;
  const whole = text.trim().replaceAll(/\s+/g, ' ');
  let fitted: FittedTitle = { size: 0, lines: [] };
  for (const size of sizes) {
    fitted = { size, lines: wrapLines(text, { maxWidth, maxLines, measure: measureAt(size) }) };
    if (fitted.lines.join(' ') === whole) break;
  }
  return fitted;
}

export function splitRatingText(text: string): { value: string; scale: string } {
  const slash = text.lastIndexOf('/');
  if (slash < 0) return { value: text, scale: '' };
  return { value: text.slice(0, slash), scale: text.slice(slash) };
}

export const POSTER_RATIO = 1.5;

export function posterHeightOf(width: number): number {
  return Math.round(width * POSTER_RATIO);
}

export function fitScale(total: number, available: number): number {
  if (total <= 0 || available <= 0 || total <= available) return 1;
  return available / total;
}

export type FilmsGrid = {
  columns: number;
  posterWidth: number;
  posterRadius: number;
  titleSize: number;
  yearSize: number;
  ratingSize: number;
  countSize: number;
  starSize: number;
  gapX: number;
  gapY: number;
  showYear: boolean;
  showCount: boolean;
};

const GRIDS: Array<{ upTo: number; grid: FilmsGrid }> = [
  {
    upTo: 2,
    grid: {
      columns: 2,
      posterWidth: 420,
      posterRadius: 24,
      titleSize: 36,
      yearSize: 26,
      ratingSize: 32,
      countSize: 24,
      starSize: 30,
      gapX: 40,
      gapY: 44,
      showYear: true,
      showCount: true,
    },
  },
  {
    upTo: 3,
    grid: {
      columns: 3,
      posterWidth: 288,
      posterRadius: 18,
      titleSize: 28,
      yearSize: 22,
      ratingSize: 26,
      countSize: 20,
      starSize: 24,
      gapX: 24,
      gapY: 40,
      showYear: true,
      showCount: true,
    },
  },
  {
    upTo: 6,
    grid: {
      columns: 3,
      posterWidth: 226,
      posterRadius: 16,
      titleSize: 24,
      yearSize: 20,
      ratingSize: 22,
      countSize: 18,
      starSize: 20,
      gapX: 30,
      gapY: 28,
      showYear: false,
      showCount: true,
    },
  },
];

const WIDE_GRID: FilmsGrid = {
  columns: 5,
  posterWidth: 166,
  posterRadius: 12,
  titleSize: 20,
  yearSize: 18,
  ratingSize: 18,
  countSize: 16,
  starSize: 16,
  gapX: 20,
  gapY: 30,
  showYear: false,
  showCount: false,
};

export function filmsGrid(count: number): FilmsGrid {
  return GRIDS.find((entry) => count <= entry.upTo)?.grid ?? WIDE_GRID;
}

export const NIGHT_SIZE = 42;
export const NIGHT_LINE_HEIGHT = 50;
export const FILM_RATING_SIZE = 84;

const FILM_POSTER_HEIGHT = 1044;
const FILM_POSTER_GAP = 48;
const FILM_TITLE_GAP = 54;
const FILM_RATING_GAP = 36;
const FILM_TITLE_LEADING = 1.05;

export type FilmSlideLayout = {
  posterTop: number;
  posterWidth: number;
  posterHeight: number;
  titleTop: number;
  titleLineHeight: number;
  ratingCenterY: number;
};

type FilmSlideParts = { nightLines: number; titleLines: number; titleSize: number };

export function filmSlideLayout({
  nightLines,
  titleLines,
  titleSize,
}: FilmSlideParts): FilmSlideLayout {
  const posterTop = STORY_SAFE_TOP + nightLines * NIGHT_LINE_HEIGHT + FILM_POSTER_GAP;
  const titleLineHeight = Math.round(titleSize * FILM_TITLE_LEADING);
  const titleHeight = titleLines * titleLineHeight;
  const below = FILM_TITLE_GAP + titleHeight + FILM_RATING_GAP + FILM_RATING_SIZE;
  const posterHeight = Math.min(FILM_POSTER_HEIGHT, STORY_CONTENT_BOTTOM - posterTop - below);
  const titleTop = posterTop + posterHeight + FILM_TITLE_GAP;
  return {
    posterTop,
    posterWidth: Math.round(posterHeight / POSTER_RATIO),
    posterHeight,
    titleTop,
    titleLineHeight,
    ratingCenterY: titleTop + titleHeight + FILM_RATING_GAP + FILM_RATING_SIZE / 2,
  };
}

export type RatingsLayout = {
  posterWidth: number;
  posterRadius: number;
  headGap: number;
  scoreSize: number;
  scaleSize: number;
  scoreStarSize: number;
  scoreStarGap: number;
  listGap: number;
  rowHeight: number;
  avatarSize: number;
  rowTextSize: number;
  rowStarSize: number;
  rowGap: number;
  moreHeight: number;
};

const RATINGS_TIERS: Array<{ upTo: number; layout: RatingsLayout }> = [
  {
    upTo: 4,
    layout: {
      posterWidth: 216,
      posterRadius: 18,
      headGap: 60,
      scoreSize: 228,
      scaleSize: 72,
      scoreStarSize: 66,
      scoreStarGap: 18,
      listGap: 46,
      rowHeight: 168,
      avatarSize: 108,
      rowTextSize: 48,
      rowStarSize: 48,
      rowGap: 36,
      moreHeight: 60,
    },
  },
  {
    upTo: 6,
    layout: {
      posterWidth: 186,
      posterRadius: 16,
      headGap: 48,
      scoreSize: 196,
      scaleSize: 62,
      scoreStarSize: 58,
      scoreStarGap: 16,
      listGap: 40,
      rowHeight: 130,
      avatarSize: 92,
      rowTextSize: 44,
      rowStarSize: 42,
      rowGap: 30,
      moreHeight: 56,
    },
  },
];

const CROWDED_RATINGS: RatingsLayout = {
  posterWidth: 156,
  posterRadius: 14,
  headGap: 40,
  scoreSize: 150,
  scaleSize: 50,
  scoreStarSize: 46,
  scoreStarGap: 12,
  listGap: 30,
  rowHeight: 100,
  avatarSize: 76,
  rowTextSize: 38,
  rowStarSize: 36,
  rowGap: 24,
  moreHeight: 52,
};

export function ratingsLayout(rowCount: number): RatingsLayout {
  return RATINGS_TIERS.find((entry) => rowCount <= entry.upTo)?.layout ?? CROWDED_RATINGS;
}

export function ratingsScoreTop(layout: RatingsLayout): number {
  return STORY_SAFE_TOP + posterHeightOf(layout.posterWidth) + layout.headGap;
}

export function ratingsRowsTop(layout: RatingsLayout): number {
  return (
    ratingsScoreTop(layout) +
    layout.scoreSize +
    layout.scoreStarGap +
    layout.scoreStarSize +
    layout.listGap
  );
}
