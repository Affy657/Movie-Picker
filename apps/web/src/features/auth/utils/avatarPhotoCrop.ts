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

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Frame = number | ImageSize;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sizeOf(frame: Frame): ImageSize {
  return typeof frame === 'number' ? { width: frame, height: frame } : frame;
}

function scaleOf(image: ImageSize, frame: Frame, zoom: number): number {
  const box = sizeOf(frame);
  return Math.max(box.width / image.width, box.height / image.height) * zoom;
}

export function displayedSize(image: ImageSize, frame: Frame, zoom: number): ImageSize {
  const scale = scaleOf(image, frame, zoom);
  return { width: image.width * scale, height: image.height * scale };
}

function clampCrop(crop: Crop, image: ImageSize, frame: Frame): Crop {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const shown = displayedSize(image, frame, zoom);
  const box = sizeOf(frame);
  return {
    zoom,
    x: clamp(crop.x, box.width - shown.width, 0),
    y: clamp(crop.y, box.height - shown.height, 0),
  };
}

export function centeredCrop(image: ImageSize, frame: Frame): Crop {
  const shown = displayedSize(image, frame, MIN_ZOOM);
  const box = sizeOf(frame);
  return { zoom: MIN_ZOOM, x: (box.width - shown.width) / 2, y: (box.height - shown.height) / 2 };
}

export function resizeCrop(crop: Crop, image: ImageSize, fromFrame: Frame, toFrame: Frame): Crop {
  const ratio = sizeOf(toFrame).width / sizeOf(fromFrame).width;
  return clampCrop({ ...crop, x: crop.x * ratio, y: crop.y * ratio }, image, toFrame);
}

export function moveCrop(crop: Crop, dx: number, dy: number, image: ImageSize, frame: Frame): Crop {
  return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, image, frame);
}

export function zoomCrop(
  crop: Crop,
  zoom: number,
  image: ImageSize,
  frame: Frame,
  anchor?: CropPoint
): Crop {
  const box = sizeOf(frame);
  const center = anchor ?? { x: box.width / 2, y: box.height / 2 };
  const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = nextZoom / crop.zoom;
  return clampCrop(
    {
      zoom: nextZoom,
      x: center.x - (center.x - crop.x) * ratio,
      y: center.y - (center.y - crop.y) * ratio,
    },
    image,
    frame
  );
}

export function cropWindowRect(crop: Crop, image: ImageSize, frame: ImageSize, window: Rect): Rect {
  const scale = scaleOf(image, frame, crop.zoom);
  return {
    x: (window.x - crop.x) / scale,
    y: (window.y - crop.y) / scale,
    width: window.width / scale,
    height: window.height / scale,
  };
}
