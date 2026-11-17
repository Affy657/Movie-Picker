import type { MyEventSummary } from '@/features/events/types';
import PendingEventsSection from './PendingEventsSection';
import UpcomingEventsSection from './UpcomingEventsSection';
import type { MyEventsActions } from './useMyEventsActions';

interface ActiveEventsPanelProps {
  pendingEvents: MyEventSummary[];
  upcomingEvents: MyEventSummary[];
  actions: MyEventsActions;
}

export default function ActiveEventsPanel({
  pendingEvents,
  upcomingEvents,
  actions,
}: Readonly<ActiveEventsPanelProps>) {
  const closingSlug = actions.closeMutation.isPending ? (actions.confirmClose?.slug ?? null) : null;
  const titleOf = (slug: string) => pendingEvents.find((e) => e.slug === slug)?.title ?? '';

  return (
    <>
      {actions.leaveError ? (
        <p className="error" role="alert">
          {actions.leaveError}
        </p>
      ) : null}
      {actions.closeError ? (
        <p className="error" role="alert">
          {actions.closeError}
        </p>
      ) : null}
      <PendingEventsSection
        events={pendingEvents}
        onCloseWithoutMovie={(slug) => actions.handleCloseWithoutMovie(slug, titleOf(slug))}
        onFinishNight={(slug) => actions.handleFinishNight(slug, titleOf(slug))}
        closingSlug={closingSlug}
      />
      <UpcomingEventsSection events={upcomingEvents} onLeave={actions.handleLeaveEvent} />
    </>
  );
}
