import { describe, expect, it, vi } from 'vitest';
import type { Translate } from '@/shared/i18n';
import { buildConfirmDialogContent } from './eventDetailConfirmContent';
import type { ConfirmState } from './eventDetailSessionTypes';

const t: Translate = (key) => key;

function contentFor(confirmState: ConfirmState) {
  return buildConfirmDialogContent({
    confirmState,
    t,
    eventTitle: 'Ciné-club du mardi',
    confirmRemove: vi.fn(),
    confirmLeave: vi.fn(),
    confirmResetWheel: vi.fn(),
    confirmRemoveMovie: vi.fn(),
    confirmRemoveNote: vi.fn(),
    confirmCloseNight: vi.fn(),
    busyByKind: {
      remove: false,
      leave: false,
      resetWheel: false,
      removeMovie: false,
      removeNote: false,
      closeWithoutMovie: false,
      finishNight: false,
    },
  });
}

describe('buildConfirmDialogContent', () => {
  it('asks to finish the night without the danger tone, since the drawn films stay', () => {
    expect(contentFor({ kind: 'finishNight' })?.confirmTone).toBe('default');
  });

  it.each<NonNullable<ConfirmState>>([
    { kind: 'closeWithoutMovie' },
    { kind: 'resetWheel' },
    { kind: 'leave' },
    { kind: 'remove', participantId: 'p2', pseudo: 'Léa' },
    { kind: 'removeMovie', movieId: 'm1', movieTitle: 'Parasite', voteCount: 2 },
    { kind: 'removeNote', movieId: 'm1', movieTitle: 'Parasite' },
  ])('keeps the danger tone to confirm $kind', (confirmState) => {
    expect(contentFor(confirmState)?.confirmTone).toBe('danger');
  });
});
