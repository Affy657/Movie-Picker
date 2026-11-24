import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export type ImageRenderer<S> = (spec: S, cache: StoryAssetCache) => Promise<Blob | null>;

export type RenderedImageOptions = { objectUrl?: boolean };

const PENDING: Drawn = { status: 'pending', url: null, blob: null };
const FAILED: Drawn = { status: 'error', url: null, blob: null };

export function useRenderedImage<S>(
  key: string,
  spec: S | null,
  render: ImageRenderer<S>,
  { objectUrl = true }: RenderedImageOptions = {}
): StoryImageState {
  const cache = useRef(new Map<string, Drawn>());
  const assets = useRef<StoryAssetCache>(new Map());
  const drawing = useRef(new Set<string>());
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
    if (!spec) return;
    if (drawing.current.has(key)) {
      setShown((previous) => (previous.key === key ? previous : { key, drawn: PENDING }));
      return;
    }

    drawing.current.add(key);
    setShown({ key, drawn: PENDING });
    void render(spec, assets.current)
      .then((blob): Drawn =>
        blob ? { status: 'ready', url: objectUrl ? URL.createObjectURL(blob) : null, blob } : FAILED
      )
      .catch((): Drawn => FAILED)
      .then((drawn) => {
        drawing.current.delete(key);
        if (!alive.current) {
          if (drawn.url) URL.revokeObjectURL(drawn.url);
          return;
        }
        cache.current.set(key, drawn);
        setShown((previous) => (previous.key === key ? { key, drawn } : previous));
      });
  }, [key, spec, render, attempt, objectUrl]);

  const retry = useCallback(() => {
    const stale = cache.current.get(key);
    if (stale?.url) URL.revokeObjectURL(stale.url);
    cache.current.delete(key);
    drawing.current.delete(key);
    setAttempt((count) => count + 1);
  }, [key]);

  return useMemo(() => ({ ...shown.drawn, retry }), [shown, retry]);
}

export function useStoryImage(key: string, spec: StoryImageSpec | null): StoryImageState {
  return useRenderedImage(key, spec, renderStoryImage);
}
