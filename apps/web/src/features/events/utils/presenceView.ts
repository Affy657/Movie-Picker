import type { EventParticipantSummary } from '@/shared/types/event';
import type { LivePresence } from '@/features/events/hooks/useEventLiveStream';

export type PresenceView = {
  onlineIds: ReadonlySet<string> | undefined;
  proposingIds: ReadonlySet<string> | undefined;
  onlineCount: number;
  proposerNames: string[];
};

export function presenceView(
  participants: readonly EventParticipantSummary[] | undefined,
  live: readonly LivePresence[] | null,
  selfId: string | null
): PresenceView {
  if (!live)
    return { onlineIds: undefined, proposingIds: undefined, onlineCount: 0, proposerNames: [] };
  const pseudoById = new Map((participants ?? []).map((p) => [p.id, p.pseudo]));
  const present = live.filter((entry) => pseudoById.has(entry.participantId));
  const othersOnline = present.some((entry) => entry.participantId !== selfId);
  return {
    onlineIds: new Set(present.map((entry) => entry.participantId)),
    proposingIds: new Set(
      present.filter((entry) => entry.proposing).map((entry) => entry.participantId)
    ),
    onlineCount: othersOnline ? present.length : 0,
    proposerNames: present
      .filter((entry) => entry.proposing && entry.participantId !== selfId)
      .map((entry) => pseudoById.get(entry.participantId) ?? ''),
  };
}
