import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ThemeField, { parseTheme } from './ThemeField';
import NumberInput from '@/shared/components/NumberInput';
import { deleteEvent, patchEventConfig } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { ROUTES } from '@/app/routes';
import { clearStoredHostToken, removeStoredParticipant } from '@/features/events/storage';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import styles from './HostEventSettingsPanel.module.css';
import {
  datetimeLocalToEndDatePayload,
  isoToDatetimeLocalValue,
} from '@/shared/utils/eventDateTimeLocal';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  WheelMode,
} from '@/features/events/types';
import { DEFAULT_EVENT_CONFIG } from '@/features/events/types';
import { MAX_EVENT_PARTICIPANTS } from '@/features/events/types';
import { isWheelMode } from '@/shared/utils/wheelMode';
import { useTranslation } from '@/shared/i18n';

type HostEventSettingsPanelProps = {
  slug: string;
  hostToken: string | null;
  event: EventData;
};

function normalizeConfig(c: EventConfigData | undefined): EventConfigData {
  return {
    theme: c?.theme ?? DEFAULT_EVENT_CONFIG.theme,
    endDate: c?.endDate ?? DEFAULT_EVENT_CONFIG.endDate,
    maxProposalsPerParticipant:
      c?.maxProposalsPerParticipant ?? DEFAULT_EVENT_CONFIG.maxProposalsPerParticipant,
    maxParticipants: c?.maxParticipants ?? DEFAULT_EVENT_CONFIG.maxParticipants,
    wheelMode: c?.wheelMode ?? DEFAULT_EVENT_CONFIG.wheelMode,
    richSharePreview: c?.richSharePreview ?? DEFAULT_EVENT_CONFIG.richSharePreview,
    allowSeries: c?.allowSeries ?? DEFAULT_EVENT_CONFIG.allowSeries,
  };
}

export default function HostEventSettingsPanel({
  slug,
  hostToken,
  event,
}: HostEventSettingsPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cfg = normalizeConfig(event.config);
  const locked = !!event.isFinished || !!event.winnerMovie;

  const initialTheme = parseTheme(cfg.theme);
  const [themeEmoji, setThemeEmoji] = useState(initialTheme.emoji);
  const [themeText, setThemeText] = useState(initialTheme.text);
  const [endLocal, setEndLocal] = useState(isoToDatetimeLocalValue(cfg.endDate));
  const [maxProp, setMaxProp] = useState<string>(
    cfg.maxProposalsPerParticipant != null ? String(cfg.maxProposalsPerParticipant) : ''
  );
  const [maxParticipants, setMaxParticipants] = useState<string>(
    cfg.maxParticipants != null ? String(cfg.maxParticipants) : ''
  );
  const [wheelMode, setWheelMode] = useState<WheelMode>(cfg.wheelMode);
  const [allowSeries, setAllowSeries] = useState<boolean>(cfg.allowSeries ?? false);
  const [flashOk, setFlashOk] = useState(false);
  const flashTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  const [formError, setFormError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isConnectedCreator = useMemo(() => {
    if (!event.myParticipant) return false;
    const myId = event.myParticipant.id;
    return !!event.participants?.find((p) => p.id === myId)?.isCreator;
  }, [event.myParticipant, event.participants]);

  const hydrateFromEvent = useCallback(() => {
    const next = normalizeConfig(event.config);
    const parsed = parseTheme(next.theme);
    setThemeEmoji(parsed.emoji);
    setThemeText(parsed.text);
    setEndLocal(isoToDatetimeLocalValue(next.endDate));
    setMaxProp(
      next.maxProposalsPerParticipant != null ? String(next.maxProposalsPerParticipant) : ''
    );
    setMaxParticipants(next.maxParticipants != null ? String(next.maxParticipants) : '');
    setWheelMode(next.wheelMode);
    setAllowSeries(next.allowSeries ?? false);
    setFormError(null);
  }, [event.config]);

  const mutation = useMutation({
    mutationFn: (body: EventConfigPatchPayload) => patchEventConfig(slug, hostToken, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      setFlashOk(true);
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlashOk(false), 4000);
    },
    onError: (e) => {
      setFormError(getErrorMessage(e, 'Enregistrement impossible'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(slug),
    onSuccess: async () => {
      removeStoredParticipant(slug);
      clearStoredHostToken(slug);
      queryClient.removeQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      navigate(ROUTES.myEvents);
    },
    onError: (e) => {
      setDeleteError(getErrorMessage(e, t('events.danger.deleteError')));
    },
    onSettled: () => {
      setConfirmDeleteOpen(false);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const endPayload = datetimeLocalToEndDatePayload(endLocal);
    if (endLocal.trim() && !endPayload) {
      setFormError('Date de fin invalide.');
      return;
    }

    let maxProposalsPerParticipant = 0;
    if (maxProp.trim() !== '') {
      const n = Number(maxProp);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        setFormError(
          'Limite de propositions : nombre entier entre 1 et 100, ou vide pour illimité.'
        );
        return;
      }
      maxProposalsPerParticipant = n;
    }

    let maxParticipantsValue = 0;
    if (maxParticipants.trim() !== '') {
      const n = Number(maxParticipants);
      if (!Number.isInteger(n) || n < 1 || n > MAX_EVENT_PARTICIPANTS) {
        setFormError(t('events.settings.maxParticipantsInvalid', { max: MAX_EVENT_PARTICIPANTS }));
        return;
      }
      const currentCount = event.participantCount ?? 0;
      if (n < currentCount) {
        setFormError(
          t('events.settings.maxParticipantsBelowCurrent', { value: n, count: currentCount })
        );
        return;
      }
      maxParticipantsValue = n;
    }

    mutation.mutate({
      theme: [themeEmoji, themeText.trim()].filter(Boolean).join(' '),
      endDate: endPayload,
      maxProposalsPerParticipant,
      maxParticipants: maxParticipantsValue,
      wheelMode,
      richSharePreview: cfg.richSharePreview ?? true,
      allowSeries,
    });
  };

  return (
    <details
      className={styles.root}
      onToggle={(ev) => {
        const el = ev.currentTarget;
        if (el.open) hydrateFromEvent();
      }}
    >
      <summary className={styles.summary}>
        <Settings2 size={18} aria-hidden className={styles.summaryIcon} />
        <span className={styles.summaryLabel}>Paramètres de la soirée</span>
        <span className={styles.summaryChevron} aria-hidden />
      </summary>
      {locked && (
        <p className={styles.locked}>
          Cette soirée n&apos;est plus modifiable (terminée ou roue déjà lancée).
        </p>
      )}
      {flashOk && (
        <p className={styles.successBanner} role="status" aria-live="polite">
          Paramètres enregistrés.
        </p>
      )}
      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}
      <form className={`form ${styles.form}`} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className="label" htmlFor="host-cfg-theme">
            Thème / ambiance
          </label>
          <ThemeField
            textInputId="host-cfg-theme"
            emoji={themeEmoji}
            text={themeText}
            onEmojiChange={setThemeEmoji}
            onTextChange={setThemeText}
            disabled={locked || mutation.isPending}
          />
        </div>

        <div className={styles.field}>
          <label className="label" htmlFor="host-cfg-end">
            Fin de validité (optionnel)
          </label>
          <input
            id="host-cfg-end"
            className="input"
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            disabled={locked || mutation.isPending}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className="label" htmlFor="host-cfg-max">
              Films par personne
            </label>
            <NumberInput
              id="host-cfg-max"
              value={maxProp}
              onChange={setMaxProp}
              min={1}
              max={100}
              placeholder="Illimité"
              disabled={locked || mutation.isPending}
            />
          </div>

          <div className={styles.field}>
            <label className="label" htmlFor="host-cfg-max-participants">
              {t('events.settings.maxParticipantsLabel')}
            </label>
            <NumberInput
              id="host-cfg-max-participants"
              value={maxParticipants}
              onChange={setMaxParticipants}
              min={1}
              max={MAX_EVENT_PARTICIPANTS}
              placeholder={t('events.settings.maxParticipantsPlaceholder')}
              disabled={locked || mutation.isPending}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className="label" htmlFor="host-cfg-wheel">
            Mode de la roue
          </label>
          <select
            id="host-cfg-wheel"
            className={`input ${styles.select}`}
            value={wheelMode}
            onChange={(e) => {
              const v = e.target.value;
              if (isWheelMode(v)) setWheelMode(v);
            }}
            disabled={locked || mutation.isPending}
          >
            <option value="strictRandom">Aléatoire strict (égalité)</option>
            <option value="weightedByVotes">Pondéré par les votes</option>
          </select>
        </div>

        <div className={styles.checkboxRow}>
          <label className={styles.checkboxLabel}>
            <span>{t('events.settings.allowSeriesLabel')}</span>
            <input
              type="checkbox"
              role="switch"
              aria-checked={allowSeries}
              checked={allowSeries}
              onChange={(e) => setAllowSeries(e.target.checked)}
              disabled={locked || mutation.isPending}
            />
            <span className={styles.toggleTrack}>
              <span className={styles.toggleThumb} />
            </span>
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={locked || mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {isConnectedCreator && (
        <section
          className={styles.dangerZone}
          aria-labelledby={`host-danger-title-${slug}`}
          data-testid="host-danger-zone"
        >
          <h3 id={`host-danger-title-${slug}`} className={styles.dangerTitle}>
            {t('events.danger.sectionTitle')}
          </h3>
          <p className={styles.dangerLead}>{t('events.danger.sectionDescription')}</p>
          {deleteError && (
            <p className="error" role="alert">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              setDeleteError(null);
              setConfirmDeleteOpen(true);
            }}
            disabled={deleteMutation.isPending}
            data-testid="delete-event-button"
          >
            {deleteMutation.isPending
              ? t('events.danger.deleting')
              : t('events.danger.deleteButton')}
          </button>
        </section>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('events.danger.deleteConfirmTitle')}
        message={t('events.danger.deleteConfirmMessage', { title: event.title })}
        confirmLabel={t('events.danger.deleteConfirmAction')}
        confirmVariant="danger"
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDeleteOpen(false)}
        testId="delete-event-confirm-dialog"
      />
    </details>
  );
}
