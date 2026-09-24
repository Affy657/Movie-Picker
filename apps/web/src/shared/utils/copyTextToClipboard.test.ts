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

  it('falls back to execCommand when the clipboard fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    execCommand.mockReturnValue(true);
    expect(await copyTextToClipboard('hello')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('copies from inside the open dialog, the page behind a modal being inert', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    const copyButton = document.createElement('button');
    dialog.appendChild(copyButton);
    document.body.appendChild(dialog);
    copyButton.focus();
    let copiedFrom: Element | null = null;
    let copiedText = '';
    execCommand.mockImplementation(() => {
      const source = document.activeElement as HTMLTextAreaElement;
      copiedFrom = source.parentElement;
      copiedText = source.value;
      return true;
    });

    try {
      expect(await copyTextToClipboard('hello')).toBe(true);
      expect(copiedFrom).toBe(dialog);
      expect(copiedText).toBe('hello');
      expect(dialog.querySelector('textarea')).toBeNull();
    } finally {
      dialog.remove();
    }
  });

  it('copies from the body when no dialog holds the focus', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    let copiedFrom: Element | null = null;
    execCommand.mockImplementation(() => {
      copiedFrom = document.activeElement?.parentElement ?? null;
      return true;
    });

    expect(await copyTextToClipboard('hello')).toBe(true);
    expect(copiedFrom).toBe(document.body);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('returns false when both methods fail', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    expect(await copyTextToClipboard('hello')).toBe(false);
  });
});
