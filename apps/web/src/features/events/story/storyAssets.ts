export const STORY_LOGO_SRC = '/logo.svg';

export type StoryAssets = ReadonlyMap<string, CanvasImageSource>;

export type StoryAssetCache = Map<string, Promise<CanvasImageSource | null>>;

const SVG_MIME = 'image/svg+xml';
const ASSET_SIZE = 128;

function sized(svg: string, size: number): string {
  if (/<svg[^>]*\swidth=/i.test(svg)) return svg;
  return svg.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
}

function loadImage(src: string, release?: () => void): Promise<CanvasImageSource | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const done = (value: CanvasImageSource | null) => () => {
      release?.();
      resolve(value);
    };
    image.addEventListener('load', done(image));
    image.addEventListener('error', done(null));
    image.src = src;
  });
}

function fromObjectUrl(url: string): Promise<CanvasImageSource | null> {
  return loadImage(url, () => URL.revokeObjectURL(url));
}

async function assetBlob(response: Response): Promise<Blob> {
  if (!(response.headers?.get('content-type') ?? '').includes('svg')) return response.blob();
  return new Blob([sized(await response.text(), ASSET_SIZE)], { type: SVG_MIME });
}

export async function loadStoryAsset(src: string): Promise<CanvasImageSource | null> {
  if (src.startsWith('data:')) return loadImage(src);
  try {
    const response = await fetch(src, { mode: 'cors', cache: 'reload' });
    if (!response.ok) return null;
    return await fromObjectUrl(URL.createObjectURL(await assetBlob(response)));
  } catch {
    return null;
  }
}

function loadOnce(src: string, cache?: StoryAssetCache): Promise<CanvasImageSource | null> {
  const known = cache?.get(src);
  if (known) return known;
  const loading = loadStoryAsset(src).then((image) => {
    if (!image) cache?.delete(src);
    return image;
  });
  cache?.set(src, loading);
  return loading;
}

export async function loadStoryAssets(
  sources: readonly string[],
  cache?: StoryAssetCache
): Promise<StoryAssets> {
  const unique = [...new Set(sources)];
  const loaded = await Promise.all(unique.map((src) => loadOnce(src, cache)));
  const assets = new Map<string, CanvasImageSource>();
  unique.forEach((src, index) => {
    const image = loaded[index];
    if (image) assets.set(src, image);
  });
  return assets;
}
