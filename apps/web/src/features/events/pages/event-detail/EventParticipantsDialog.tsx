import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import { eventFrontendUrl } from '@/features/events/api/eventsApi';
import { isCreatorParticipant } from '@/features/events/components/hostEventSettingsDraft';
import type { EventData } from '@/features/events/types';
import Button from '@/shared/components/Button';
import { ModalActions } from '@/shared/components/Modal';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useTranslation } from '@/shared/i18n';
import type { ParticipantRef, ParticipantsPanelState } from './eventDetailSessionTypes';
import styles from './EventParticipantsDialog.module.css';
import { isNightHost } from '@/features/events/lib/nightRules';

export default function EventParticipantsDialog({
  slug,
  event,
  participant,
  panel,
}: Readonly<{
  slug: string;
  event: EventData;
  participant: ParticipantRef | null;
  panel: ParticipantsPanelState;
}>) {
  const { t } = useTranslation();
  const { copied, copyLink } = useShareAction(
    eventFrontendUrl(slug),
    event.title,
    undefined,
    'event'
  );
  const hostCanInvite = isNightHost(event) && !event.isFinished;
  const currentParticipantId = participant?.participantId ?? null;
  const viewerIsCreator = isCreatorParticipant(event.myParticipant, event.participants);

  const leavePending =
    panel.isConnectedSelf && panel.removePending && panel.pendingRemovalId === currentParticipantId;

  const copyButton = (
    <Button variant="secondary" onClick={() => void copyLink()}>
      {copied ? t('share.copied') : t('share.copy')}
    </Button>
  );

  return (
    <ResponsiveDialog
      open={panel.open}
      onClose={panel.onClose}
      title={t('events.participants.title')}
      footer={
        <>
          {panel.canShowLeave ? (
            <Button
              variant="ghost"
              tone="danger"
              className={styles.leave}
              aria-label={t('events.participants.leaveAction')}
              onClick={panel.onLeave}
              disabled={leavePending}
              data-testid="leave-event-button"
            >
              {t('events.participants.leaveShort')}
            </Button>
          ) : null}
          {hostCanInvite ? (
            <ModalActions>
              {copyButton}
              <Button variant="primary" onClick={panel.onInviteFriends}>
                {t('events.participants.inviteAction')}
              </Button>
            </ModalActions>
          ) : (
            <div className={styles.single}>{copyButton}</div>
          )}
        </>
      }
    >
      {panel.coHostError ? (
        <p className="error" role="alert">
          {panel.coHostError}
        </p>
      ) : null}
      {panel.letBackInError ? (
        <p className="error" role="alert">
          {panel.letBackInError}
        </p>
      ) : null}
      <EventParticipantsList
        participants={event.participants}
        currentParticipantId={currentParticipantId}
        isHost={isNightHost(event)}
        pendingRemovalId={panel.pendingRemovalId}
        onRemoveParticipant={panel.canRemove ? panel.onRemove : undefined}
        viewerIsCreator={viewerIsCreator}
        pendingCoHostId={panel.pendingCoHostId}
        onToggleCoHost={viewerIsCreator ? panel.onToggleCoHost : undefined}
        coHostNamingClosed={!!event.isFinished}
        onlineIds={panel.onlineIds}
        proposingIds={panel.proposingIds}
        removedPeople={event.removedPeople}
        pendingLetBackInId={panel.pendingLetBackInId}
        onLetBackIn={panel.canRemove ? panel.onLetBackIn : undefined}
        letBackInStatus={panel.letBackInSuccess}
      />
    </ResponsiveDialog>
  );
}
