import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/shared/components/PageLayout';
import { createEvent as createEventApi } from '@/features/events/api/eventsApi';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { setStoredParticipant } from '@/features/events/storage';
import { ROUTES } from '@/app/routes';

const isDev = import.meta.env.DEV;

function getDefaultDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function CreateEvent() {
  useDocumentTitle(pageTitle('Nouvelle soirée'));

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(isDev ? 'Soirée test' : '');
  const [date, setDate] = useState(isDev ? getDefaultDate() : '');
  const [time, setTime] = useState(isDev ? '20:00' : '');

  const createAction = useCallback(async () => {
    const res = await createEventApi({ title, date, time });
    const publicUrl = `${window.location.origin}${ROUTES.eventDetail(res.slug)}`;
    if (res.creatorParticipant) {
      setStoredParticipant(res.slug, res.creatorParticipant.id, res.creatorParticipant.pseudo);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    navigate(ROUTES.eventDetail(res.slug), {
      state: { shareUrl: publicUrl, justCreated: true },
    });
  }, [title, date, time, queryClient, navigate]);

  const { run: submit, loading, error } = useAsyncAction(createAction, 'Création impossible');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <PageLayout>
      <Link to={ROUTES.home} className="back-link">
        ← Accueil
      </Link>
      <h1>Créer une soirée</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label className="label">
          Titre
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Ex: Soirée film du vendredi"
          />
        </label>
        <label className="label">
          Date
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="label">
          Heure
          <input
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Création…' : 'Créer la soirée'}
        </button>
      </form>
    </PageLayout>
  );
}
