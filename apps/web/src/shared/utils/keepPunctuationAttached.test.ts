import { describe, expect, it } from 'vitest';
import { keepPunctuationAttached } from '@/shared/utils/keepPunctuationAttached';

describe('keepPunctuationAttached', () => {
  it('holds the French double punctuation to the word before it', () => {
    expect(keepPunctuationAttached('Mission : Impossible')).toBe('Mission\u00a0: Impossible');
    expect(keepPunctuationAttached('Qui veut la peau de Roger Rabbit ?')).toBe(
      'Qui veut la peau de Roger Rabbit\u00a0?'
    );
  });

  it('leaves a title without a space before its punctuation alone', () => {
    expect(keepPunctuationAttached('Dune: Part Two')).toBe('Dune: Part Two');
  });
});
