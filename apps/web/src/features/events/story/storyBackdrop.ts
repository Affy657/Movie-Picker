import { POSTER_RATIO, STORY_HEIGHT, STORY_WIDTH } from './storyLayout';

const SHRINK_WIDTHS = [256, 128, 64, 32];
const GROW_WIDTHS = [64, 128, 256];
const SOFTEN_SHIFTS = [2, 1, -2, -1, 2, 1, -2, -1];
const SOFTEN_ALPHA = 0.5;
const VISIBLE_HEIGHT_SHARE = 0.78;
const GROUND_OPACITY = 0.7;

export type GroundCrop = { x: number; y: number; width: number; height: number };

export function groundCrop(sourceWidth: number, sourceHeight: number): GroundCrop {
  const height = sourceHeight * VISIBLE_HEIGHT_SHARE;
  const width = (height * STORY_WIDTH) / STORY_HEIGHT;
  return { x: (sourceWidth - width) / 2, y: (sourceHeight - height) / 2, width, height };
}

function resampled(source: CanvasImageSource, width: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width * POSTER_RATIO);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function release(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

function chained(start: CanvasImageSource, widths: readonly number[]): HTMLCanvasElement | null {
  let layer: HTMLCanvasElement | null = null;
  for (const width of widths) {
    const next = resampled(layer ?? start, width);
    if (layer) release(layer);
    if (!next) return null;
    layer = next;
  }
  return layer;
}

function soften(layer: HTMLCanvasElement): void {
  const ctx = layer.getContext('2d');
  if (!ctx) return;
  ctx.globalAlpha = SOFTEN_ALPHA;
  for (const shift of SOFTEN_SHIFTS) ctx.drawImage(layer, shift, 0);
  for (const shift of SOFTEN_SHIFTS) ctx.drawImage(layer, 0, shift);
}

function blurredLayer(poster: CanvasImageSource): HTMLCanvasElement | null {
  const smallest = chained(poster, SHRINK_WIDTHS);
  if (!smallest) return null;
  soften(smallest);
  const grown = chained(smallest, GROW_WIDTHS);
  release(smallest);
  return grown;
}

export function drawBlurredPoster(ctx: CanvasRenderingContext2D, poster: CanvasImageSource): void {
  const layer = blurredLayer(poster);
  if (!layer) return;
  const crop = groundCrop(layer.width, layer.height);
  ctx.save();
  ctx.globalAlpha = GROUND_OPACITY;
  ctx.drawImage(layer, crop.x, crop.y, crop.width, crop.height, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  ctx.restore();
  release(layer);
}
