import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

describe('copyTextToClipboard', () => {
  const writeText = vi.fn();
  const execCommand = vi.fn(() => false);
  let originalClipboard: PropertyDescriptor | undefined;
  let originalExecCommand: PropertyDescriptor | undefined;

  beforeEach(() => {
    writeText.mockReset();
    execCommand.mockReset();
    execCommand.mockReturnValue(false);
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: execCommand,
    });
  });

  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete (navigator as { clipboard?: Clipboard }).clipboard;
    if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand);
    else delete (document as { execCommand?: typeof document.execCommand }).execCommand;
  });

  it('retourne true quand le presse-papiers fonctionne', async () => {
    writeText.mockResolvedValue(undefined);
    expect(await copyTextToClipboard('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('replie sur execCommand quand le presse-papiers échoue', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    execCommand.mockReturnValue(true);
    expect(await copyTextToClipboard('hello')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('retourne false quand les deux méthodes échouent', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    expect(await copyTextToClipboard('hello')).toBe(false);
  });
});
