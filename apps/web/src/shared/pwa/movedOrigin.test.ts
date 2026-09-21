import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MOVED_ORIGIN_NOTICE_KEY,
  captureMovedOriginMarker,
  dismissMovedOriginNotice,
  isMovedOriginNoticePending,
} from '@/shared/pwa/movedOrigin';

describe('captureMovedOriginMarker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records the notice and strips the marker from the address, keeping the rest', () => {
    const replaceUrl = vi.fn();

    const captured = captureMovedOriginMarker(
      { pathname: '/my-events', search: '?movedFrom=web&tab=past', hash: '#top' },
      replaceUrl
    );

    expect(captured).toBe(true);
    expect(replaceUrl).toHaveBeenCalledWith('/my-events?tab=past#top');
    expect(isMovedOriginNoticePending()).toBe(true);
  });

  it('leaves no empty query behind', () => {
    const replaceUrl = vi.fn();

    captureMovedOriginMarker(
      { pathname: '/e/soiree', search: '?movedFrom=web', hash: '' },
      replaceUrl
    );

    expect(replaceUrl).toHaveBeenCalledWith('/e/soiree');
  });

  it('does nothing without the marker, or with another value', () => {
    const replaceUrl = vi.fn();

    expect(
      captureMovedOriginMarker({ pathname: '/', search: '?tab=past', hash: '' }, replaceUrl)
    ).toBe(false);
    expect(
      captureMovedOriginMarker({ pathname: '/', search: '?movedFrom=other', hash: '' }, replaceUrl)
    ).toBe(false);
    expect(replaceUrl).not.toHaveBeenCalled();
    expect(isMovedOriginNoticePending()).toBe(false);
  });

  it('does not bring the notice back once it was dismissed', () => {
    dismissMovedOriginNotice();

    captureMovedOriginMarker({ pathname: '/', search: '?movedFrom=web', hash: '' }, vi.fn());

    expect(isMovedOriginNoticePending()).toBe(false);
    expect(localStorage.getItem(MOVED_ORIGIN_NOTICE_KEY)).toBe('dismissed');
  });
});
