import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn() },
    });
  });

  it('retourne true quand le presse-papiers fonctionne', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    expect(await copyTextToClipboard('hello')).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('retourne false quand le presse-papiers échoue', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied')
    );
    expect(await copyTextToClipboard('hello')).toBe(false);
  });
});
