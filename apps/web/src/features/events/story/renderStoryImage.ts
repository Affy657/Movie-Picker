import { loadStoryAssets, type StoryAssetCache, type StoryAssets } from './storyAssets';
import { drawStory, storySources } from './storyCanvas';
import { STORY_HEIGHT, STORY_WIDTH } from './storyLayout';
import type { StoryImageSpec } from './storySpec';

export const STORY_MIME = 'image/jpeg';
const STORY_QUALITY = 0.92;

export type CanvasImageFormat = {
  width: number;
  height: number;
  mime: string;
  quality?: number;
};

export async function renderCanvasImage(
  format: CanvasImageFormat,
  sources: readonly string[],
  draw: (ctx: CanvasRenderingContext2D, assets: StoryAssets) => void,
  cache?: StoryAssetCache
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.toBlob !== 'function') return null;

  await document.fonts?.ready.catch(() => undefined);

  draw(ctx, await loadStoryAssets(sources, cache));

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      },
      format.mime,
      format.quality
    );
  });
}

export function renderStoryImage(
  spec: StoryImageSpec,
  cache?: StoryAssetCache
): Promise<Blob | null> {
  return renderCanvasImage(
    { width: STORY_WIDTH, height: STORY_HEIGHT, mime: STORY_MIME, quality: STORY_QUALITY },
    storySources(spec),
    (ctx, assets) => drawStory(ctx, spec, assets),
    cache
  );
}
