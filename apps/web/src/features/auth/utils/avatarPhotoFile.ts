import type { SourceRect } from '@/features/auth/utils/avatarPhotoCrop';

export type AvatarPhotoFileError = 'tooLarge' | 'unsupported' | 'tooSmall';

export class AvatarPhotoFileRejection extends Error {
  constructor(readonly reason: AvatarPhotoFileError) {
    super(`Avatar photo refused: ${reason}`);
    this.name = 'AvatarPhotoFileRejection';
  }
}

export interface LoadedAvatarPhoto {
  image: HTMLImageElement;
  url: string;
  width: number;
  height: number;
}

export const AVATAR_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_PHOTO_MIN_SIDE = 128;
export const AVATAR_PHOTO_OUTPUT_SIZE = 256;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ENCODING_QUALITY = 0.9;

export const AVATAR_PHOTO_ACCEPT = ACCEPTED_TYPES.join(',');

export function checkAvatarPhotoFile(file: File): AvatarPhotoFileError | null {
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) return 'unsupported';
  if (file.size > AVATAR_PHOTO_MAX_BYTES) return 'tooLarge';
  return null;
}

export function checkAvatarPhotoSize(width: number, height: number): AvatarPhotoFileError | null {
  return Math.min(width, height) < AVATAR_PHOTO_MIN_SIDE ? 'tooSmall' : null;
}

export function loadAvatarPhoto(file: File): Promise<LoadedAvatarPhoto> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sizeError = checkAvatarPhotoSize(image.naturalWidth, image.naturalHeight);
      if (sizeError) {
        URL.revokeObjectURL(url);
        reject(new AvatarPhotoFileRejection(sizeError));
        return;
      }
      resolve({ image, url, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AvatarPhotoFileRejection('unsupported'));
    };
    image.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, ENCODING_QUALITY));
}

export async function renderAvatarPhoto(image: HTMLImageElement, rect: SourceRect): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_PHOTO_OUTPUT_SIZE;
  canvas.height = AVATAR_PHOTO_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.size,
    rect.size,
    0,
    0,
    AVATAR_PHOTO_OUTPUT_SIZE,
    AVATAR_PHOTO_OUTPUT_SIZE
  );

  const webp = await encode(canvas, 'image/webp');
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await encode(canvas, 'image/jpeg');
  if (!jpeg) throw new Error('The photo could not be encoded');
  return jpeg;
}
