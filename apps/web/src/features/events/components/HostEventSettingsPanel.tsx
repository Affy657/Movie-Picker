import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { AlertCircle, ChevronDown, Settings, Sparkles, Trash2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ThemeField, { parseTheme } from './ThemeField';
import WheelModeField from './WheelModeField';
import NumberInput from '@/shared/components/NumberInput';
import Toggle from '@/shared/components/Toggle';
import SegmentedRadioGroup from '@/app/components/SegmentedRadioGroup';
import { deleteEvent, patchEventConfig } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { ROUTES } from '@/app/routes';
import { clearStoredHostToken, removeStoredParticipant } from '@/features/events/storage';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import dragStyles from '@/shared/components/sheetDrag.module.css';
import Modal from '@/shared/components/Modal';
import styles from './HostEventSettingsPanel.module.css';
import { eventDateTimeToLocal, splitDateTimeLocal } from '@/shared/utils/eventDateTimeLocal';
import { formatRelativeEventDate } from '@/shared/utils/formatRelativeEventDate';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  EventRecurrence,
  WheelMode,
} from '@/features/events/types';
import {
  DEFAULT_EVENT_CONFIG,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
} from '@/features/events/types';
import { useLocale, useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';

type HostEventSettingsPanelProps = {
  slug: string;
  hostToken: string | null;
  event: EventData;

  open: boolean;

  onClose: () => void;
};

type FieldErrors = {
  title?: string;
  date?: string;
  maxProposals?: string;
  maxParticipants?: string;
};

type SaveState = 'saved' | 'pending' | 'error';

function recurrencePatch(
  next: EventRecurrence | null,
  current: EventRecurrence | null
): Partial<EventConfigPatchPayload> {
  if (next === current) return {};
  return next === null ? { clearRecurrence: true } : { recurrence: next };
}

function normalizeConfig(c: EventConfigData | undefined): EventConfigData {
  return {
    theme: c?.theme ?? DEFAULT_EVENT_CONFIG.theme,
    maxProposalsPerParticipant: c?.maxProposalsPerParticipant ?? MAX_PROPOSALS_PER_PARTICIPANT,
    maxParticipants: c?.maxParticipants ?? MAX_EVENT_PARTICIPANTS,
    wheelMode: c?.wheelMode ?? DEFAULT_EVENT_CONFIG.wheelMode,
    richSharePreview: c?.richSharePreview ?? DEFAULT_EVENT_CONFIG.richSharePreview,
    allowSeries: c?.allowSeries ?? DEFAULT_EVENT_CONFIG.allowSeries,
    recurrence: c?.recurrence ?? null,
    hasNextOccurrence: c?.hasNextOccurrence ?? false,
  };
}

export default function HostEventSettingsPanel({
  slug,
  hostToken,
  event,
  open,
  onClose,
}: Readonly<HostEventSettingsPanelProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const cfg = normalizeConfig(event.config);

  const [eventTitle, setEventTitle] = useState(event.title);
  const initialTheme = parseTheme(cfg.theme);
  const [themeEmoji, setThemeEmoji] = useState(initialTheme.emoji);
  const [themeText, setThemeText] = useState(initialTheme.text);
  const [themeOpen, setThemeOpen] = useState(false);
  const [eventDateLocal, setEventDateLocal] = useState(
    eventDateTimeToLocal(event.date, event.time)
  );
  const initialDateLocalRef = useRef(eventDateTimeToLocal(event.date, event.time));
  const [notifyDateChange, setNotifyDateChange] = useState(true);
  const [maxProp, setMaxProp] = useState<string>(String(cfg.maxProposalsPerParticipant));
  const [maxParticipants, setMaxParticipants] = useState<string>(String(cfg.maxParticipants));
  const [wheelMode, setWheelMode] = useState<WheelMode>(cfg.wheelMode);
  const [allowSeries, setAllowSeries] = useState<boolean>(cfg.allowSeries ?? false);
  const [recurrence, setRecurrence] = useState<EventRecurrence | null>(cfg.recurrence ?? null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const performSaveRef = useRef<() => void>(() => {});

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

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
    setEventTitle(event.title);
    const parsed = parseTheme(next.theme);
    setThemeEmoji(parsed.emoji);
    setThemeText(parsed.text);
    setThemeOpen(false);
    const nextDateLocal = eventDateTimeToLocal(event.date, event.time);
    setEventDateLocal(nextDateLocal);
    initialDateLocalRef.current = nextDateLocal;
    setNotifyDateChange(true);
    setMaxProp(String(next.maxProposalsPerParticipant));
    setMaxParticipants(String(next.maxParticipants));
    setWheelMode(next.wheelMode);
    setAllowSeries(next.allowSeries ?? false);
    setRecurrence(next.recurrence ?? null);
    setFieldErrors({});
    setSaveError(null);
    setSaveState('saved');
  }, [event.title, event.config, event.date, event.time]);

  const titleId = useId();
  const themeCollapseId = useId();
  const dateHintId = useId();
  const maxProposalsErrorId = useId();
  const maxParticipantsErrorId = useId();
  const wheelModeLabelId = useId();

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) hydrateFromEvent();
    wasOpenRef.current = open;
  }, [open, hydrateFromEvent]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  const mutation = useMutation({
    mutationFn: (body: EventConfigPatchPayload) => patchEventConfig(slug, hostToken, body),
    onSuccess: async () => {
      setSaveState('saved');
      setSaveError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    },
    onError: (e) => {
      setSaveState('error');
      setSaveError(getErrorMessage(e, t('events.settings.fallbackError')));
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

  const scheduleAutoSave = useCallback((immediate = false) => {
    setSaveState('pending');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => performSaveRef.current(), immediate ? 0 : 600);
  }, []);

  performSaveRef.current = () => {
    const errors: FieldErrors = {};

    if (!eventTitle.trim()) {
      errors.title = t('events.settings.titleRequired');
    }

    const eventDateTime = eventDateLocal.trim() ? splitDateTimeLocal(eventDateLocal) : null;
    if (!eventDateLocal.trim()) {
      errors.date = t('events.settings.dateRequired');
    } else if (!eventDateTime) {
      errors.date = t('events.settings.dateInvalid');
    }

    let maxProposalsPerParticipant = MAX_PROPOSALS_PER_PARTICIPANT;
    const maxPropNum = Number(maxProp);
    if (
      maxProp.trim() === '' ||
      !Number.isInteger(maxPropNum) ||
      maxPropNum < 1 ||
      maxPropNum > MAX_PROPOSALS_PER_PARTICIPANT
    ) {
      errors.maxProposals = t('events.settings.maxProposalsInvalid', {
        max: MAX_PROPOSALS_PER_PARTICIPANT,
      });
    } else {
      maxProposalsPerParticipant = maxPropNum;
    }

    let maxParticipantsValue = MAX_EVENT_PARTICIPANTS;
    const maxPartNum = Number(maxParticipants);
    const currentCount = event.participantCount ?? 0;
    if (
      maxParticipants.trim() === '' ||
      !Number.isInteger(maxPartNum) ||
      maxPartNum < 1 ||
      maxPartNum > MAX_EVENT_PARTICIPANTS
    ) {
      errors.maxParticipants = t('events.settings.maxParticipantsInvalid', {
        max: MAX_EVENT_PARTICIPANTS,
      });
    } else if (maxPartNum < currentCount) {
      errors.maxParticipants = t('events.settings.maxParticipantsBelowCurrent', {
        value: maxPartNum,
        count: currentCount,
      });
    } else {
      maxParticipantsValue = maxPartNum;
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSaveState('error');
      return;
    }

    mutation.mutate({
      ...(eventTitle.trim() !== event.title ? { title: eventTitle.trim() } : {}),
      theme: [themeEmoji, themeText.trim()].filter(Boolean).join(' '),
      maxProposalsPerParticipant,
      maxParticipants: maxParticipantsValue,
      wheelMode,
      richSharePreview: cfg.richSharePreview ?? true,
      allowSeries,
      ...recurrencePatch(recurrence, cfg.recurrence ?? null),
      ...(eventDateTime ? { date: eventDateTime.date, time: eventDateTime.time } : {}),
      notifyParticipantsOfDateChange: notifyDateChange,
    });
  };

  const recurrenceLocked = cfg.hasNextOccurrence ?? false;
  const recurrenceOptions = useMemo(
    () => [
      { value: 'weekly' as const, label: t('events.settings.recurrenceWeekly') },
      { value: 'biweekly' as const, label: t('events.settings.recurrenceBiweekly') },
      { value: 'monthly' as const, label: t('events.settings.recurrenceMonthly') },
    ],
    [t]
  );

  const liveDateTime = eventDateLocal.trim() ? splitDateTimeLocal(eventDateLocal) : null;
  const relativeDateLabel = liveDateTime
    ? formatRelativeEventDate(liveDateTime.date, locale)
    : null;
  const dateWasEdited = eventDateLocal !== initialDateLocalRef.current;
  const themePreview = [themeEmoji, themeText.trim()].filter(Boolean).join(' ');

  const saveStatusLabel =
    saveState === 'pending'
      ? t('events.settings.saveStatusPending')
      : saveState === 'error'
        ? t('events.settings.saveStatusError')
        : t('events.settings.saveStatusSaved');

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      surface="borderless"
      bottomSheetOnMobile
      column
      labelledBy={titleId}
      dialogRef={dialogRef}
      className={clsx(styles.dialog, dragStyles.surface)}
    >
      <div className={dragStyles.grab} {...dragBind}>
        <span className={clsx(dragStyles.handle, dragStyles.handleMobileOnly)} aria-hidden="true" />
        <div className={styles.panelHead}>
          <Settings size={18} aria-hidden className={styles.summaryIcon} />
          <h2 id={titleId} className={styles.panelTitle}>
            {t('events.settings.title')}
          </h2>
          <span
            className={clsx(
              styles.saveStatus,
              saveState === 'pending' && styles.saveStatusPending,
              saveState === 'error' && styles.saveStatusError,
              saveState === 'saved' && styles.saveStatusSaved
            )}
          >
            <span className={styles.saveStatusDot} aria-hidden />
            <span>{saveStatusLabel}</span>
          </span>
          <button
            type="button"
            className={styles.panelClose}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div className={styles.dialogBody}>
        {saveError && (
          <p className="error" role="alert">
            {saveError}
          </p>
        )}
        <form className={`form ${styles.form}`}>
          <div className={styles.section}>
            <div className={styles.field}>
              <label className="label" htmlFor="host-cfg-title">
                {t('events.settings.titleLabel')}
              </label>
              <input
                id="host-cfg-title"
                className="input"
                type="text"
                value={eventTitle}
                onChange={(e) => {
                  setEventTitle(e.target.value);
                  scheduleAutoSave();
                }}
                maxLength={200}
                placeholder={t('events.settings.titlePlaceholder')}
                aria-invalid={!!fieldErrors.title || undefined}
              />
              {fieldErrors.title && (
                <p className={styles.fieldError}>
                  <AlertCircle size={12} aria-hidden />
                  <span>{fieldErrors.title}</span>
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className="label" htmlFor="host-cfg-datetime">
                {t('events.settings.dateTimeLabel')}
              </label>
              <input
                id="host-cfg-datetime"
                className="input"
                type="datetime-local"
                value={eventDateLocal}
                onChange={(e) => {
                  setEventDateLocal(e.target.value);
                  scheduleAutoSave();
                }}
                aria-invalid={!!fieldErrors.date || undefined}
                aria-describedby={!fieldErrors.date && relativeDateLabel ? dateHintId : undefined}
              />
              {fieldErrors.date ? (
                <p className={styles.fieldError}>
                  <AlertCircle size={12} aria-hidden />
                  <span>{fieldErrors.date}</span>
                </p>
              ) : (
                relativeDateLabel && (
                  <p id={dateHintId} className="hint">
                    {t('events.settings.dateHint', { relative: relativeDateLabel })}
                  </p>
                )
              )}
              {dateWasEdited && !fieldErrors.date && (
                <label className={styles.notifyRow}>
                  <input
                    type="checkbox"
                    className={styles.notifyCheckbox}
                    checked={notifyDateChange}
                    onChange={(e) => setNotifyDateChange(e.target.checked)}
                  />
                  <span>{t('events.settings.notifyDateChangeLabel')}</span>
                </label>
              )}
            </div>

            <div className={styles.field}>
              <div className={clsx(styles.themeCard, themeOpen && styles.themeCardOpen)}>
                <button
                  type="button"
                  className={styles.themeTrigger}
                  aria-expanded={themeOpen}
                  aria-controls={themeCollapseId}
                  onClick={() => setThemeOpen((v) => !v)}
                >
                  <span className={styles.themeBadge} aria-hidden>
                    {themeEmoji || (themePreview ? '🎬' : <Sparkles size={18} />)}
                  </span>
                  <span className={styles.themeInfo}>
                    <span className={styles.themeTitle}>
                      {themePreview || t('events.settings.themeEmptyTitle')}
                    </span>
                    <span className={styles.themeSubtitle}>
                      {themePreview
                        ? t('events.settings.themeLabel')
                        : t('events.settings.themeEmptySubtitle')}
                    </span>
                  </span>
                  <ChevronDown size={18} aria-hidden className={styles.themeChevron} />
                </button>
                {themeOpen && (
                  <div id={themeCollapseId} className={styles.themeExpanded}>
                    {themePreview && (
                      <button
                        type="button"
                        className={styles.clearThemeBtn}
                        onClick={() => {
                          setThemeEmoji('');
                          setThemeText('');
                          scheduleAutoSave();
                        }}
                        aria-label={t('events.settings.clearThemeAria')}
                      >
                        <X size={11} strokeWidth={2.5} />
                        <span>{t('events.settings.clearThemeButton')}</span>
                      </button>
                    )}
                    <ThemeField
                      textInputId="host-cfg-theme"
                      emoji={themeEmoji}
                      text={themeText}
                      onEmojiChange={(v) => {
                        setThemeEmoji(v);
                        scheduleAutoSave();
                      }}
                      onTextChange={(v) => {
                        setThemeText(v);
                        scheduleAutoSave();
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('events.settings.sectionFlow')}</h3>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className="label" htmlFor="host-cfg-max">
                  {t('events.settings.maxProposalsLabel')}
                </label>
                <NumberInput
                  id="host-cfg-max"
                  value={maxProp}
                  onChange={(v) => {
                    setMaxProp(v);
                    scheduleAutoSave();
                  }}
                  min={1}
                  max={MAX_PROPOSALS_PER_PARTICIPANT}
                  invalid={!!fieldErrors.maxProposals}
                  ariaDescribedBy={fieldErrors.maxProposals ? maxProposalsErrorId : undefined}
                />
                {fieldErrors.maxProposals ? (
                  <p id={maxProposalsErrorId} className={styles.fieldError}>
                    <AlertCircle size={12} aria-hidden />
                    <span>{fieldErrors.maxProposals}</span>
                  </p>
                ) : (
                  <p className="hint">
                    {t('events.settings.maxProposalsHint', { max: MAX_PROPOSALS_PER_PARTICIPANT })}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label className="label" htmlFor="host-cfg-max-participants">
                  {t('events.settings.maxParticipantsLabel')}
                </label>
                <NumberInput
                  id="host-cfg-max-participants"
                  value={maxParticipants}
                  onChange={(v) => {
                    setMaxParticipants(v);
                    scheduleAutoSave();
                  }}
                  min={1}
                  max={MAX_EVENT_PARTICIPANTS}
                  invalid={!!fieldErrors.maxParticipants}
                  ariaDescribedBy={fieldErrors.maxParticipants ? maxParticipantsErrorId : undefined}
                />
                {fieldErrors.maxParticipants ? (
                  <p id={maxParticipantsErrorId} className={styles.fieldError}>
                    <AlertCircle size={12} aria-hidden />
                    <span>{fieldErrors.maxParticipants}</span>
                  </p>
                ) : (
                  <p className="hint">
                    {(event.participantCount ?? 0) === 1
                      ? t('events.settings.maxParticipantsHintOne', {
                          max: MAX_EVENT_PARTICIPANTS,
                        })
                      : t('events.settings.maxParticipantsHintMany', {
                          count: event.participantCount ?? 0,
                          max: MAX_EVENT_PARTICIPANTS,
                        })}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <span className="label" id={wheelModeLabelId}>
                {t('events.settings.wheelModeLabel')}
              </span>
              <WheelModeField
                name="host-cfg-wheel-mode"
                value={wheelMode}
                labelId={wheelModeLabelId}
                onChange={(mode) => {
                  setWheelMode(mode);
                  scheduleAutoSave(true);
                }}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.toggleRow}>
                <span>
                  <span className={styles.toggleName}>{t('events.settings.allowSeriesLabel')}</span>
                  <span className={styles.toggleDesc}>{t('events.settings.allowSeriesDesc')}</span>
                </span>
                <Toggle
                  checked={allowSeries}
                  label={t('events.settings.allowSeriesLabel')}
                  onChange={() => {
                    setAllowSeries((v) => !v);
                    scheduleAutoSave(true);
                  }}
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.toggleRow}>
                <span>
                  <span className={styles.toggleName}>{t('events.settings.recurrenceLabel')}</span>
                  <span className={styles.toggleDesc}>{t('events.settings.recurrenceDesc')}</span>
                </span>
                <Toggle
                  checked={recurrence !== null}
                  label={t('events.settings.recurrenceLabel')}
                  disabled={recurrenceLocked}
                  onChange={() => {
                    setRecurrence((v) => (v === null ? 'weekly' : null));
                    scheduleAutoSave(true);
                  }}
                />
              </div>
              {recurrence !== null && !recurrenceLocked && (
                <div className={styles.recurrenceRhythm}>
                  <SegmentedRadioGroup
                    className={styles.recurrenceSegments}
                    options={recurrenceOptions}
                    value={recurrence}
                    size="sm"
                    ariaLabel={t('events.settings.recurrenceGroupLabel')}
                    onChange={(value) => {
                      setRecurrence(value);
                      scheduleAutoSave(true);
                    }}
                  />
                  <p className="hint">{t('events.settings.recurrenceShareHint')}</p>
                </div>
              )}
              {recurrenceLocked && (
                <p className="hint">{t('events.settings.recurrenceLockedHint')}</p>
              )}
            </div>
          </div>
        </form>

        {isConnectedCreator && (
          <div className={styles.dangerSection} data-testid="host-danger-zone">
            <h3 className={clsx(styles.sectionTitle, styles.dangerTitle)}>
              {t('events.danger.sectionTitle')}
            </h3>
            <p className={styles.dangerLead}>{t('events.danger.sectionDescription')}</p>
            {deleteError && (
              <p className="error" role="alert">
                {deleteError}
              </p>
            )}
            <Button
              type="button"
              variant="danger"
              className={styles.deleteBtn}
              onClick={() => {
                setDeleteError(null);
                setConfirmDeleteOpen(true);
              }}
              disabled={deleteMutation.isPending}
              data-testid="delete-event-button"
            >
              <Trash2 size={15} aria-hidden />
              <span>
                {deleteMutation.isPending
                  ? t('events.danger.deleting')
                  : t('events.danger.deleteButton')}
              </span>
            </Button>
          </div>
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
      </div>
    </Modal>
  );
}
