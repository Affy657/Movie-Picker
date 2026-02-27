import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../api/client';
import type { EventData } from '../types/event';

interface CreateResponse extends EventData {
  shareUrl: string;
  hostToken: string;
}

const isDev = import.meta.env.DEV;

function getDefaultDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [title, setTitle] = useState(isDev ? 'Soirée test' : '');
  const [date, setDate] = useState(isDev ? getDefaultDate() : '');
  const [time, setTime] = useState(isDev ? '20:00' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchApi<CreateResponse>('/events', {
        method: 'POST',
        body: JSON.stringify({ title, date, time }),
      });
      const url = `${window.location.origin}/s/${res.slug}${res.hostToken ? `?host=${encodeURIComponent(res.hostToken)}` : ''}`;
      navigate(`/s/${res.slug}?host=${encodeURIComponent(res.hostToken)}`, { state: { shareUrl: url, justCreated: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Link to="/" className="back-link">← Accueil</Link>
      <h1>Créer une soirée</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <p className="error">{error}</p>}
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
    </main>
  );
}
