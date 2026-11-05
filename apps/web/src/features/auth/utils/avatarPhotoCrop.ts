export interface ImageSize {
  width: number;
  height: number;
}

export interface Crop {
  zoom: number;
  x: number;
  y: number;
}

export interface CropPoint {
  x: number;
  y: number;
}

export interface SourceRect {
  x: number;
  y: number;
  size: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function displayedSize(image: ImageSize, frame: number, zoom: number): ImageSize {
  const shortSide = Math.min(image.width, image.height);
  return {
    width: (image.width * frame * zoom) / shortSide,
    height: (image.height * frame * zoom) / shortSide,
  };
}

function clampCrop(crop: Crop, image: ImageSize, frame: number): Crop {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const shown = displayedSize(image, frame, zoom);
  return {
    zoom,
    x: clamp(crop.x, frame - shown.width, 0),
    y: clamp(crop.y, frame - shown.height, 0),
  };
}

export function centeredCrop(image: ImageSize, frame: number): Crop {
  const shown = displayedSize(image, frame, MIN_ZOOM);
  return { zoom: MIN_ZOOM, x: (frame - shown.width) / 2, y: (frame - shown.height) / 2 };
}

export function resizeCrop(crop: Crop, image: ImageSize, fromFrame: number, toFrame: number): Crop {
  const ratio = toFrame / fromFrame;
  return clampCrop({ ...crop, x: crop.x * ratio, y: crop.y * ratio }, image, toFrame);
}

export function moveCrop(
  crop: Crop,
  dx: number,
  dy: number,
  image: ImageSize,
  frame: number
): Crop {
  return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, image, frame);
}

export function zoomCrop(
  crop: Crop,
  zoom: number,
  image: ImageSize,
  frame: number,
  anchor: CropPoint = { x: frame / 2, y: frame / 2 }
): Crop {
  const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = nextZoom / crop.zoom;
  return clampCrop(
    {
      zoom: nextZoom,
      x: anchor.x - (anchor.x - crop.x) * ratio,
      y: anchor.y - (anchor.y - crop.y) * ratio,
    },
    image,
    frame
  );
}

export function cropSourceRect(
  crop: Crop,
  image: ImageSize,
  frame: number,
  inset: number
): SourceRect {
  const scale = (frame * crop.zoom) / Math.min(image.width, image.height);
  return {
    x: (inset - crop.x) / scale,
    y: (inset - crop.y) / scale,
    size: (frame - 2 * inset) / scale,
  };
}
