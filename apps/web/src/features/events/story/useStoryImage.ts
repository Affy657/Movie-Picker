import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { renderStoryImage } from './renderStoryImage';
import type { StoryAssetCache } from './storyAssets';
import type { StoryImageSpec } from './storySpec';

export type StoryImageStatus = 'pending' | 'ready' | 'error';

type Drawn = {
  status: StoryImageStatus;
  url: string | null;
  blob: Blob | null;
};

export type StoryImageState = Drawn & { retry: () => void };

const PENDING: Drawn = { status: 'pending', url: null, blob: null };
const FAILED: Drawn = { status: 'error', url: null, blob: null };

export function useStoryImage(
  key: string,
  spec: StoryImageSpec | null,
  qrRef: RefObject<HTMLElement | null>
): StoryImageState {
  const cache = useRef(new Map<string, Drawn>());
  const assets = useRef<StoryAssetCache>(new Map());
  const drawing = useRef<string | null>(null);
  const alive = useRef(true);
  const [attempt, setAttempt] = useState(0);
  const [shown, setShown] = useState<{ key: string; drawn: Drawn }>(() => ({
    key,
    drawn: cache.current.get(key) ?? PENDING,
  }));

  useEffect(() => {
    alive.current = true;
    const drawn = cache.current;
    const loaded = assets.current;
    return () => {
      alive.current = false;
      for (const entry of drawn.values()) {
        if (entry.url) URL.revokeObjectURL(entry.url);
      }
      drawn.clear();
      loaded.clear();
    };
  }, []);

  useEffect(() => {
    const known = cache.current.get(key);
    if (known) {
      setShown((previous) => (previous.key === key ? previous : { key, drawn: known }));
      return;
    }
    if (!spec || drawing.current === key) return;

    drawing.current = key;
    setShown({ key, drawn: PENDING });
    void renderStoryImage(spec, qrRef.current?.querySelector('svg') ?? null, assets.current)
      .then((blob): Drawn =>
        blob ? { status: 'ready', url: URL.createObjectURL(blob), blob } : FAILED
      )
      .catch((): Drawn => FAILED)
      .then((drawn) => {
        if (drawing.current === key) drawing.current = null;
        if (!alive.current) {
          if (drawn.url) URL.revokeObjectURL(drawn.url);
          return;
        }
        cache.current.set(key, drawn);
        setShown((previous) => (previous.key === key ? { key, drawn } : previous));
      });
  }, [key, spec, qrRef, attempt]);

  const retry = useCallback(() => {
    const stale = cache.current.get(key);
    if (stale?.url) URL.revokeObjectURL(stale.url);
    cache.current.delete(key);
    drawing.current = null;
    setAttempt((count) => count + 1);
  }, [key]);

  return useMemo(() => ({ ...shown.drawn, retry }), [shown, retry]);
}
