import { describe, expect, it } from 'vitest';
import { buildMyEventSummary } from '@/test-utils/myEventSummary';
import { canLeaveNight } from './UpcomingEventsSection';

describe('canLeaveNight', () => {
  it('lets a guest leave a night they joined', () => {
    expect(canLeaveNight(buildMyEventSummary({ isCreator: false, isParticipant: true }))).toBe(
      true
    );
  });

  it('offers nothing to leave on a group night not joined yet', () => {
    expect(
      canLeaveNight(buildMyEventSummary({ isCreator: false, isParticipant: false, groupId: 'g1' }))
    ).toBe(false);
  });

  it('keeps the host and a night with its film out of it', () => {
    expect(canLeaveNight(buildMyEventSummary({ isCreator: true }))).toBe(false);
    expect(
      canLeaveNight(buildMyEventSummary({ winnerMovies: [{ title: 'Brume', posterPath: null }] }))
    ).toBe(false);
  });
});
