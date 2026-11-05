import { readCssToken } from '@/shared/utils/cssToken';
import { AVATAR_PALETTE_SIZE, avatarPaletteIndex } from '@/shared/utils/avatar';
import { drawBlurredPoster } from './storyBackdrop';
import { STORY_LOGO_SRC, type StoryAssets } from './storyAssets';
import {
  filmSlideLayout,
  filmsGrid,
  fitScale,
  fitTitle,
  posterHeightOf,
  ratingsLayout,
  ratingsRowsTop,
  ratingsScoreTop,
  splitRatingText,
  truncateLine,
  wrapLines,
  FILM_RATING_SIZE,
  NIGHT_LINE_HEIGHT,
  NIGHT_SIZE,
  STORY_CONTENT_BOTTOM,
  STORY_CONTENT_WIDTH,
  STORY_FOOT_CENTER_Y,
  STORY_HEIGHT,
  STORY_SAFE_TOP,
  STORY_SIDE,
  STORY_WIDTH,
  type FilmsGrid,
  type RatingsLayout,
} from './storyLayout';
import type { StoryImageSpec, StoryRating, StorySpecFilm, StorySpecRow } from './storySpec';

const STORY_COLOR_TOKENS = {
  ink: '--color-story-ink',
  soft: '--color-on-poster-fg-soft',
  star: '--color-story-star',
  starEmpty: '--color-on-poster-icon-muted',
  chipBg: '--color-story-chip-bg',
  chipText: '--color-story-chip-text',
  hostBg: '--color-story-host-bg',
  hostText: '--color-story-host-text',
  placeholder: '--color-story-placeholder',
  placeholderInk: '--color-story-placeholder-ink',
  rowLine: '--color-story-row-line',
  ground: '--color-story-ground',
  scrimTop: '--color-story-scrim-top',
  scrimMiddle: '--color-story-scrim-middle',
  scrimBottom: '--color-story-scrim-bottom',
  posterShadow: '--color-story-poster-shadow',
} as const;

type StoryPalette = Record<keyof typeof STORY_COLOR_TOKENS, string> & { avatars: string[] };

const palettes = new WeakMap<CanvasRenderingContext2D, StoryPalette>();

function readStoryPalette(): StoryPalette {
  const entries = Object.entries(STORY_COLOR_TOKENS).map(([key, token]) => [
    key,
    readCssToken(token),
  ]);
  const avatars = Array.from({ length: AVATAR_PALETTE_SIZE }, (_, index) =>
    readCssToken(`--color-avatar-${index}`)
  );
  return { ...Object.fromEntries(entries), avatars } as StoryPalette;
}

function colors(ctx: CanvasRenderingContext2D): StoryPalette {
  const palette = palettes.get(ctx) ?? readStoryPalette();
  palettes.set(ctx, palette);
  return palette;
}

const FONT = "'Overpass', system-ui, sans-serif";
const CAP_REFERENCE = 'H';
const AVATAR_SIZE = 56;
const AVATAR_OVERLAP = 16;
const MAX_TITLE_LINES = 2;
const CHIP_HEIGHT = 48;
const LOGO_SIZE = 66;
const LOGO_GAP = 24;
const FILM_POSTER_RADIUS = 36;
const FILM_TITLE_SIZES = [96, 84, 72, 60];
const RATINGS_TITLE_SIZES = [72, 62, 52];
const RATINGS_NIGHT_SIZE = 39;
const RATINGS_NIGHT_GAP = 18;
const RATINGS_HEAD_GAP = 42;
const RATINGS_TITLE_LEADING = 1.08;
const RATINGS_FALLBACK_SIZE = 56;
const ROW_VALUE_MIN_WIDTH = 138;
const STAR_STROKE = 0.0625;
const STAR_OUTER = 0.46;
const STAR_INNER = 0.48;
const STAR_GAP_RATIO = 0.125;
const LARGE_POSTER_SHADOW: PosterShadow = { blur: 132, offsetY: 54 };
const SMALL_POSTER_SHADOW: PosterShadow = { blur: 42, offsetY: 12 };

type PosterShadow = { blur: number; offsetY: number };

type Box = { x: number; y: number; width: number; height: number; radius: number };

type Font = { size: number; weight?: number; spacing?: string };

const NIGHT_FONT: Font = { size: NIGHT_SIZE, weight: 700 };
const CHIP_FONT: Font = { size: 26, weight: 700 };

type TextStyle = Font & {
  color: string;
  align?: CanvasTextAlign;
  baseline?: 'alphabetic' | 'middle';
  maxWidth?: number;
};

function tightened(size: number, ratio: number): string {
  return `${-size * ratio}px`;
}

function boldFont(size: number): Font {
  return { size, weight: 800, spacing: tightened(size, 0.02) };
}

function measureWith(ctx: CanvasRenderingContext2D, font: Font) {
  ctx.font = `${font.weight ?? 400} ${font.size}px ${FONT}`;
  ctx.letterSpacing = font.spacing ?? '0px';
  return (content: string) => ctx.measureText(content).width;
}

function textWidth(ctx: CanvasRenderingContext2D, content: string, font: Font): number {
  return measureWith(ctx, font)(content);
}

function textLines(
  ctx: CanvasRenderingContext2D,
  content: string,
  font: Font,
  maxWidth: number,
  maxLines: number
): string[] {
  return wrapLines(content, { maxWidth, maxLines, measure: measureWith(ctx, font) });
}

function fittedTitle(
  ctx: CanvasRenderingContext2D,
  content: string,
  sizes: readonly number[],
  maxWidth: number
) {
  return fitTitle(content, {
    sizes,
    maxWidth,
    maxLines: MAX_TITLE_LINES,
    measureAt: (size) => measureWith(ctx, boldFont(size)),
  });
}

function capCenterShift(ctx: CanvasRenderingContext2D, font: Font): number {
  measureWith(ctx, font);
  return ctx.measureText(CAP_REFERENCE).actualBoundingBoxAscent / 2;
}

function text(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  style: TextStyle
): number {
  const measure = measureWith(ctx, style);
  const line =
    style.maxWidth === undefined
      ? content
      : truncateLine(content, { maxWidth: style.maxWidth, measure });
  const shift = style.baseline === 'middle' ? capCenterShift(ctx, style) : 0;
  ctx.save();
  measureWith(ctx, style);
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(line, x, y + shift);
  ctx.restore();
  return measure(line);
}

function roundedPath(ctx: CanvasRenderingContext2D, box: Box): void {
  const { x, y, width, height } = box;
  const r = Math.min(box.radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRounded(ctx: CanvasRenderingContext2D, box: Box, color: string): void {
  ctx.fillStyle = color;
  roundedPath(ctx, box);
  ctx.fill();
}

function assetOf(src: string | null, assets: StoryAssets): CanvasImageSource | undefined {
  return src ? assets.get(src) : undefined;
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets
): void {
  ctx.fillStyle = colors(ctx).ground;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const poster = spec.films.map((film) => assetOf(film.posterSrc, assets)).find(Boolean);
  if (poster) drawBlurredPoster(ctx, poster);

  const scrim = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  scrim.addColorStop(0, colors(ctx).scrimTop);
  scrim.addColorStop(0.45, colors(ctx).scrimMiddle);
  scrim.addColorStop(1, colors(ctx).scrimBottom);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
}

function drawPoster(
  ctx: CanvasRenderingContext2D,
  src: string | null,
  assets: StoryAssets,
  box: Box,
  shadow: PosterShadow
): void {
  ctx.save();
  ctx.shadowColor = colors(ctx).posterShadow;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetY = shadow.offsetY;
  fillRounded(ctx, box, colors(ctx).placeholder);
  ctx.restore();

  const asset = assetOf(src, assets);
  if (asset) {
    ctx.save();
    roundedPath(ctx, box);
    ctx.clip();
    ctx.drawImage(asset, box.x, box.y, box.width, box.height);
    ctx.restore();
    return;
  }
  text(ctx, '🎞', box.x + box.width / 2, box.y + box.height / 2, {
    size: Math.round(box.width * 0.34),
    color: colors(ctx).placeholderInk,
    align: 'center',
    baseline: 'middle',
  });
}

type AvatarPlace = { x: number; y: number; size: number; ring: boolean };

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  src: string | null,
  assets: StoryAssets,
  initials: string,
  { x, y, size, ring }: AvatarPlace
): void {
  if (ring) {
    ctx.fillStyle = colors(ctx).ground;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const asset = assetOf(src, assets);
  if (asset) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(asset, x, y, size, size);
    ctx.restore();
    return;
  }
  const palette = colors(ctx);
  ctx.fillStyle = palette.avatars[avatarPaletteIndex(initials)] ?? palette.placeholder;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, initials, x + size / 2, y + size / 2, {
    size: Math.round(size * 0.44),
    weight: 700,
    color: palette.ink,
    align: 'center',
    baseline: 'middle',
  });
}

function starGap(size: number): number {
  return Math.round(size * STAR_GAP_RATIO);
}

function starsWidth(size: number): number {
  return 5 * size + 4 * starGap(size);
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const outer = size * STAR_OUTER;
  const inner = outer * STAR_INNER;
  const cx = x + size / 2;
  const cy = y + size / 2 + size * 0.02;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: number
): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * STAR_STROKE;
  ctx.strokeStyle = colors(ctx).starEmpty;
  starPath(ctx, x, y, size);
  ctx.stroke();
  if (fill > 0) {
    ctx.beginPath();
    ctx.rect(x, y, size * Math.min(fill, 1), size);
    ctx.clip();
    ctx.fillStyle = colors(ctx).star;
    ctx.strokeStyle = colors(ctx).star;
    starPath(ctx, x, y, size);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  size: number
): void {
  const gap = starGap(size);
  for (let i = 0; i < 5; i += 1) {
    drawStar(ctx, x + i * (size + gap), y, size, value / 2 - i);
  }
}

type RatingStyle = {
  size: number;
  starSize: number;
  countText: string | null;
  countSize: number;
};

type Rating = StoryRating & RatingStyle;

function isRated<T extends StoryRating>(
  rating: T
): rating is T & { ratingValue: number; ratingText: string } {
  return rating.ratingValue !== null && !!rating.ratingText;
}

function ratingWidth(ctx: CanvasRenderingContext2D, rating: Rating): number {
  if (!isRated(rating)) {
    return textWidth(ctx, rating.fallbackText, { size: rating.countSize, weight: 600 });
  }
  const gap = Math.round(rating.size * 0.35);
  let width = rating.starSize + gap + textWidth(ctx, rating.ratingText, boldFont(rating.size));
  if (rating.countText) {
    width += gap + textWidth(ctx, rating.countText, { size: rating.countSize, weight: 500 });
  }
  return width;
}

function drawRating(
  ctx: CanvasRenderingContext2D,
  rating: Rating,
  x: number,
  centerY: number
): void {
  if (!isRated(rating)) {
    text(ctx, rating.fallbackText, x, centerY, {
      size: rating.countSize,
      weight: 600,
      color: colors(ctx).soft,
      baseline: 'middle',
    });
    return;
  }
  const gap = Math.round(rating.size * 0.35);
  let cursor = x;
  drawStar(ctx, cursor, centerY - rating.starSize / 2, rating.starSize, 1);
  cursor += rating.starSize + gap;
  cursor +=
    text(ctx, rating.ratingText, cursor, centerY, {
      ...boldFont(rating.size),
      color: colors(ctx).ink,
      baseline: 'middle',
    }) + gap;
  if (rating.countText) {
    text(ctx, rating.countText, cursor, centerY, {
      size: rating.countSize,
      weight: 500,
      color: colors(ctx).soft,
      baseline: 'middle',
    });
  }
}

function nightLines(ctx: CanvasRenderingContext2D, title: string): string[] {
  return textLines(ctx, title, NIGHT_FONT, STORY_CONTENT_WIDTH, MAX_TITLE_LINES);
}

function drawNight(ctx: CanvasRenderingContext2D, lines: readonly string[]): number {
  let y = STORY_SAFE_TOP;
  for (const line of lines) {
    text(ctx, line, STORY_WIDTH / 2, y + NIGHT_LINE_HEIGHT / 2, {
      ...NIGHT_FONT,
      color: colors(ctx).soft,
      align: 'center',
      baseline: 'middle',
    });
    y += NIGHT_LINE_HEIGHT;
  }
  return y;
}

function drawFilmSlide(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets
): void {
  const film = spec.films[0];
  if (!film) return;
  const night = nightLines(ctx, spec.title);
  const title = fittedTitle(ctx, film.title, FILM_TITLE_SIZES, STORY_CONTENT_WIDTH);
  const layout = filmSlideLayout({
    nightLines: night.length,
    titleLines: title.lines.length,
    titleSize: title.size,
  });

  drawNight(ctx, night);
  drawPoster(
    ctx,
    film.posterSrc,
    assets,
    {
      x: (STORY_WIDTH - layout.posterWidth) / 2,
      y: layout.posterTop,
      width: layout.posterWidth,
      height: layout.posterHeight,
      radius: FILM_POSTER_RADIUS,
    },
    LARGE_POSTER_SHADOW
  );

  title.lines.forEach((line, index) => {
    const centerY = layout.titleTop + (index + 0.5) * layout.titleLineHeight;
    text(ctx, line, STORY_WIDTH / 2, centerY, {
      ...boldFont(title.size),
      color: colors(ctx).ink,
      align: 'center',
      baseline: 'middle',
    });
  });

  const rating: Rating = {
    ...film,
    size: FILM_RATING_SIZE,
    starSize: 66,
    countSize: 42,
  };
  const width = ratingWidth(ctx, rating);
  drawRating(ctx, rating, (STORY_WIDTH - width) / 2, layout.ratingCenterY);
}

function chipLabel(ctx: CanvasRenderingContext2D, label: string): string {
  return truncateLine(label, { maxWidth: 360, measure: measureWith(ctx, CHIP_FONT) });
}

function chipWidth(ctx: CanvasRenderingContext2D, label: string): number {
  return textWidth(ctx, chipLabel(ctx, label), CHIP_FONT) + 36;
}

function drawChip(ctx: CanvasRenderingContext2D, label: string, x: number, centerY: number): void {
  const cut = chipLabel(ctx, label);
  fillRounded(
    ctx,
    {
      x,
      y: centerY - CHIP_HEIGHT / 2,
      width: chipWidth(ctx, label),
      height: CHIP_HEIGHT,
      radius: CHIP_HEIGHT / 2,
    },
    colors(ctx).chipBg
  );
  text(ctx, cut, x + 18, centerY, {
    ...CHIP_FONT,
    color: colors(ctx).chipText,
    baseline: 'middle',
  });
}

function drawPeople(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets,
  top: number
): number {
  const people = spec.people;
  if (!people) return top;
  const labelFont: Font = { size: 32, weight: 600 };
  const avatarsWidth = people.avatars.length
    ? AVATAR_SIZE + (people.avatars.length - 1) * (AVATAR_SIZE - AVATAR_OVERLAP) + 22
    : 0;
  const themeWidth = spec.theme ? chipWidth(ctx, spec.theme) + 24 : 0;
  const rowWidth = avatarsWidth + textWidth(ctx, people.label, labelFont) + themeWidth;
  const centerY = top + AVATAR_SIZE / 2;

  let x = (STORY_WIDTH - rowWidth) / 2;
  people.avatars.forEach((avatar, index) => {
    drawAvatar(ctx, avatar.src, assets, avatar.initials, {
      x: x + index * (AVATAR_SIZE - AVATAR_OVERLAP),
      y: centerY - AVATAR_SIZE / 2,
      size: AVATAR_SIZE,
      ring: index > 0,
    });
  });
  x += avatarsWidth;
  x += text(ctx, people.label, x, centerY, {
    ...labelFont,
    color: colors(ctx).ink,
    baseline: 'middle',
  });
  if (spec.theme) drawChip(ctx, spec.theme, x + 24, centerY);
  return centerY + AVATAR_SIZE / 2;
}

function gridTitleFont(grid: FilmsGrid): Font {
  return { size: grid.titleSize, weight: 800 };
}

function gridTitleLines(
  ctx: CanvasRenderingContext2D,
  film: StorySpecFilm,
  grid: FilmsGrid
): string[] {
  return textLines(ctx, film.title, gridTitleFont(grid), grid.posterWidth, MAX_TITLE_LINES);
}

function filmHeight(grid: FilmsGrid, titleLineCount: number): number {
  const yearHeight = grid.showYear ? grid.yearSize + 8 : 0;
  return (
    posterHeightOf(grid.posterWidth) +
    28 +
    titleLineCount * Math.round(grid.titleSize * 1.15) +
    yearHeight +
    18 +
    Math.max(grid.ratingSize, grid.starSize)
  );
}

function ratingOf(film: StorySpecFilm, grid: FilmsGrid): Rating {
  return {
    ...film,
    size: grid.ratingSize,
    starSize: grid.starSize,
    countText: grid.showCount ? film.countText : null,
    countSize: grid.countSize,
  };
}

function fittedRating(ctx: CanvasRenderingContext2D, rating: Rating, room: number): Rating {
  return ratingWidth(ctx, rating) > room ? { ...rating, countText: null } : rating;
}

function drawFilm(
  ctx: CanvasRenderingContext2D,
  film: StorySpecFilm,
  assets: StoryAssets,
  grid: FilmsGrid,
  centerX: number,
  top: number,
  titleLineCount: number
): void {
  const posterHeight = posterHeightOf(grid.posterWidth);
  drawPoster(
    ctx,
    film.posterSrc,
    assets,
    {
      x: centerX - grid.posterWidth / 2,
      y: top,
      width: grid.posterWidth,
      height: posterHeight,
      radius: grid.posterRadius,
    },
    SMALL_POSTER_SHADOW
  );

  const lineHeight = Math.round(grid.titleSize * 1.15);
  const titleTop = top + posterHeight + 28;
  gridTitleLines(ctx, film, grid).forEach((line, index) => {
    text(ctx, line, centerX, titleTop + (index + 0.5) * lineHeight, {
      ...gridTitleFont(grid),
      color: colors(ctx).ink,
      align: 'center',
      baseline: 'middle',
    });
  });
  let y = titleTop + titleLineCount * lineHeight;
  if (grid.showYear) {
    y += grid.yearSize + 8;
    text(ctx, film.year, centerX, y, {
      size: grid.yearSize,
      weight: 500,
      color: colors(ctx).soft,
      align: 'center',
    });
  }

  const rating = fittedRating(ctx, ratingOf(film, grid), grid.posterWidth + grid.gapX);
  const width = ratingWidth(ctx, rating);
  const centerY = y + 18 + Math.max(grid.ratingSize, grid.starSize) / 2;
  drawRating(ctx, rating, centerX - width / 2, centerY);
}

function drawFilms(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets,
  top: number,
  bottom: number
): void {
  const grid = filmsGrid(spec.films.length);
  const rows: StorySpecFilm[][] = [];
  for (let i = 0; i < spec.films.length; i += grid.columns) {
    rows.push(spec.films.slice(i, i + grid.columns));
  }
  const titleLineCount = Math.max(
    ...spec.films.map((film) => gridTitleLines(ctx, film, grid).length)
  );
  const height = filmHeight(grid, titleLineCount);
  const totalHeight = rows.length * height + (rows.length - 1) * grid.gapY;
  const shrink = fitScale(totalHeight, bottom - top);
  let y = top + Math.max((bottom - top - totalHeight) / 2, 0);

  ctx.save();
  if (shrink < 1) {
    ctx.translate(STORY_WIDTH / 2, top);
    ctx.scale(shrink, shrink);
    ctx.translate(-STORY_WIDTH / 2, -top);
  }
  for (const row of rows) {
    const rowWidth = row.length * grid.posterWidth + (row.length - 1) * grid.gapX;
    let x = (STORY_WIDTH - rowWidth) / 2 + grid.posterWidth / 2;
    for (const film of row) {
      drawFilm(ctx, film, assets, grid, x, y, titleLineCount);
      x += grid.posterWidth + grid.gapX;
    }
    y += height + grid.gapY;
  }
  ctx.restore();
}

function drawFilmsSlide(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets
): void {
  const nightBottom = drawNight(ctx, nightLines(ctx, spec.title));
  const dateY = nightBottom + 24;
  text(ctx, spec.date, STORY_WIDTH / 2, dateY, {
    size: 30,
    weight: 500,
    color: colors(ctx).soft,
    align: 'center',
    baseline: 'middle',
    maxWidth: STORY_CONTENT_WIDTH,
  });
  const peopleBottom = drawPeople(ctx, spec, assets, dateY + 44);
  drawFilms(ctx, spec, assets, peopleBottom + 32, STORY_CONTENT_BOTTOM);
}

function drawRatingsHead(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  film: StorySpecFilm,
  assets: StoryAssets,
  layout: RatingsLayout
): void {
  const posterHeight = posterHeightOf(layout.posterWidth);
  drawPoster(
    ctx,
    film.posterSrc,
    assets,
    {
      x: STORY_SIDE,
      y: STORY_SAFE_TOP,
      width: layout.posterWidth,
      height: posterHeight,
      radius: layout.posterRadius,
    },
    SMALL_POSTER_SHADOW
  );

  const x = STORY_SIDE + layout.posterWidth + RATINGS_HEAD_GAP;
  const width = STORY_WIDTH - STORY_SIDE - x;
  const title = fittedTitle(ctx, film.title, RATINGS_TITLE_SIZES, width);
  const lineHeight = Math.round(title.size * RATINGS_TITLE_LEADING);
  const blockHeight = RATINGS_NIGHT_SIZE + RATINGS_NIGHT_GAP + title.lines.length * lineHeight;
  const blockTop = STORY_SAFE_TOP + (posterHeight - blockHeight) / 2;

  text(ctx, spec.title, x, blockTop + RATINGS_NIGHT_SIZE / 2, {
    size: RATINGS_NIGHT_SIZE,
    weight: 700,
    color: colors(ctx).soft,
    baseline: 'middle',
    maxWidth: width,
  });
  const titleTop = blockTop + RATINGS_NIGHT_SIZE + RATINGS_NIGHT_GAP;
  title.lines.forEach((line, index) => {
    text(ctx, line, x, titleTop + (index + 0.5) * lineHeight, {
      ...boldFont(title.size),
      color: colors(ctx).ink,
      baseline: 'middle',
    });
  });
}

function drawScoreValue(
  ctx: CanvasRenderingContext2D,
  ratingText: string,
  layout: RatingsLayout,
  centerY: number
): void {
  const { value, scale } = splitRatingText(ratingText);
  const valueFont: Font = {
    size: layout.scoreSize,
    weight: 800,
    spacing: tightened(layout.scoreSize, 0.03),
  };
  const scaleFont: Font = { size: layout.scaleSize, weight: 600 };
  const valueWidth = textWidth(ctx, value, valueFont);
  const left = (STORY_WIDTH - valueWidth - textWidth(ctx, scale, scaleFont)) / 2;
  const shift = capCenterShift(ctx, valueFont);
  text(ctx, value, left, centerY + shift, { ...valueFont, color: colors(ctx).ink });
  text(ctx, scale, left + valueWidth, centerY + shift, { ...scaleFont, color: colors(ctx).soft });
}

function drawScore(
  ctx: CanvasRenderingContext2D,
  film: StorySpecFilm,
  layout: RatingsLayout
): void {
  const top = ratingsScoreTop(layout);
  const centerY = top + layout.scoreSize / 2;
  if (isRated(film)) {
    drawScoreValue(ctx, film.ratingText, layout, centerY);
  } else {
    text(ctx, film.fallbackText, STORY_WIDTH / 2, centerY, {
      size: RATINGS_FALLBACK_SIZE,
      weight: 600,
      color: colors(ctx).soft,
      align: 'center',
      baseline: 'middle',
      maxWidth: STORY_CONTENT_WIDTH,
    });
  }
  drawStars(
    ctx,
    film.ratingValue ?? 0,
    (STORY_WIDTH - starsWidth(layout.scoreStarSize)) / 2,
    top + layout.scoreSize + layout.scoreStarGap,
    layout.scoreStarSize
  );
}

function rowValueFont(layout: RatingsLayout): Font {
  return { size: layout.rowTextSize, weight: 800 };
}

function rowFallbackFont(layout: RatingsLayout): Font {
  return { size: Math.round(layout.rowTextSize * 0.8), weight: 600 };
}

function rowValueWidth(
  ctx: CanvasRenderingContext2D,
  rows: readonly StorySpecRow[],
  layout: RatingsLayout
): number {
  const floor = (ROW_VALUE_MIN_WIDTH * layout.rowTextSize) / 48;
  const widths = rows.map((row) =>
    row.ratingText ? textWidth(ctx, row.ratingText, rowValueFont(layout)) : 0
  );
  return Math.max(floor, ...widths);
}

function drawRowName(
  ctx: CanvasRenderingContext2D,
  row: StorySpecRow,
  layout: RatingsLayout,
  x: number,
  centerY: number,
  room: number
): void {
  const badgeFont: Font = { size: Math.round(layout.rowTextSize * 0.6), weight: 700 };
  const badgeHeight = Math.round(layout.rowTextSize * 0.9);
  const badgeWidth = row.isHost ? textWidth(ctx, row.hostText, badgeFont) + 24 : 0;
  const drawnWidth = text(ctx, row.name, x, centerY, {
    size: layout.rowTextSize,
    weight: 600,
    color: colors(ctx).ink,
    baseline: 'middle',
    maxWidth: room - (badgeWidth ? badgeWidth + 12 : 0),
  });
  if (!badgeWidth) return;
  const badgeX = x + drawnWidth + 12;
  fillRounded(
    ctx,
    {
      x: badgeX,
      y: centerY - badgeHeight / 2,
      width: badgeWidth,
      height: badgeHeight,
      radius: badgeHeight / 2,
    },
    colors(ctx).hostBg
  );
  text(ctx, row.hostText, badgeX + 12, centerY, {
    ...badgeFont,
    color: colors(ctx).hostText,
    baseline: 'middle',
  });
}

function drawRowRating(
  ctx: CanvasRenderingContext2D,
  row: StorySpecRow,
  layout: RatingsLayout,
  starsX: number,
  centerY: number
): void {
  const right = STORY_WIDTH - STORY_SIDE;
  if (!isRated(row)) {
    text(ctx, row.fallbackText, right, centerY, {
      ...rowFallbackFont(layout),
      color: colors(ctx).soft,
      align: 'right',
      baseline: 'middle',
    });
    return;
  }
  drawStars(ctx, row.ratingValue, starsX, centerY - layout.rowStarSize / 2, layout.rowStarSize);
  text(ctx, row.ratingText, right, centerY, {
    ...rowValueFont(layout),
    color: colors(ctx).ink,
    align: 'right',
    baseline: 'middle',
  });
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  row: StorySpecRow,
  assets: StoryAssets,
  layout: RatingsLayout,
  top: number,
  valueWidth: number
): void {
  const right = STORY_WIDTH - STORY_SIDE;
  const centerY = top + layout.rowHeight / 2;

  ctx.strokeStyle = colors(ctx).rowLine;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(STORY_SIDE, top);
  ctx.lineTo(right, top);
  ctx.stroke();

  drawAvatar(ctx, row.avatarSrc, assets, row.initials, {
    x: STORY_SIDE,
    y: centerY - layout.avatarSize / 2,
    size: layout.avatarSize,
    ring: false,
  });

  const starsX = right - valueWidth - layout.rowGap - starsWidth(layout.rowStarSize);
  const nameX = STORY_SIDE + layout.avatarSize + layout.rowGap;
  const ratingLeft = isRated(row)
    ? starsX
    : right - textWidth(ctx, row.fallbackText, rowFallbackFont(layout));
  drawRowName(ctx, row, layout, nameX, centerY, ratingLeft - layout.rowGap - nameX);
  drawRowRating(ctx, row, layout, starsX, centerY);
}

function drawRatingsSlide(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets
): void {
  const film = spec.films[0];
  if (!film) return;
  const layout = ratingsLayout(spec.rows.length);
  drawRatingsHead(ctx, spec, film, assets, layout);
  drawScore(ctx, film, layout);

  const valueWidth = rowValueWidth(ctx, spec.rows, layout);
  let y = ratingsRowsTop(layout);
  for (const row of spec.rows) {
    drawRow(ctx, row, assets, layout, y, valueWidth);
    y += layout.rowHeight;
  }
  if (!spec.moreText) return;
  text(ctx, spec.moreText, STORY_SIDE, y + layout.moreHeight / 2, {
    size: Math.round(layout.rowTextSize * 0.8),
    weight: 500,
    color: colors(ctx).soft,
    baseline: 'middle',
  });
}

function drawFoot(ctx: CanvasRenderingContext2D, spec: StoryImageSpec, assets: StoryAssets): void {
  const logo = assets.get(STORY_LOGO_SRC);
  const font: Font = { size: 39, weight: 600 };
  const logoWidth = logo ? LOGO_SIZE + LOGO_GAP : 0;
  const line = truncateLine(spec.footer, {
    maxWidth: STORY_CONTENT_WIDTH - logoWidth,
    measure: measureWith(ctx, font),
  });
  const x = (STORY_WIDTH - logoWidth - textWidth(ctx, line, font)) / 2;
  if (logo) ctx.drawImage(logo, x, STORY_FOOT_CENTER_Y - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  text(ctx, line, x + logoWidth, STORY_FOOT_CENTER_Y, {
    ...font,
    color: colors(ctx).soft,
    baseline: 'middle',
  });
}

export function storySources(spec: StoryImageSpec): string[] {
  const sources = [
    STORY_LOGO_SRC,
    ...spec.films.map((film) => film.posterSrc),
    ...(spec.people?.avatars ?? []).map((avatar) => avatar.src),
    ...spec.rows.map((row) => row.avatarSrc),
  ];
  return [...new Set(sources.filter((src): src is string => !!src))];
}

const SLIDES = {
  films: drawFilmsSlide,
  film: drawFilmSlide,
  ratings: drawRatingsSlide,
} as const;

export function drawStory(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets
): void {
  palettes.set(ctx, readStoryPalette());
  drawGround(ctx, spec, assets);
  SLIDES[spec.layout](ctx, spec, assets);
  drawFoot(ctx, spec, assets);
}
