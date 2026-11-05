import { loadStoryAssets, type StoryAssetCache } from './storyAssets';
import { drawStory, storySources } from './storyCanvas';
import { STORY_HEIGHT, STORY_WIDTH } from './storyLayout';
import type { StoryImageSpec } from './storySpec';

export const STORY_MIME = 'image/jpeg';
const STORY_QUALITY = 0.92;

export async function renderStoryImage(
  spec: StoryImageSpec,
  cache?: StoryAssetCache
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.toBlob !== 'function') return null;

  await document.fonts?.ready.catch(() => undefined);

  drawStory(ctx, spec, await loadStoryAssets(storySources(spec), cache));

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
