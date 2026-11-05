export function keepPunctuationAttached(text: string): string {
  return text.replace(/ ([:;!?])/g, '\u00a0$1');
}
