import { createRef } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryImage } from './useStoryImage';
import { renderStoryImage } from './renderStoryImage';
import type { StoryImageSpec } from './storySpec';

vi.mock('./renderStoryImage', () => ({ renderStoryImage: vi.fn() }));

const rendered = vi.mocked(renderStoryImage);
const spec = { title: 'Soirée du vendredi' } as StoryImageSpec;
const qrRef = createRef<HTMLElement>();

beforeEach(() => {
  rendered.mockReset();
  rendered.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:story'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useStoryImage', () => {
  it('prepares the image, then hands it over', async () => {
    const { result } = renderHook(() => useStoryImage('films', spec, qrRef));

    expect(result.current.status).toBe('pending');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.url).toBe('blob:story');
    expect(result.current.blob).toBeInstanceOf(Blob);
  });

  it('draws each slide once', async () => {
    const { rerender, result } = renderHook(({ key }) => useStoryImage(key, spec, qrRef), {
      initialProps: { key: 'films' },
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ key: 'film-2' });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ key: 'films' });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rendered).toHaveBeenCalledTimes(2);
  });

  it('shows the slide asked for after a quick back and forth, never the previous one', async () => {
    const pendingB: Array<(blob: Blob) => void> = [];
    const blobA = new Blob(['a'], { type: 'image/jpeg' });
    const blobB = new Blob(['b'], { type: 'image/jpeg' });
    rendered
      .mockResolvedValueOnce(blobA)
      .mockImplementationOnce(() => new Promise<Blob | null>((resolve) => pendingB.push(resolve)));
    const { rerender, result } = renderHook(({ key }) => useStoryImage(key, spec, qrRef), {
      initialProps: { key: 'film-1' },
    });
    await waitFor(() => expect(result.current.blob).toBe(blobA));

    rerender({ key: 'film-2' });
    rerender({ key: 'film-1' });
    rerender({ key: 'film-2' });

    expect(result.current.status).toBe('pending');
    expect(result.current.blob).toBeNull();
    await act(async () => pendingB[0]?.(blobB));
    expect(result.current.blob).toBe(blobB);
    expect(rendered).toHaveBeenCalledTimes(2);
  });

  it('draws a slide left before it was ready only once', async () => {
    const pendingA: Array<(blob: Blob) => void> = [];
    rendered.mockImplementationOnce(
      () => new Promise<Blob | null>((resolve) => pendingA.push(resolve))
    );
    const { rerender, result } = renderHook(({ key }) => useStoryImage(key, spec, qrRef), {
      initialProps: { key: 'film-1' },
    });

    rerender({ key: 'film-2' });
    rerender({ key: 'film-1' });
    await act(async () => pendingA[0]?.(new Blob(['a'], { type: 'image/jpeg' })));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rendered).toHaveBeenCalledTimes(2);
  });

  it('keeps drawing the slide while the night refreshes underneath', async () => {
    const { rerender, result } = renderHook(
      ({ current }) => useStoryImage('films', current, qrRef),
      {
        initialProps: { current: { ...spec } as StoryImageSpec },
      }
    );

    rerender({ current: { ...spec } as StoryImageSpec });
    rerender({ current: { ...spec } as StoryImageSpec });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rendered).toHaveBeenCalledTimes(1);
  });

  it('gives the images back when the window closes', async () => {
    const revoked = vi.mocked(URL.revokeObjectURL);
    const { result, unmount } = renderHook(() => useStoryImage('films', spec, qrRef));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    unmount();

    expect(revoked).toHaveBeenCalledWith('blob:story');
  });

  it('draws again when asked to try once more', async () => {
    rendered.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useStoryImage('films', spec, qrRef));

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rendered).toHaveBeenCalledTimes(2);
  });

  it('reports a browser that draws nothing', async () => {
    rendered.mockResolvedValue(null);

    const { result } = renderHook(() => useStoryImage('films', spec, qrRef));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.url).toBeNull();
  });

  it('reports a drawing that throws', async () => {
    rendered.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useStoryImage('films', spec, qrRef));

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
