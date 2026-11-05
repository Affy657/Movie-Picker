import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawBlurredPoster, groundCrop } from './storyBackdrop';
import { STORY_HEIGHT, STORY_WIDTH } from './storyLayout';

type DrawArgs = [CanvasImageSource, ...number[]];

function recordingContext() {
  const calls: Array<{ args: DrawArgs; alpha: number }> = [];
  const ctx = {
    globalAlpha: 1,
    save: () => {},
    restore: () => {},
    drawImage: (...args: DrawArgs) => calls.push({ args, alpha: ctx.globalAlpha }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const poster = { poster: true } as unknown as CanvasImageSource;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('groundCrop', () => {
  it('keeps the middle of the poster, in the shape of the story', () => {
    const crop = groundCrop(256, 384);

    expect(crop.width / crop.height).toBeCloseTo(STORY_WIDTH / STORY_HEIGHT, 5);
    expect(crop.height).toBeLessThan(384);
    expect(crop.x).toBeCloseTo((256 - crop.width) / 2, 5);
    expect(crop.y).toBeCloseTo((384 - crop.height) / 2, 5);
  });
});

describe('drawBlurredPoster', () => {
  it('covers the whole story with a veiled poster', () => {
    const { ctx, calls } = recordingContext();

    drawBlurredPoster(ctx, poster);

    expect(calls).toHaveLength(1);
    const [image, , , , , x, y, width, height] = calls[0]?.args ?? [];
    expect(image).toBeInstanceOf(HTMLCanvasElement);
    expect([x, y, width, height]).toEqual([0, 0, STORY_WIDTH, STORY_HEIGHT]);
    expect(calls[0]?.alpha).toBeLessThan(1);
  });

  it('shrinks the poster through small steps and never asks the browser for a filter', () => {
    const sizes: number[] = [];
    const created = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = created(tag);
      if (tag === 'canvas') {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext.bind(canvas);
        vi.spyOn(canvas, 'getContext').mockImplementation(((id: string) => {
          sizes.push(canvas.width);
          return context(id as '2d');
        }) as HTMLCanvasElement['getContext']);
      }
      return element;
    });
    const { ctx } = recordingContext();

    drawBlurredPoster(ctx, poster);

    expect(Math.min(...sizes)).toBeLessThanOrEqual(32);
    expect(sizes.at(-1)).toBeGreaterThanOrEqual(128);
    expect(ctx).not.toHaveProperty('filter');
  });

  it('softens the smallest step in both directions, on top of itself', () => {
    const shared = document.createElement('canvas').getContext('2d');
    const draw = vi.spyOn(shared as CanvasRenderingContext2D, 'drawImage');
    const { ctx } = recordingContext();

    drawBlurredPoster(ctx, poster);

    const shifts = (draw.mock.calls as unknown[][]).filter((call) => call.length === 3);
    expect(shifts.some(([, x, y]) => x !== 0 && y === 0)).toBe(true);
    expect(shifts.some(([, x, y]) => x === 0 && y !== 0)).toBe(true);
    expect(shifts.every(([image]) => image instanceof HTMLCanvasElement)).toBe(true);
  });

  it('leaves the ground alone when the browser gives no canvas', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { ctx, calls } = recordingContext();

    drawBlurredPoster(ctx, poster);

    expect(calls).toHaveLength(0);
  });

  it('gives back the memory of its steps, which iPhones count closely', () => {
    const canvases: HTMLCanvasElement[] = [];
    const created = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = created(tag);
      if (tag === 'canvas') canvases.push(element as HTMLCanvasElement);
      return element;
    });
    const { ctx } = recordingContext();

    drawBlurredPoster(ctx, poster);

    expect(canvases.length).toBeGreaterThan(2);
    expect(canvases.every((canvas) => canvas.width === 0)).toBe(true);
  });
});
