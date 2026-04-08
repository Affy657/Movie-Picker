import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchApi } from '../api/client';
import { ApiError } from '../api/apiError';
import { queryKeys } from '../hooks/queryKeys';
import { pageTitle, useDocumentTitle } from '../hooks/useDocumentTitle';
import type { MyEventSummary, MyEventsListResponse } from '../types/auth';
import { myEventLifecycleLabel, normalizeMyEventLifecycle } from '../utils/myEventLifecycle';

function EventListBlock({
  sectionId,
  heading,
  events,
  emptyHint,
}: {
  sectionId: string;
  heading: string;
  events: MyEventSummary[];
  emptyHint: string | null;
}) {
  if (events.length === 0) {
    if (!emptyHint) return null;
    return (
      <section className="my-events-section" aria-labelledby={sectionId}>
        <h2 id={sectionId} className="my-events-section-title">
          {heading}
        </h2>
        <p className="my-events-section-empty">{emptyHint}</p>
      </section>
    );
  }

  return (
    <section className="my-events-section" aria-labelledby={sectionId}>
      <h2 id={sectionId} className="my-events-section-title">
        {heading}
      </h2>
      <ul className="my-events-list">
        {events.map((ev) => {
          const lifecycle = normalizeMyEventLifecycle(ev.lifecycle);
          const badgeClass =
            lifecycle === 'upcoming'
              ? 'badge badge-event-upcoming'
              : lifecycle === 'live'
                ? 'badge badge-event-live'
                : 'badge badge-event-finished';
          return (
            <li key={ev.id} className="my-events-item">
              <Link to={`/s/${ev.slug}`} className="my-events-link">
                <span className="my-events-row-top">
                  <span className="my-events-title">{ev.title}</span>
                  {ev.isCreator ? (
                    <span className="badge badge-host" title="Vous organisez cette soirée">
                      Hôte
                    </span>
                  ) : null}
                </span>
                <span className="my-events-row-badges">
                  <span className={badgeClass}>{myEventLifecycleLabel(lifecycle)}</span>
                </span>
                <span className="my-events-meta">
                  {ev.date} · {ev.time}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function MyEventsPage() {
  useDocumentTitle(pageTitle('Mes soirées'));
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.myEvents.list,
    queryFn: () => fetchApi<MyEventsListResponse>('/events/mine'),
    retry: false,
  });

  useEffect(() => {
    if (!isError || !ApiError.is(error) || error.code !== 401) return;
    queryClient.setQueryData(queryKeys.auth.me, null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [isError, error, queryClient]);

  const { hosted, joinedOnly } = useMemo(() => {
    const events = data?.events ?? [];
    const hostedList = events.filter((e) => e.isCreator);
    const joinedList = events.filter((e) => !e.isCreator && e.isParticipant);
    return { hosted: hostedList, joinedOnly: joinedList };
  }, [data?.events]);

  if (isLoading) {
    return (
      <main className="page">
        <p className="placeholder">Chargement de vos soirées…</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="page">
        <p className="error">{error instanceof Error ? error.message : 'Erreur'}</p>
        <Link to="/connexion?returnTo=%2Fmes-soirees">Se reconnecter</Link>
      </main>
    );
  }

  const total = (data?.events ?? []).length;

  return (
    <main className="page">
      <h1>Mes soirées</h1>
      {total === 0 ? (
        <p className="lead">
          Aucune soirée pour l’instant. Créez-en une ou rejoignez une invitation.
        </p>
      ) : (
        <>
          <EventListBlock
            sectionId="my-events-hosted"
            heading="Soirées que vous organisez"
            events={hosted}
            emptyHint={null}
          />
          <EventListBlock
            sectionId="my-events-joined"
            heading="Soirées rejointes"
            events={joinedOnly}
            emptyHint={null}
          />
        </>
      )}
      <nav className="nav-actions">
        <Link to="/new" className="btn btn-primary">
          Nouvelle soirée
        </Link>
      </nav>
    </main>
  );
}
