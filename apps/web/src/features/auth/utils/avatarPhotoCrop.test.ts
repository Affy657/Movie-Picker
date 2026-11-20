import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centeredCrop,
  cropWindowRect,
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

describe('cropWindowRect', () => {
  const square = { width: FRAME, height: FRAME };

  it('returns the square of the photo seen inside the circle', () => {
    expect(
      cropWindowRect({ zoom: 1, x: -50, y: 0 }, landscape, square, {
        x: 12,
        y: 12,
        width: 276,
        height: 276,
      })
    ).toEqual({ x: 62, y: 12, width: 276, height: 276 });
  });

  it('accounts for the zoom', () => {
    expect(
      cropWindowRect({ zoom: 2, x: -250, y: -150 }, landscape, square, {
        x: 0,
        y: 0,
        width: 300,
        height: 300,
      })
    ).toEqual({ x: 125, y: 75, width: 150, height: 150 });
  });
});

describe('a landscape frame', () => {
  const wide = { width: 1600, height: 1200 };
  const banner = { width: 320, height: 180 };

  it('covers the frame with the side that needs the most room and centres the other', () => {
    expect(centeredCrop(wide, banner)).toEqual({ zoom: 1, x: 0, y: -30 });
    expect(centeredCrop({ width: 4000, height: 1000 }, banner)).toEqual({ zoom: 1, x: -200, y: 0 });
  });

  it('never leaves an empty band inside the frame', () => {
    expect(moveCrop({ zoom: 1, x: 0, y: -30 }, 50, 100, wide, banner)).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
    expect(moveCrop({ zoom: 1, x: 0, y: -30 }, -50, -100, wide, banner)).toEqual({
      zoom: 1,
      x: 0,
      y: -60,
    });
  });

  it('zooms around the centre of the frame', () => {
    expect(zoomCrop({ zoom: 1, x: 0, y: -30 }, 2, wide, banner)).toEqual({
      zoom: 2,
      x: -160,
      y: -150,
    });
  });

  it('follows a resized frame', () => {
    expect(
      resizeCrop({ zoom: 2, x: -160, y: -150 }, wide, banner, { width: 160, height: 90 })
    ).toEqual({
      zoom: 2,
      x: -80,
      y: -75,
    });
  });

  it('returns the part of the photo seen through the window', () => {
    expect(
      cropWindowRect({ zoom: 1, x: 0, y: -30 }, wide, banner, {
        x: 16,
        y: 9,
        width: 288,
        height: 162,
      })
    ).toEqual({ x: 80, y: 195, width: 1440, height: 810 });
  });
});
