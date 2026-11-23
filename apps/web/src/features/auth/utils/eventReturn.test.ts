import { describe, it, expect } from 'vitest';
import { returnsToEvent } from '@/features/auth/utils/eventReturn';

describe('returnsToEvent', () => {
  it('recognises a movie night, with or without the query of the join card', () => {
    expect(returnsToEvent('/e/soiree-horreur')).toBe(true);
    expect(returnsToEvent('/e/soiree-horreur?rejoindre=1')).toBe(true);
  });

  it('leaves the other pages alone', () => {
    expect(returnsToEvent('/')).toBe(false);
    expect(returnsToEvent('/e/')).toBe(false);
    expect(returnsToEvent('/r/soiree-horreur')).toBe(false);
    expect(returnsToEvent('/watchlist?e=/e/x')).toBe(false);
    expect(returnsToEvent(undefined)).toBe(false);
  });
});
