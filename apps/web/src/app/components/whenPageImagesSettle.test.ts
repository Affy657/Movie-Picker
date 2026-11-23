import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { whenPageImagesSettle } from '@/app/components/whenPageImagesSettle';

function addImage({ complete, visible }: { complete: boolean; visible: boolean }) {
  const img = document.createElement('img');
  Object.defineProperty(img, 'complete', { configurable: true, get: () => complete });
  img.getBoundingClientRect = () =>
    ({
      top: visible ? 10 : 5000,
      bottom: visible ? 100 : 5100,
      left: 0,
      right: 100,
      width: 100,
      height: 90,
    }) as DOMRect;
  document.body.append(img);
  return img;
}

describe('whenPageImagesSettle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('waits for the page to load before anything else', async () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
    const settled = vi.fn();
    whenPageImagesSettle(settled);

    await vi.advanceTimersByTimeAsync(20_000);
    expect(settled).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(settled).toHaveBeenCalledOnce();
  });

  it('leaves a few seconds after load for the data and its posters to arrive', async () => {
    const settled = vi.fn();
    whenPageImagesSettle(settled);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(settled).toHaveBeenCalledOnce();
  });

  it('waits for the posters still loading on screen, not for those further down', async () => {
    const onScreen = addImage({ complete: false, visible: true });
    addImage({ complete: false, visible: false });
    const settled = vi.fn();
    whenPageImagesSettle(settled);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(settled).not.toHaveBeenCalled();

    onScreen.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toHaveBeenCalledOnce();
  });

  it('stops waiting for a poster that never finishes', async () => {
    addImage({ complete: false, visible: true });
    const settled = vi.fn();
    whenPageImagesSettle(settled);

    await vi.advanceTimersByTimeAsync(14_000);
    expect(settled).toHaveBeenCalledOnce();
  });

  it('does nothing once cancelled', async () => {
    const settled = vi.fn();
    const cancel = whenPageImagesSettle(settled);
    cancel();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(settled).not.toHaveBeenCalled();
  });
});
