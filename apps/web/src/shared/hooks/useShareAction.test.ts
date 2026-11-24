import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useShareAction } from '@/shared/hooks/useShareAction';

const track = vi.fn();
vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track }) }));

const URL = 'https://movie-picker.fr/e/abc';
const share = vi.fn<(data: ShareData) => Promise<void>>();
const writeText = vi.fn<(text: string) => Promise<void>>();

function renderShare() {
  return renderHook(() => useShareAction(URL, 'Soirée du vendredi', undefined, 'event'));
}

function domError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe('useShareAction', () => {
  beforeEach(() => {
    track.mockReset();
    share.mockReset();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('shares through the native sheet and counts it', async () => {
    share.mockResolvedValue(undefined);
    const { result } = renderShare();

    await act(() => result.current.nativeShare());

    expect(share).toHaveBeenCalledWith({ title: 'Soirée du vendredi', url: URL, text: undefined });
    expect(writeText).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'native', surface: 'event' });
  });

  it('does nothing more when the person closes the native sheet', async () => {
    share.mockRejectedValue(domError('AbortError'));
    const { result } = renderShare();

    await act(() => result.current.nativeShare());

    expect(writeText).not.toHaveBeenCalled();
    expect(result.current.canNativeShare).toBe(true);
  });

  it('falls back to copying when the native sheet is refused, and copies at once on the next tap', async () => {
    share.mockRejectedValue(domError('NotAllowedError'));
    const { result } = renderShare();

    await act(() => result.current.nativeShare());

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(result.current.canNativeShare).toBe(false);

    writeText.mockClear();
    share.mockClear();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.nativeShare();
    });
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(URL);
    await act(() => pending);
    expect(result.current.copied).toBe(true);
  });
});
