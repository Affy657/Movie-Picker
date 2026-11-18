import { describe, expect, it } from 'vitest';

import { getParticipantId } from '@/shared/utils/movieParticipant';

describe('getParticipantId', () => {
  it('returns the id of the participant who proposed the film', () => {
    expect(getParticipantId({ participantId: 'p1' })).toBe('p1');
  });
});
