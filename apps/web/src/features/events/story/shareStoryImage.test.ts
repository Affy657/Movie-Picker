import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canShareStoryFile, shareStoryImage } from './shareStoryImage';
import * as download from '@/shared/utils/downloadBlob';

const blob = new Blob(['png'], { type: 'image/png' });

const input = {
  blob,
  fileName: 'movie-picker-story-abc-films.jpg',
  title: 'Soirée du vendredi',
  text: 'On a vu Inception pendant Soirée du vendredi, voici le recap !',
  url: 'https://www.movie-picker.fr/r/abc',
};

let share: ReturnType<typeof vi.fn>;
let canShare: ReturnType<typeof vi.fn>;
let downloaded: ReturnType<typeof vi.spyOn>;

function withShare(canShareFiles: boolean) {
  share = vi.fn(async () => undefined);
  canShare = vi.fn(() => canShareFiles);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
}

beforeEach(() => {
  downloaded = vi.spyOn(download, 'downloadBlob').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

describe('canShareStoryFile', () => {
  it('is false without a browser share sheet', () => {
    expect(canShareStoryFile(blob, 'story.jpg')).toBe(false);
  });

  it('is false when the sheet refuses files', () => {
    withShare(false);

    expect(canShareStoryFile(blob, 'story.jpg')).toBe(false);
  });

  it('is true when the sheet takes files', () => {
    withShare(true);

    expect(canShareStoryFile(blob, 'story.jpg')).toBe(true);
  });
});

describe('shareStoryImage', () => {
  it('sends the image, the text and the recap link to the share sheet', async () => {
    withShare(true);

    expect(await shareStoryImage(input)).toBe('shared');
    const call = share.mock.calls[0]?.[0] as { files: File[]; text: string; url: string };
    expect(call.files[0]?.name).toBe('movie-picker-story-abc-films.jpg');
    expect(call.files[0]?.type).toBe('image/png');
    expect(call.text).toBe(input.text);
    expect(call.url).toBe(input.url);
    expect(downloaded).not.toHaveBeenCalled();
  });

  it('does nothing else when the sheet is dismissed', async () => {
    withShare(true);
    share.mockRejectedValueOnce(Object.assign(new Error('nope'), { name: 'AbortError' }));

    expect(await shareStoryImage(input)).toBe('cancelled');
    expect(downloaded).not.toHaveBeenCalled();
  });

  it('downloads the image when the sheet fails', async () => {
    withShare(true);
    share.mockRejectedValueOnce(new Error('boom'));

    expect(await shareStoryImage(input)).toBe('downloaded');
    expect(downloaded).toHaveBeenCalledWith(blob, input.fileName);
  });

  it('downloads the image when the browser cannot share files', async () => {
    expect(await shareStoryImage(input)).toBe('downloaded');
    expect(downloaded).toHaveBeenCalledWith(blob, input.fileName);
  });
});
