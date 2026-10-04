type LegacyCopyDocument = { execCommand(commandId: 'copy'): boolean };

function copyFallbackHost(): HTMLElement {
  return document.activeElement?.closest<HTMLElement>('dialog[open]') ?? document.body;
}

function copyWithExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  copyFallbackHost().appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const legacyDocument: LegacyCopyDocument = document;
  try {
    return legacyDocument.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyWithExecCommand(text);
    }
  }
  return copyWithExecCommand(text);
}
