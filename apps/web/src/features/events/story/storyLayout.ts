export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 250;
export const STORY_SIDE = 84;

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
  const last = kept.at(-1);
  if (last !== undefined && (kept.join(' ') !== words.join(' ') || measure(last) > maxWidth)) {
    kept[kept.length - 1] = withEllipsis(last, maxWidth, measure);
  }
  return kept;
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
    upTo: 1,
    grid: {
      columns: 1,
      posterWidth: 456,
      posterRadius: 24,
      titleSize: 46,
      yearSize: 30,
      ratingSize: 40,
      countSize: 30,
      starSize: 40,
      gapX: 40,
      gapY: 44,
      showYear: true,
      showCount: true,
    },
  },
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
