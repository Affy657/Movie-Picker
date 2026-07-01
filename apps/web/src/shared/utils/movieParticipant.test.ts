import { describe, expect, it } from 'vitest';

import { getParticipantId } from '@/shared/utils/movieParticipant';
import type { MovieData } from '@/shared/types/movie';

const movieWith = (participantId: unknown): MovieData =>
  ({ participantId }) as unknown as MovieData;

describe('getParticipantId', () => {
  it('returns a plain string participant id as-is', () => {
    expect(getParticipantId(movieWith('p1'))).toBe('p1');
  });

  it('reads the id field of a populated participant object', () => {
    expect(getParticipantId(movieWith({ id: 'abc', pseudo: 'Bob' }))).toBe('abc');
  });

  it('stringifies objects without a string id field', () => {
    expect(getParticipantId(movieWith({ id: 123 }))).toBe('{"id":123}');
    expect(getParticipantId(movieWith({}))).toBe('{}');
  });

  it('stringifies non-object, non-string values', () => {
    expect(getParticipantId(movieWith(null))).toBe('null');
    expect(getParticipantId(movieWith(42))).toBe('42');
  });
});
