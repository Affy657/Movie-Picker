import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centeredCrop,
  cropSourceRect,
  moveCrop,
  resizeCrop,
  zoomCrop,
} from '@/features/auth/utils/avatarPhotoCrop';

const landscape = { width: 400, height: 300 };
const portrait = { width: 300, height: 600 };
const FRAME = 300;

describe('resizeCrop', () => {
  it('keeps the same part of the photo in the frame when the frame shrinks', () => {
    const zoomed = { zoom: 2, x: -150, y: -60 };

    expect(resizeCrop(zoomed, landscape, FRAME, 150)).toEqual({ zoom: 2, x: -75, y: -30 });
  });

  it('keeps the photo covering the frame when the frame grows', () => {
    const centred = centeredCrop(landscape, FRAME);

    expect(resizeCrop(centred, landscape, FRAME, 600)).toEqual(centeredCrop(landscape, 600));
  });
});

describe('centeredCrop', () => {
  it('covers the frame with the short side and centres the long one', () => {
    expect(centeredCrop(landscape, FRAME)).toEqual({ zoom: 1, x: -50, y: 0 });
    expect(centeredCrop(portrait, FRAME)).toEqual({ zoom: 1, x: 0, y: -150 });
  });

  it('scales a large photo down to the frame', () => {
    expect(centeredCrop({ width: 1200, height: 900 }, FRAME)).toEqual({ zoom: 1, x: -50, y: 0 });
  });
});

describe('moveCrop', () => {
  it('follows the drag', () => {
    expect(moveCrop({ zoom: 1, x: -50, y: 0 }, 20, 0, landscape, FRAME)).toEqual({
      zoom: 1,
      x: -30,
      y: 0,
    });
  });

  it('never leaves an empty band inside the frame', () => {
    expect(moveCrop({ zoom: 1, x: -50, y: 0 }, 200, 80, landscape, FRAME)).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
    expect(moveCrop({ zoom: 1, x: -50, y: 0 }, -500, -80, landscape, FRAME)).toEqual({
      zoom: 1,
      x: -100,
      y: 0,
    });
  });
});

describe('zoomCrop', () => {
  it('zooms around the centre of the frame by default', () => {
    expect(zoomCrop({ zoom: 1, x: -50, y: 0 }, 2, landscape, FRAME)).toEqual({
      zoom: 2,
      x: -250,
      y: -150,
    });
  });

  it('zooms around the given point', () => {
    expect(zoomCrop({ zoom: 1, x: -50, y: 0 }, 2, landscape, FRAME, { x: 0, y: 0 })).toEqual({
      zoom: 2,
      x: -100,
      y: 0,
    });
  });

  it('stays between the minimum and the maximum zoom', () => {
    expect(zoomCrop({ zoom: 1, x: -50, y: 0 }, 10, landscape, FRAME).zoom).toBe(MAX_ZOOM);
    expect(zoomCrop({ zoom: 2, x: -250, y: -150 }, 0.2, landscape, FRAME).zoom).toBe(MIN_ZOOM);
  });

  it('keeps the frame covered when zooming back out', () => {
    expect(zoomCrop({ zoom: 3, x: -800, y: -600 }, 1, landscape, FRAME)).toEqual({
      zoom: 1,
      x: -100,
      y: 0,
    });
  });
});

describe('cropSourceRect', () => {
  it('returns the square of the photo seen inside the circle', () => {
    expect(cropSourceRect({ zoom: 1, x: -50, y: 0 }, landscape, FRAME, 12)).toEqual({
      x: 62,
      y: 12,
      size: 276,
    });
  });

  it('accounts for the zoom', () => {
    expect(cropSourceRect({ zoom: 2, x: -250, y: -150 }, landscape, FRAME, 0)).toEqual({
      x: 125,
      y: 75,
      size: 150,
    });
  });
});
