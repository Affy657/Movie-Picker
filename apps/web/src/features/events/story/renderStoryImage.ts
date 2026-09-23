import { loadStoryAssets, svgElementToImage, type StoryAssetCache } from './storyAssets';
import { drawStory, storySources } from './storyCanvas';
import { STORY_HEIGHT, STORY_WIDTH } from './storyLayout';
import type { StoryImageSpec } from './storySpec';

export const STORY_MIME = 'image/jpeg';
const STORY_QUALITY = 0.92;

function qrImage(
  value: string,
  svg: SVGElement | null,
  cache?: StoryAssetCache
): Promise<CanvasImageSource | null> {
  const key = `qr:${value}`;
  const known = cache?.get(key);
  if (known) return known;
  const loading = svgElementToImage(svg);
  cache?.set(key, loading);
  return loading;
}

export async function renderStoryImage(
  spec: StoryImageSpec,
  qrSvg: SVGElement | null,
  cache?: StoryAssetCache
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.toBlob !== 'function') return null;

  await document.fonts?.ready.catch(() => undefined);

  const [assets, qr] = await Promise.all([
    loadStoryAssets(storySources(spec), cache),
    qrImage(spec.qr.value, qrSvg, cache),
  ]);
  drawStory(ctx, spec, assets, qr);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      },
      STORY_MIME,
      STORY_QUALITY
    );
  });
}
