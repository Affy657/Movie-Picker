import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '@/shared/utils/downloadBlob';

describe('downloadBlob', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('clicks a temporary link and revokes the object url only later', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['x'], { type: 'text/plain' });

    expect(downloadBlob(blob, 'note.txt')).toBe(true);

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('note.txt');
    expect(anchor.href).toBe('blob:mock');
    expect(anchor.isConnected).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    click.mockRestore();
  });

  it('does nothing without object urls', () => {
    URL.createObjectURL = undefined as unknown as typeof URL.createObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    expect(downloadBlob(new Blob(['x']), 'note.txt')).toBe(false);

    expect(click).not.toHaveBeenCalled();
    click.mockRestore();
  });
});
