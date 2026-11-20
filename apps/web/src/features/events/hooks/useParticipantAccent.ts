import { createContext, useContext, useMemo } from 'react';
import type { EventParticipantSummary } from '@/shared/types/event';
import type { AccentColor } from '@/shared/types/theme';
import { isChosenAccent } from '@/shared/utils/accentColor';

type AccentsByParticipant = ReadonlyMap<string, AccentColor>;

export const ParticipantAccentsContext = createContext<AccentsByParticipant>(new Map());

export function useAccentsByParticipant(
  participants: ReadonlyArray<Pick<EventParticipantSummary, 'id' | 'accentColor'>> | undefined
): AccentsByParticipant {
  return useMemo(
    () =>
      new Map(
        (participants ?? []).flatMap((p) =>
          isChosenAccent(p.accentColor) ? [[p.id, p.accentColor] as const] : []
        )
      ),
    [participants]
  );
}

export function useParticipantAccent(participantId: string | undefined): AccentColor | undefined {
  const accents = useContext(ParticipantAccentsContext);
  return participantId ? accents.get(participantId) : undefined;
}
