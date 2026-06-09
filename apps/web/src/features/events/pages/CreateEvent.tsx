import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings2 } from 'lucide-react';
import ThemeField from '@/features/events/components/ThemeField';
import NumberInput from '@/shared/components/NumberInput';
import { useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/shared/components/PageLayout';
import { createEvent as createEventApi, patchEventConfig } from '@/features/events/api/eventsApi';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { setStoredParticipant } from '@/features/events/storage';
import { ROUTES } from '@/app/routes';
import {
  DEFAULT_EVENT_CONFIG,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
} from '@/features/events/types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import styles from './CreateEvent.module.css';

function getDefaultDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultTime(): string {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  if (totalMin < 20 * 60) return '20:00';
  const ceil = Math.ceil(totalMin / 30) * 30;
  const h = Math.floor(ceil / 60) % 24;
  const m = ceil % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function CreateEvent() {
  useDocumentTitle(pageTitle('Nouvelle soirée'));

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (user && title === '') {
      setTitle(`Soirée film chez ${user.displayName}`);
    }
  }, [user, title]);
  const [date, setDate] = useState(getDefaultDate);
  const [time, setTime] = useState(getDefaultTime);
  const [themeEmoji, setThemeEmoji] = useState('');
  const [themeText, setThemeText] = useState('');
  const [themeColor, setThemeColor] = useState<number | null>(null);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [maxProposals, setMaxProposals] = useState('');

  const createAction = useCallback(async () => {
    const res = await createEventApi({ title, date, time });
    track('event_created');
    const publicUrl = `${window.location.origin}${ROUTES.eventDetail(res.slug)}`;
    if (res.creatorParticipant) {
      setStoredParticipant(res.slug, res.creatorParticipant.id, res.creatorParticipant.pseudo);
    }

    const themeTrimmed = [themeEmoji, themeText.trim()].filter(Boolean).join(' ');
    const maxPartParsed = maxParticipants.trim() === '' ? 0 : Number(maxParticipants);
    const maxPropParsed = maxProposals.trim() === '' ? 0 : Number(maxProposals);

    const needsConfigPatch =
      themeTrimmed !== '' ||
      themeColor !== null ||
      (Number.isFinite(maxPartParsed) && maxPartParsed > 0) ||
      (Number.isFinite(maxPropParsed) && maxPropParsed > 0);

    if (needsConfigPatch) {
      try {
        await patchEventConfig(res.slug, null, {
          theme: themeTrimmed,
          themeColor: themeColor ?? undefined,
          endDate: null,
          maxProposalsPerParticipant: Number.isFinite(maxPropParsed) ? maxPropParsed : 0,
          maxParticipants: Number.isFinite(maxPartParsed) ? maxPartParsed : 0,
          wheelMode: DEFAULT_EVENT_CONFIG.wheelMode,
          richSharePreview: true,
          allowSeries: DEFAULT_EVENT_CONFIG.allowSeries ?? false,
        });
      } catch {
        // Config patch is optional — event was already created, proceed to navigation
      }
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    navigate(ROUTES.eventDetail(res.slug), {
      state: { shareUrl: publicUrl, justCreated: true },
    });
  }, [
    title,
    date,
    time,
    themeEmoji,
    themeText,
    themeColor,
    maxParticipants,
    maxProposals,
    queryClient,
    navigate,
    track,
  ]);

  const { run: submit, loading, error } = useAsyncAction(createAction, 'Création impossible');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <PageLayout className={styles.layout}>
      <Link to={ROUTES.myEvents} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Mes soirées
      </Link>
      <div className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 className={styles.title}>Créer une soirée</h1>
        <p className={styles.description}>
          Donnez-lui un titre, une date et une heure. Vous pourrez ajuster les paramètres plus tard
          si besoin.
        </p>
        <form onSubmit={handleSubmit} className="form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <label className="label" htmlFor="create-title">
            Titre
          </label>
          <input
            id="create-title"
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Ex : Soirée film du vendredi"
          />
          <div className={styles.fieldGrid}>
            <div>
              <label className="label" htmlFor="create-date">
                Date
              </label>
              <input
                id="create-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="create-time">
                Heure
              </label>
              <input
                id="create-time"
                type="time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <details className={styles.advanced}>
            <summary className={styles.advancedSummary}>
              <Settings2 size={16} aria-hidden className={styles.advancedIcon} />
              <span className={styles.advancedLabel}>Options avancées (optionnel)</span>
              <span className={styles.advancedChevron} aria-hidden />
            </summary>
            <div className={styles.advancedBody}>
              <label className="label" htmlFor="create-theme">
                Thème / ambiance
              </label>
              <ThemeField
                textInputId="create-theme"
                emoji={themeEmoji}
                text={themeText}
                themeColor={themeColor}
                onEmojiChange={setThemeEmoji}
                onTextChange={setThemeText}
                onThemeColorChange={setThemeColor}
              />

              <div className={styles.fieldGrid}>
                <div>
                  <label className="label" htmlFor="create-max-participants">
                    Participants max
                  </label>
                  <NumberInput
                    id="create-max-participants"
                    value={maxParticipants}
                    onChange={setMaxParticipants}
                    min={1}
                    max={MAX_EVENT_PARTICIPANTS}
                    placeholder="Illimité"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="create-max-proposals">
                    Films par personne
                  </label>
                  <NumberInput
                    id="create-max-proposals"
                    value={maxProposals}
                    onChange={setMaxProposals}
                    min={1}
                    max={MAX_PROPOSALS_PER_PARTICIPANT}
                    placeholder="Illimité"
                  />
                </div>
              </div>
            </div>
          </details>

          <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
            {loading ? 'Création…' : 'Créer la soirée'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
