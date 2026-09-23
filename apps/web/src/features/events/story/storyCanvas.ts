import { STORY_LOGO_SRC, type StoryAssets } from './storyAssets';
import {
  filmsGrid,
  fitScale,
  posterHeightOf,
  truncateLine,
  wrapLines,
  STORY_HEIGHT,
  STORY_SAFE_BOTTOM,
  STORY_SAFE_TOP,
  STORY_SIDE,
  STORY_WIDTH,
  type FilmsGrid,
} from './storyLayout';
import type { StoryImageSpec, StoryRating, StorySpecFilm, StorySpecRow } from './storySpec';

const INK = '#f8fafc';
const MUTED = '#a3b1c6';
const ACCENT = '#93c5fd';
const STAR = '#fbbf24';
const STAR_DIM = 'rgba(251, 191, 36, 0.22)';
const CHIP_BG = 'rgba(147, 197, 253, 0.16)';
const CHIP_TEXT = '#bfdbfe';
const HOST_BG = 'rgba(99, 102, 241, 0.25)';
const HOST_TEXT = '#c7d2fe';
const PLACEHOLDER = '#1e293b';
const PLACEHOLDER_INK = '#94a3b8';
const ROW_LINE = 'rgba(255, 255, 255, 0.08)';
const STACK_RING = '#111631';

const FONT = "'Overpass', system-ui, sans-serif";
const CONTENT_WIDTH = STORY_WIDTH - STORY_SIDE * 2;
const QR_SIZE = 180;
const QR_PAD = 14;
const AVATAR_SIZE = 56;
const AVATAR_OVERLAP = 16;
const ROW_HEIGHT = 72;
const ROW_AVATAR = 58;
const MAX_TITLE_LINES = 2;
const CHIP_HEIGHT = 48;

type Font = { size: number; weight?: number; spacing?: string };

type TextStyle = Font & {
  color: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
};

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
  ctx.save();
  measureWith(ctx, style);
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align ?? 'left';
  ctx.textBaseline = style.baseline ?? 'alphabetic';
  ctx.fillText(line, x, y);
  ctx.restore();
  return measure(line);
}

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
): void {
  ctx.fillStyle = color;
  roundedPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const base = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  base.addColorStop(0, '#0a0f1c');
  base.addColorStop(0.58, '#111631');
  base.addColorStop(1, '#191a40');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const top = ctx.createRadialGradient(140, 180, 0, 140, 180, 500);
  top.addColorStop(0, 'rgba(37, 99, 235, 0.42)');
  top.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const bottom = ctx.createRadialGradient(
    STORY_WIDTH - 90,
    STORY_HEIGHT - 170,
    0,
    STORY_WIDTH - 90,
    STORY_HEIGHT - 170,
    550
  );
  bottom.addColorStop(0, 'rgba(109, 40, 217, 0.34)');
  bottom.addColorStop(1, 'rgba(109, 40, 217, 0)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
}

function assetOf(src: string | null, assets: StoryAssets): CanvasImageSource | undefined {
  return src ? assets.get(src) : undefined;
}

function drawPoster(
  ctx: CanvasRenderingContext2D,
  src: string | null,
  assets: StoryAssets,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const asset = assetOf(src, assets);
  if (asset) {
    ctx.save();
    roundedPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.drawImage(asset, x, y, width, height);
    ctx.restore();
    return;
  }
  fillRounded(ctx, x, y, width, height, radius, PLACEHOLDER);
  text(ctx, '🎞', x + width / 2, y + height / 2, {
    size: Math.round(width * 0.34),
    color: PLACEHOLDER_INK,
    align: 'center',
    baseline: 'middle',
  });
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  src: string | null,
  assets: StoryAssets,
  initials: string,
  x: number,
  y: number,
  size: number,
  ring: boolean
): void {
  if (ring) {
    ctx.fillStyle = STACK_RING;
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
  ctx.fillStyle = PLACEHOLDER;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, initials, x + size / 2, y + size / 2 + 1, {
    size: Math.round(size * 0.38),
    weight: 700,
    color: INK,
    align: 'center',
    baseline: 'middle',
  });
}

function starsWidth(size: number): number {
  return 5 * size + 4 * Math.round(size * 0.1);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: number
): void {
  const outer = size / 2;
  const inner = outer * 0.48;
  const cx = x + outer;
  const cy = y + outer;
  const path = () => {
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
  };
  ctx.fillStyle = STAR_DIM;
  path();
  ctx.fill();
  if (fill <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size * Math.min(fill, 1), size);
  ctx.clip();
  ctx.fillStyle = STAR;
  path();
  ctx.fill();
  ctx.restore();
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  size: number
): void {
  const gap = Math.round(size * 0.1);
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

function ratingWidth(ctx: CanvasRenderingContext2D, rating: Rating): number {
  if (rating.ratingValue === null || !rating.ratingText) {
    return textWidth(ctx, rating.fallbackText, { size: rating.countSize, weight: 600 });
  }
  const gap = Math.round(rating.size * 0.35);
  let width =
    starsWidth(rating.starSize) +
    gap +
    textWidth(ctx, rating.ratingText, { size: rating.size, weight: 800 });
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
  if (rating.ratingValue === null || !rating.ratingText) {
    text(ctx, rating.fallbackText, x, centerY, {
      size: rating.countSize,
      weight: 600,
      color: MUTED,
      baseline: 'middle',
    });
    return;
  }
  const gap = Math.round(rating.size * 0.35);
  let cursor = x;
  drawStars(ctx, rating.ratingValue, cursor, centerY - rating.starSize / 2, rating.starSize);
  cursor += starsWidth(rating.starSize) + gap;
  cursor +=
    text(ctx, rating.ratingText, cursor, centerY, {
      size: rating.size,
      weight: 800,
      color: INK,
      baseline: 'middle',
    }) + gap;
  if (rating.countText) {
    text(ctx, rating.countText, cursor, centerY, {
      size: rating.countSize,
      weight: 500,
      color: MUTED,
      baseline: 'middle',
    });
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  qr: CanvasImageSource | null | undefined,
  assets: StoryAssets
): number {
  const logo = assets.get(STORY_LOGO_SRC);
  let y = STORY_SAFE_TOP;
  const logoSize = 56;
  if (logo) ctx.drawImage(logo, STORY_SIDE, y, logoSize, logoSize);
  text(ctx, spec.brand, STORY_SIDE + logoSize + 16, y + logoSize / 2, {
    size: 40,
    weight: 800,
    color: INK,
    baseline: 'middle',
  });

  const qrX = STORY_WIDTH - STORY_SIDE - QR_SIZE;
  fillRounded(ctx, qrX, y, QR_SIZE, QR_SIZE, 22, '#ffffff');
  if (qr) ctx.drawImage(qr, qrX + QR_PAD, y + QR_PAD, QR_SIZE - QR_PAD * 2, QR_SIZE - QR_PAD * 2);
  text(ctx, spec.qr.caption, qrX + QR_SIZE / 2, y + QR_SIZE + 34, {
    size: 22,
    weight: 600,
    color: MUTED,
    align: 'center',
  });

  const maxWidth = qrX - STORY_SIDE - 48;
  y += logoSize + 46;
  text(ctx, spec.eyebrow.toLocaleUpperCase(), STORY_SIDE, y + 20, {
    size: 26,
    weight: 700,
    color: ACCENT,
    spacing: '3px',
  });

  y += 42;
  const titleFont: Font = { size: 72, weight: 800 };
  for (const line of textLines(ctx, spec.title, titleFont, maxWidth, MAX_TITLE_LINES)) {
    y += 80;
    text(ctx, line, STORY_SIDE, y, { ...titleFont, color: INK });
  }

  y += 62;
  text(ctx, spec.date, STORY_SIDE, y, { size: 34, weight: 500, color: MUTED, maxWidth });

  return y + 34;
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  label: string,
  edge: number,
  centerY: number,
  align: 'left' | 'right' = 'right'
): void {
  const font: Font = { size: 26, weight: 700 };
  const cut = truncateLine(label, { maxWidth: 360, measure: measureWith(ctx, font) });
  const width = textWidth(ctx, cut, font) + 36;
  const x = align === 'right' ? edge - width : edge;
  fillRounded(ctx, x, centerY - CHIP_HEIGHT / 2, width, CHIP_HEIGHT, CHIP_HEIGHT / 2, CHIP_BG);
  text(ctx, cut, x + 18, centerY + 1, { ...font, color: CHIP_TEXT, baseline: 'middle' });
}

function drawPeople(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets,
  top: number
): number {
  const people = spec.people;
  if (!people) return top;
  const centerY = top + 44 + AVATAR_SIZE / 2;
  let x = STORY_SIDE;
  people.avatars.forEach((avatar, index) => {
    drawAvatar(
      ctx,
      avatar.src,
      assets,
      avatar.initials,
      x,
      centerY - AVATAR_SIZE / 2,
      AVATAR_SIZE,
      index > 0
    );
    x += AVATAR_SIZE - AVATAR_OVERLAP;
  });
  x += AVATAR_OVERLAP + 22;
  text(ctx, people.label, x, centerY, { size: 32, weight: 600, color: INK, baseline: 'middle' });
  if (spec.theme) drawChip(ctx, spec.theme, STORY_WIDTH - STORY_SIDE, centerY);
  return centerY + AVATAR_SIZE / 2;
}

function filmHeight(grid: FilmsGrid): number {
  const yearHeight = grid.showYear ? grid.yearSize + 8 : 0;
  return (
    posterHeightOf(grid.posterWidth) +
    28 +
    grid.titleSize +
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

function drawFilm(
  ctx: CanvasRenderingContext2D,
  film: StorySpecFilm,
  assets: StoryAssets,
  grid: FilmsGrid,
  centerX: number,
  top: number
): void {
  const posterHeight = posterHeightOf(grid.posterWidth);
  drawPoster(
    ctx,
    film.posterSrc,
    assets,
    centerX - grid.posterWidth / 2,
    top,
    grid.posterWidth,
    posterHeight,
    grid.posterRadius
  );
  let y = top + posterHeight + 28 + grid.titleSize * 0.8;
  text(ctx, film.title, centerX, y, {
    size: grid.titleSize,
    weight: 800,
    color: INK,
    align: 'center',
    maxWidth: grid.posterWidth,
  });
  if (grid.showYear) {
    y += grid.yearSize + 8;
    text(ctx, film.year, centerX, y, {
      size: grid.yearSize,
      weight: 500,
      color: MUTED,
      align: 'center',
    });
  }

  const rating = ratingOf(film, grid);
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
  const height = filmHeight(grid);
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
      drawFilm(ctx, film, assets, grid, x, y);
      x += grid.posterWidth + grid.gapX;
    }
    y += height + grid.gapY;
  }
  ctx.restore();
}

function drawFilmHead(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets,
  top: number
): number {
  const film = spec.films[0];
  if (!film) return top;
  const posterWidth = 150;
  const posterHeight = posterHeightOf(posterWidth);
  const y = top + 44;
  drawPoster(ctx, film.posterSrc, assets, STORY_SIDE, y, posterWidth, posterHeight, 16);
  const x = STORY_SIDE + posterWidth + 34;
  const titleFont: Font = { size: 46, weight: 800 };
  const titleWidth = CONTENT_WIDTH - posterWidth - 34;
  let cursor = y + 46;
  for (const line of textLines(ctx, film.title, titleFont, titleWidth, MAX_TITLE_LINES)) {
    text(ctx, line, x, cursor, { ...titleFont, color: INK });
    cursor += 52;
  }
  text(ctx, film.year, x, cursor, { size: 30, weight: 500, color: MUTED });

  const ratingY = cursor + 42;
  drawRating(
    ctx,
    { ...film, size: 34, starSize: 28, countText: film.countText, countSize: 26 },
    x,
    ratingY
  );
  if (!spec.theme) return Math.max(y + posterHeight, ratingY + 24);
  const chipY = ratingY + 52;
  drawChip(ctx, spec.theme, x, chipY, 'left');
  return Math.max(y + posterHeight, chipY + CHIP_HEIGHT / 2);
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  row: StorySpecRow,
  assets: StoryAssets,
  top: number,
  first: boolean
): void {
  const centerY = top + ROW_HEIGHT / 2;
  if (!first) {
    ctx.strokeStyle = ROW_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(STORY_SIDE, top);
    ctx.lineTo(STORY_WIDTH - STORY_SIDE, top);
    ctx.stroke();
  }
  drawAvatar(
    ctx,
    row.avatarSrc,
    assets,
    row.initials,
    STORY_SIDE,
    centerY - ROW_AVATAR / 2,
    ROW_AVATAR,
    false
  );

  const rating: Rating = { ...row, size: 34, starSize: 28, countText: null, countSize: 28 };
  const valueWidth = ratingWidth(ctx, rating);
  const nameX = STORY_SIDE + ROW_AVATAR + 22;
  const badgeFont: Font = { size: 22, weight: 700 };
  const badgeWidth = row.isHost ? textWidth(ctx, row.hostText, badgeFont) + 24 : 0;
  const nameWidth =
    STORY_WIDTH - STORY_SIDE - valueWidth - 24 - nameX - (badgeWidth ? badgeWidth + 12 : 0);

  const nameStyle: TextStyle = {
    size: 34,
    weight: 600,
    color: INK,
    baseline: 'middle',
    maxWidth: nameWidth,
  };
  const drawnWidth = text(ctx, row.name, nameX, centerY, nameStyle);
  if (badgeWidth) {
    const badgeX = nameX + drawnWidth + 12;
    fillRounded(ctx, badgeX, centerY - 17, badgeWidth, 34, 17, HOST_BG);
    text(ctx, row.hostText, badgeX + 12, centerY + 1, {
      ...badgeFont,
      color: HOST_TEXT,
      baseline: 'middle',
    });
  }

  drawRating(ctx, rating, STORY_WIDTH - STORY_SIDE - valueWidth, centerY);
}

function drawRows(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets,
  top: number
): void {
  let y = top + 26;
  spec.rows.forEach((row, index) => {
    drawRow(ctx, row, assets, y, index === 0);
    y += ROW_HEIGHT;
  });
  if (!spec.moreText) return;
  text(ctx, spec.moreText, STORY_SIDE, y + 36, { size: 28, weight: 500, color: MUTED });
}

function drawFoot(ctx: CanvasRenderingContext2D, spec: StoryImageSpec): void {
  const y = STORY_HEIGHT - STORY_SAFE_BOTTOM - 20;
  text(ctx, spec.url, STORY_SIDE, y, { size: 30, weight: 600, color: INK, baseline: 'middle' });
  text(ctx, spec.footer, STORY_WIDTH - STORY_SIDE, y, {
    size: 26,
    weight: 500,
    color: MUTED,
    align: 'right',
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

export function drawStory(
  ctx: CanvasRenderingContext2D,
  spec: StoryImageSpec,
  assets: StoryAssets,
  qr?: CanvasImageSource | null
): void {
  drawBackground(ctx);
  const headBottom = drawHead(ctx, spec, qr, assets);
  const filmsBottom = STORY_HEIGHT - STORY_SAFE_BOTTOM - 70;

  if (spec.layout === 'ratings') {
    drawRows(ctx, spec, assets, drawFilmHead(ctx, spec, assets, headBottom));
  } else {
    drawFilms(ctx, spec, assets, drawPeople(ctx, spec, assets, headBottom), filmsBottom);
  }
  drawFoot(ctx, spec);
}
