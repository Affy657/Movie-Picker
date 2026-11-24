import { useMemo } from 'react';
import { BRAND_COLORS, BRAND_NAME, WORDMARK, renderWordmarkShapes } from '@/shared/brand/brandArt';
import { qrSvgDataUrl } from '@/shared/components/qrCodeShapes';
import { STORY_LOGO_SRC, type StoryAssetCache } from './storyAssets';
import { QR_CARD_HEIGHT, QR_CARD_WIDTH, drawQrCard } from './storyCanvas';
import type { QrCardSpec } from './storySpec';
import { renderCanvasImage } from './renderStoryImage';
import { useRenderedImage, type StoryImageState } from './useStoryImage';

const QR_CARD_MIME = 'image/png';
const NO_OBJECT_URL = { objectUrl: false } as const;
const QR_SOURCE_PIXELS = 1200;
const WORDMARK_SOURCE_HEIGHT = 192;

export type QrCardInput = {
  title: string;
  detail: string;
  url: string;
};

function wordmarkSize(): { width: number; height: number } {
  const [, , width = 1, height = 1] = WORDMARK.viewBox.split(' ').map(Number);
  return { width, height };
}

function wordmarkDataUrl(): string {
  const { width, height } = wordmarkSize();
  const pixelWidth = Math.round((WORDMARK_SOURCE_HEIGHT * width) / height);
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK.viewBox}" width="${pixelWidth}" height="${WORDMARK_SOURCE_HEIGHT}">` +
    renderWordmarkShapes({
      word: BRAND_COLORS.wordOnDark,
      picker: BRAND_COLORS.pickerOnDark,
      dot: BRAND_COLORS.dot,
    }) +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export function siteOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function qrCardSpec({ title, detail, url }: QrCardInput): QrCardSpec {
  const { width, height } = wordmarkSize();
  return {
    title,
    detail,
    site: siteOf(url),
    brandName: BRAND_NAME,
    qrSrc: qrSvgDataUrl(url, QR_SOURCE_PIXELS),
    wordmark: { src: wordmarkDataUrl(), ratio: width / height },
  };
}

export function renderQrCardImage(spec: QrCardSpec, cache?: StoryAssetCache): Promise<Blob | null> {
  return renderCanvasImage(
    { width: QR_CARD_WIDTH, height: QR_CARD_HEIGHT, mime: QR_CARD_MIME },
    [STORY_LOGO_SRC, spec.wordmark.src, spec.qrSrc],
    (ctx, assets) => drawQrCard(ctx, spec, assets),
    cache
  );
}

export function qrCardFileName(slug: string): string {
  return `movie-picker-qr-${slug}.png`;
}

export function useQrCardImage(card: QrCardInput | null): StoryImageState {
  const title = card?.title;
  const detail = card?.detail;
  const url = card?.url;
  const spec = useMemo(
    () =>
      title === undefined || detail === undefined || url === undefined
        ? null
        : qrCardSpec({ title, detail, url }),
    [title, detail, url]
  );
  return useRenderedImage(
    `qr-${url ?? ''}-${title ?? ''}-${detail ?? ''}`,
    spec,
    renderQrCardImage,
    NO_OBJECT_URL
  );
}
