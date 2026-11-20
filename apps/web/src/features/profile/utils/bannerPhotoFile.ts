import {
  drawCrop,
  encodeCanvas,
  loadAvatarPhoto,
  type AvatarPhotoFileError,
  type LoadedAvatarPhoto,
} from '@/features/auth/utils/avatarPhotoFile';
import type { Rect } from '@/features/auth/utils/avatarPhotoCrop';

export const BANNER_PHOTO_MIN_WIDTH = 1280;
export const BANNER_PHOTO_MIN_HEIGHT = 720;
export const BANNER_PHOTO_OUTPUT = { width: 1600, height: 900 } as const;
export const BANNER_PHOTO_MAX_OUTPUT_BYTES = 600_000;

const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62, 0.54];

export function checkBannerPhotoSize(width: number, height: number): AvatarPhotoFileError | null {
  return width < BANNER_PHOTO_MIN_WIDTH || height < BANNER_PHOTO_MIN_HEIGHT ? 'tooSmall' : null;
}

export function loadBannerPhoto(file: File): Promise<LoadedAvatarPhoto> {
  return loadAvatarPhoto(file, checkBannerPhotoSize);
}

async function encodeWithin(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  for (const quality of QUALITY_STEPS) {
    const blob = await encodeCanvas(canvas, type, quality);
    if (!blob || blob.type !== type) return null;
    if (blob.size <= BANNER_PHOTO_MAX_OUTPUT_BYTES) return blob;
  }
  throw new Error('The banner photo stays too heavy');
}

export async function renderBannerPhoto(image: HTMLImageElement, rect: Rect): Promise<Blob> {
  const canvas = drawCrop(image, rect, BANNER_PHOTO_OUTPUT.width, BANNER_PHOTO_OUTPUT.height);

  const webp = await encodeWithin(canvas, 'image/webp');
  if (webp) return webp;
  const jpeg = await encodeWithin(canvas, 'image/jpeg');
  if (!jpeg) throw new Error('The banner photo could not be encoded');
  return jpeg;
}
