export const STORY_LOGO_SRC = '/logo.svg';

export type StoryAssets = ReadonlyMap<string, CanvasImageSource>;

export type StoryAssetCache = Map<string, Promise<CanvasImageSource | null>>;

const SVG_MIME = 'image/svg+xml';
const QR_SIZE = 512;
const ASSET_SIZE = 128;

function sized(svg: string, size: number): string {
  if (/<svg[^>]*\swidth=/i.test(svg)) return svg;
  return svg.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
}

function fromObjectUrl(url: string): Promise<CanvasImageSource | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const done = (value: CanvasImageSource | null) => () => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    image.addEventListener('load', done(image));
    image.addEventListener('error', done(null));
    image.src = url;
  });
}

async function assetBlob(response: Response): Promise<Blob> {
  if (!(response.headers?.get('content-type') ?? '').includes('svg')) return response.blob();
  return new Blob([sized(await response.text(), ASSET_SIZE)], { type: SVG_MIME });
}

export async function loadStoryAsset(src: string): Promise<CanvasImageSource | null> {
  try {
    const response = await fetch(src, { mode: 'cors', cache: 'reload' });
    if (!response.ok) return null;
    return await fromObjectUrl(URL.createObjectURL(await assetBlob(response)));
  } catch {
    return null;
  }
}

export async function svgElementToImage(svg: SVGElement | null): Promise<CanvasImageSource | null> {
  if (!svg) return null;
  const markup = sized(new XMLSerializer().serializeToString(svg), QR_SIZE);
  return fromObjectUrl(URL.createObjectURL(new Blob([markup], { type: SVG_MIME })));
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
