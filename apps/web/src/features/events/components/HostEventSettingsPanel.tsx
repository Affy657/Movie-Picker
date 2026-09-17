import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { Lock, Settings, Trash2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import HostEventDateField from './HostEventDateField';
import HostEventThemeField from './HostEventThemeField';
import WheelModeField from './WheelModeField';
import EventTemplateSaveBar from './EventTemplateSaveBar';
import EventTemplatesRow from './EventTemplatesRow';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  buildTemplateDraft,
  configToFields,
  type ApplicableConfig,
} from '@/features/events/lib/eventTemplateDraft';
import NumberInput from '@/shared/components/NumberInput';
import Field from '@/shared/components/Field';
import ToggleRow from '@/shared/components/ToggleRow';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { deleteEvent, patchEventConfig } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { ROUTES } from '@/app/routes';
import { clearStoredHostToken, removeStoredParticipant } from '@/features/events/storage';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import dragStyles from '@/shared/components/SheetDrag.module.css';
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
  MAX_WINNERS_PER_EVENT,
} from '@/features/events/types';
import { useLocale, useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
  maxVotes?: string;
  winnerCount?: string;
};

type SaveState = 'saved' | 'pending' | 'error';

const SAVE_STATUS_LABEL_KEYS = {
  saved: 'events.settings.saveStatusSaved',
  pending: 'events.settings.saveStatusPending',
  error: 'events.settings.saveStatusError',
} as const satisfies Record<SaveState, string>;

const SAVE_STATUS_CLASS: Record<SaveState, string | undefined> = {
  saved: styles.saveStatusSaved,
  pending: styles.saveStatusPending,
  error: styles.saveStatusError,
};

function recurrencePatch(
  next: EventRecurrence | null,
  current: EventRecurrence | null
): Partial<EventConfigPatchPayload> {
  if (next === current) return {};
  return next === null ? { clearRecurrence: true } : { recurrence: next };
}

function titlePatch(next: string, current: string): Partial<EventConfigPatchPayload> {
  return next !== current ? { title: next } : {};
}

function dateTimePatch(
  parsed: ReturnType<typeof splitDateTimeLocal>,
  edited: boolean,
  notifyParticipants: boolean
): Partial<EventConfigPatchPayload> {
  if (!parsed || !edited) return {};
  return {
    date: parsed.date,
    time: parsed.time,
    notifyParticipantsOfDateChange: notifyParticipants,
  };
}

function isCreatorParticipant(
  myParticipant: HostEventSettingsPanelProps['event']['myParticipant'],
  participants: HostEventSettingsPanelProps['event']['participants']
): boolean {
  if (!myParticipant) return false;
  const myId = myParticipant.id;
  return !!participants?.find((p) => p.id === myId)?.isCreator;
}

function normalizeConfig(c: EventConfigData | undefined): EventConfigData {
  return {
    theme: c?.theme ?? DEFAULT_EVENT_CONFIG.theme,
    maxProposalsPerParticipant: c?.maxProposalsPerParticipant ?? MAX_PROPOSALS_PER_PARTICIPANT,
    maxParticipants: c?.maxParticipants ?? MAX_EVENT_PARTICIPANTS,
    maxVotesPerParticipant: c?.maxVotesPerParticipant ?? null,
    wheelMode: c?.wheelMode ?? DEFAULT_EVENT_CONFIG.wheelMode,
    richSharePreview: c?.richSharePreview ?? DEFAULT_EVENT_CONFIG.richSharePreview,
    allowSeries: c?.allowSeries ?? DEFAULT_EVENT_CONFIG.allowSeries,
    recurrence: c?.recurrence ?? null,
    hasNextOccurrence: c?.hasNextOccurrence ?? false,
    winnerCount: c?.winnerCount ?? DEFAULT_EVENT_CONFIG.winnerCount,
  };
}

type Translate = ReturnType<typeof useTranslation>['t'];

type SettingsDraft = {
  eventTitle: string;
  eventDateLocal: string;
  maxProp: string;
  maxParticipants: string;
  voteLimitEnabled: boolean;
  maxVotes: string;
  winnerCount: string;
  currentParticipantCount: number;
  drawnWinnerCount: number;
};

function validateTitle(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  if (!draft.eventTitle.trim()) errors.title = t('events.settings.titleRequired');
}

function validateDate(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const trimmed = draft.eventDateLocal.trim();
  if (!trimmed) {
    errors.date = t('events.settings.dateRequired');
    return null;
  }
  const parsed = splitDateTimeLocal(draft.eventDateLocal);
  if (!parsed) errors.date = t('events.settings.dateInvalid');
  return parsed;
}

function validateMaxProposals(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const value = Number(draft.maxProp);
  const valid =
    draft.maxProp.trim() !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_PROPOSALS_PER_PARTICIPANT;
  if (valid) return value;
  errors.maxProposals = t('events.settings.maxProposalsInvalid', {
    max: MAX_PROPOSALS_PER_PARTICIPANT,
  });
  return MAX_PROPOSALS_PER_PARTICIPANT;
}

function validateMaxParticipants(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const value = Number(draft.maxParticipants);
  const withinBounds =
    draft.maxParticipants.trim() !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_EVENT_PARTICIPANTS;

  if (!withinBounds) {
    errors.maxParticipants = t('events.settings.maxParticipantsInvalid', {
      max: MAX_EVENT_PARTICIPANTS,
    });
    return MAX_EVENT_PARTICIPANTS;
  }

  if (value < draft.currentParticipantCount) {
    errors.maxParticipants = t('events.settings.maxParticipantsBelowCurrent', {
      value,
      count: draft.currentParticipantCount,
    });
    return MAX_EVENT_PARTICIPANTS;
  }

  return value;
}

function maxParticipantsHintFor(participantCount: number, t: Translate): string {
  if (participantCount === 1) {
    return t('events.settings.maxParticipantsHintOne', { max: MAX_EVENT_PARTICIPANTS });
  }
  return t('events.settings.maxParticipantsHintMany', {
    count: participantCount,
    max: MAX_EVENT_PARTICIPANTS,
  });
}

function validateMaxVotes(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  if (!draft.voteLimitEnabled) return null;
  const value = Number(draft.maxVotes.trim());
  if (draft.maxVotes.trim() !== '' && Number.isInteger(value) && value >= 1) return value;
  errors.maxVotes = t('events.settings.maxVotesInvalid');
  return null;
}

function validateWinnerCount(draft: SettingsDraft, t: Translate, errors: FieldErrors) {
  const value = Number(draft.winnerCount);
  const withinBounds =
    draft.winnerCount.trim() !== '' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_WINNERS_PER_EVENT;

  if (!withinBounds) {
    errors.winnerCount = t('events.settings.winnerCountInvalid', { max: MAX_WINNERS_PER_EVENT });
    return null;
  }

  if (value < draft.drawnWinnerCount) {
    errors.winnerCount = t('events.settings.winnerCountLockedHint', {
      count: draft.drawnWinnerCount,
    });
    return null;
  }

  return value;
}

function validateSettingsDraft(draft: SettingsDraft, t: Translate) {
  const errors: FieldErrors = {};
  validateTitle(draft, t, errors);
  const eventDateTime = validateDate(draft, t, errors);
  const maxProposalsPerParticipant = validateMaxProposals(draft, t, errors);
  const maxParticipantsValue = validateMaxParticipants(draft, t, errors);
  const maxVotesPerParticipant = validateMaxVotes(draft, t, errors);
  const winnerCount = validateWinnerCount(draft, t, errors);
  return {
    errors,
    maxProposalsPerParticipant,
    maxParticipantsValue,
    maxVotesPerParticipant,
    winnerCount,
    eventDateTime,
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
  const drawnWinnerCount = event.winners?.length ?? 0;
  const initialFields = configToFields(cfg);

  const [eventTitle, setEventTitle] = useState(event.title);
  const [themeEmoji, setThemeEmoji] = useState(initialFields.themeEmoji);
  const [themeText, setThemeText] = useState(initialFields.themeText);
  const [themeOpen, setThemeOpen] = useState(false);
  const [eventDateLocal, setEventDateLocal] = useState(
    eventDateTimeToLocal(event.date, event.time)
  );
  const initialDateLocalRef = useRef(eventDateTimeToLocal(event.date, event.time));
  const [notifyDateChange, setNotifyDateChange] = useState(true);
  const [maxProp, setMaxProp] = useState(initialFields.maxProposals);
  const [maxParticipants, setMaxParticipants] = useState(initialFields.maxParticipants);
  const [voteLimitEnabled, setVoteLimitEnabled] = useState(initialFields.voteLimitEnabled);
  const [maxVotes, setMaxVotes] = useState(initialFields.maxVotes);
  const [wheelMode, setWheelMode] = useState<WheelMode>(initialFields.wheelMode);
  const [allowSeries, setAllowSeries] = useState(initialFields.allowSeries);
  const [richSharePreview, setRichSharePreview] = useState(initialFields.richSharePreview);
  const [recurrence, setRecurrence] = useState<EventRecurrence | null>(cfg.recurrence ?? null);
  const [winnerCount, setWinnerCount] = useState(initialFields.winnerCount);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const performSaveRef = useRef<() => void>(() => {});

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const maxParticipantsHint = maxParticipantsHintFor(event.participantCount ?? 0, t);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isConnectedCreator = useMemo(
    () => isCreatorParticipant(event.myParticipant, event.participants),
    [event.myParticipant, event.participants]
  );

  const templateDraft = buildTemplateDraft({
    themeEmoji,
    themeText,
    maxProposals: maxProp,
    maxParticipants,
    voteLimitEnabled,
    maxVotes,
    wheelMode,
    richSharePreview,
    allowSeries,
    winnerCount,
  });

  const applyFields = useCallback((config: ApplicableConfig) => {
    const next = configToFields(config);
    setThemeEmoji(next.themeEmoji);
    setThemeText(next.themeText);
    setMaxProp(next.maxProposals);
    setMaxParticipants(next.maxParticipants);
    setVoteLimitEnabled(next.voteLimitEnabled);
    setMaxVotes(next.maxVotes);
    setWheelMode(next.wheelMode);
    setAllowSeries(next.allowSeries);
    setRichSharePreview(next.richSharePreview);
    setWinnerCount(next.winnerCount);
  }, []);

  const titleId = useId();
  const themeCollapseId = useId();
  const wheelModeLabelId = useId();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  const mutation = useMutation({
    mutationFn: (body: EventConfigPatchPayload) => patchEventConfig(slug, hostToken, body),
    onSuccess: async (_config, body) => {
      if (body.date && body.time)
        initialDateLocalRef.current = eventDateTimeToLocal(body.date, body.time);
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

  const eventTemplates = useEventTemplates(open && isConnectedCreator, {
    draft: templateDraft,
    onError: setSaveError,
    onApply: (template) => {
      applyFields(template);
      scheduleAutoSave(true);
    },
  });
  const forgetAppliedTemplate = eventTemplates.forget;

  const hydrateFromEvent = useCallback(() => {
    setEventTitle(event.title);
    applyFields(normalizeConfig(event.config));
    setThemeOpen(false);
    const nextDateLocal = eventDateTimeToLocal(event.date, event.time);
    setEventDateLocal(nextDateLocal);
    initialDateLocalRef.current = nextDateLocal;
    setNotifyDateChange(true);
    setRecurrence(event.config?.recurrence ?? null);
    forgetAppliedTemplate();
    setFieldErrors({});
    setSaveError(null);
    setSaveState('saved');
  }, [event.title, event.config, event.date, event.time, applyFields, forgetAppliedTemplate]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) hydrateFromEvent();
    wasOpenRef.current = open;
  }, [open, hydrateFromEvent]);

  performSaveRef.current = () => {
    const {
      errors,
      maxProposalsPerParticipant,
      maxParticipantsValue,
      maxVotesPerParticipant,
      winnerCount: winnerCountValue,
      eventDateTime,
    } = validateSettingsDraft(
      {
        eventTitle,
        eventDateLocal,
        maxProp,
        maxParticipants,
        voteLimitEnabled,
        maxVotes,
        winnerCount,
        currentParticipantCount: event.participantCount ?? 0,
        drawnWinnerCount,
      },
      t
    );

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSaveState('error');
      return;
    }

    const theme = [themeEmoji, themeText.trim()].filter(Boolean).join(' ');

    mutation.mutate({
      ...titlePatch(eventTitle.trim(), event.title),
      ...(theme !== (cfg.theme ?? '') ? { theme } : {}),
      ...(maxProposalsPerParticipant !== cfg.maxProposalsPerParticipant
        ? { maxProposalsPerParticipant }
        : {}),
      ...(maxParticipantsValue !== cfg.maxParticipants
        ? { maxParticipants: maxParticipantsValue }
        : {}),
      ...(maxVotesPerParticipant !== (cfg.maxVotesPerParticipant ?? null)
        ? { maxVotesPerParticipant: maxVotesPerParticipant ?? 0 }
        : {}),
      ...(wheelMode !== cfg.wheelMode ? { wheelMode } : {}),
      ...(allowSeries !== (cfg.allowSeries ?? false) ? { allowSeries } : {}),
      ...(richSharePreview !== (cfg.richSharePreview ?? true) ? { richSharePreview } : {}),
      ...(winnerCountValue !== null && winnerCountValue !== cfg.winnerCount
        ? { winnerCount: winnerCountValue }
        : {}),
      ...recurrencePatch(recurrence, cfg.recurrence ?? null),
      ...dateTimePatch(
        eventDateTime,
        eventDateLocal !== initialDateLocalRef.current,
        notifyDateChange
      ),
    });
  };

  const configLocked = drawnWinnerCount > 0;
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

  const saveStatusLabel = t(SAVE_STATUS_LABEL_KEYS[saveState]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      surface="borderless"
      bottomSheetOnMobile
      column
      ariaLabelledBy={titleId}
      dialogRef={dialogRef}
      className={clsx(styles.dialog, dragStyles.surface)}
    >
      <div className={dragStyles.grab} {...dragBind}>
        <span className={clsx(dragStyles.handle, dragStyles.handleMobileOnly)} aria-hidden="true" />
        <div className={styles.panelHead}>
          <Settings size={ICON_SIZE.lg} aria-hidden className={styles.summaryIcon} />
          <h2 id={titleId} className={styles.panelTitle}>
            {t('events.settings.title')}
          </h2>
          <span className={clsx(styles.saveStatus, SAVE_STATUS_CLASS[saveState])}>
            <span className={styles.saveStatusDot} aria-hidden />
            <span>{saveStatusLabel}</span>
          </span>
          <IconButton size="sm" ariaLabel={t('common.close')} onClick={onClose}>
            <X size={ICON_SIZE.md} aria-hidden />
          </IconButton>
        </div>
      </div>
      <div className={styles.dialogBody}>
        {configLocked ? (
          <output className={styles.lockBanner}>
            <Lock size={ICON_SIZE.sm} aria-hidden />
            <span className={styles.lockBannerLabel}>{t('events.settings.configLockedHint')}</span>
          </output>
        ) : null}
        {saveError && (
          <p className="error" role="alert">
            {saveError}
          </p>
        )}
        <form className={`form ${styles.form}`}>
          <div className={styles.section}>
            <fieldset className={styles.lockable} disabled={configLocked}>
              <Field
                label={t('events.settings.titleLabel')}
                htmlFor="host-cfg-title"
                error={fieldErrors.title}
                className={styles.field}
              >
                {({ id, describedBy, invalid }) => (
                  <input
                    id={id}
                    className="input"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => {
                      setEventTitle(e.target.value);
                      scheduleAutoSave();
                    }}
                    maxLength={200}
                    placeholder={t('events.settings.titlePlaceholder')}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>

              <HostEventDateField
                value={eventDateLocal}
                error={fieldErrors.date}
                relativeDateLabel={relativeDateLabel}
                showNotifyRow={dateWasEdited && !fieldErrors.date}
                notifyDateChange={notifyDateChange}
                onValueChange={(v) => {
                  setEventDateLocal(v);
                  scheduleAutoSave();
                }}
                onNotifyChange={setNotifyDateChange}
              />

              <HostEventThemeField
                emoji={themeEmoji}
                text={themeText}
                preview={themePreview}
                open={themeOpen}
                collapseId={themeCollapseId}
                onToggle={() => setThemeOpen((v) => !v)}
                onEmojiChange={(v) => {
                  setThemeEmoji(v);
                  scheduleAutoSave();
                }}
                onTextChange={(v) => {
                  setThemeText(v);
                  scheduleAutoSave();
                }}
                onClear={() => {
                  setThemeEmoji('');
                  setThemeText('');
                  scheduleAutoSave();
                }}
              />
            </fieldset>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('events.settings.sectionFlow')}</h3>

            <div className={styles.counterGrid}>
              <Field
                label={t('events.settings.maxProposalsLabel')}
                htmlFor="host-cfg-max"
                error={fieldErrors.maxProposals}
                hint={
                  fieldErrors.maxProposals
                    ? undefined
                    : t('events.settings.maxProposalsHint', { max: MAX_PROPOSALS_PER_PARTICIPANT })
                }
                className={styles.field}
              >
                {({ id, describedBy, invalid }) => (
                  <NumberInput
                    id={id}
                    value={maxProp}
                    onChange={(v) => {
                      setMaxProp(v);
                      scheduleAutoSave();
                    }}
                    min={1}
                    max={MAX_PROPOSALS_PER_PARTICIPANT}
                    disabled={configLocked}
                    invalid={invalid}
                    ariaDescribedBy={describedBy}
                  />
                )}
              </Field>

              <Field
                label={t('events.settings.maxParticipantsLabel')}
                htmlFor="host-cfg-max-participants"
                error={fieldErrors.maxParticipants}
                hint={fieldErrors.maxParticipants ? undefined : maxParticipantsHint}
                className={styles.field}
              >
                {({ id, describedBy, invalid }) => (
                  <NumberInput
                    id={id}
                    value={maxParticipants}
                    onChange={(v) => {
                      setMaxParticipants(v);
                      scheduleAutoSave();
                    }}
                    min={1}
                    max={MAX_EVENT_PARTICIPANTS}
                    disabled={configLocked}
                    invalid={invalid}
                    ariaDescribedBy={describedBy}
                  />
                )}
              </Field>

              <Field
                label={t('events.settings.winnerCountLabel')}
                htmlFor="host-cfg-winner-count"
                error={fieldErrors.winnerCount}
                hint={
                  fieldErrors.winnerCount
                    ? undefined
                    : t('events.settings.winnerCountHint', { max: MAX_WINNERS_PER_EVENT })
                }
                className={styles.field}
              >
                {({ id, describedBy, invalid }) => (
                  <NumberInput
                    id={id}
                    value={winnerCount}
                    onChange={(v) => {
                      setWinnerCount(v);
                      scheduleAutoSave();
                    }}
                    min={Math.max(1, drawnWinnerCount)}
                    max={MAX_WINNERS_PER_EVENT}
                    invalid={invalid}
                    ariaDescribedBy={describedBy}
                  />
                )}
              </Field>
            </div>

            <fieldset className={styles.lockable} disabled={configLocked}>
              <div className={styles.field}>
                <span className="label" id={wheelModeLabelId}>
                  {t('events.settings.wheelModeLabel')}
                </span>
                <WheelModeField
                  value={wheelMode}
                  labelId={wheelModeLabelId}
                  onChange={(mode) => {
                    setWheelMode(mode);
                    scheduleAutoSave(true);
                  }}
                />
              </div>

              <div className={styles.field}>
                <ToggleRow
                  title={t('events.settings.allowSeriesLabel')}
                  description={t('events.settings.allowSeriesDesc')}
                  checked={allowSeries}
                  onChange={() => {
                    setAllowSeries((v) => !v);
                    scheduleAutoSave(true);
                  }}
                />
              </div>

              <div className={styles.field}>
                <ToggleRow
                  title={t('events.settings.voteLimitLabel')}
                  description={t('events.settings.voteLimitDesc')}
                  checked={voteLimitEnabled}
                  onChange={() => {
                    setVoteLimitEnabled((v) => !v);
                    scheduleAutoSave(true);
                  }}
                />
                {voteLimitEnabled && (
                  <Field
                    label={t('events.settings.maxVotesLabel')}
                    htmlFor="host-cfg-max-votes"
                    error={fieldErrors.maxVotes}
                    className={styles.subField}
                  >
                    {({ id, describedBy, invalid }) => (
                      <NumberInput
                        id={id}
                        value={maxVotes}
                        onChange={(v) => {
                          setMaxVotes(v);
                          scheduleAutoSave();
                        }}
                        min={1}
                        invalid={invalid}
                        ariaDescribedBy={describedBy}
                      />
                    )}
                  </Field>
                )}
              </div>
            </fieldset>

            <div className={styles.field}>
              <ToggleRow
                title={t('events.settings.recurrenceLabel')}
                description={t('events.settings.recurrenceDesc')}
                checked={recurrence !== null}
                disabled={recurrenceLocked}
                onChange={() => {
                  setRecurrence((v) => (v === null ? 'weekly' : null));
                  scheduleAutoSave(true);
                }}
              />
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

          {isConnectedCreator && (
            <section className={styles.templatesSection} data-testid="event-templates-section">
              <EventTemplatesRow
                className={styles.templatesRow}
                templates={eventTemplates.templates}
                appliedTemplate={eventTemplates.matchingTemplate}
                disabled={eventTemplates.isBusy}
                applyLockedHint={configLocked ? t('events.settings.templates.lockedHint') : null}
                onApply={eventTemplates.apply}
                onRename={eventTemplates.rename}
                onDelete={eventTemplates.remove}
              />
              <EventTemplateSaveBar
                className={styles.templatesSaveBar}
                variant="event"
                draft={templateDraft}
                templates={eventTemplates.templates}
                appliedTemplate={eventTemplates.appliedTemplate}
                lastSaved={eventTemplates.lastSaved}
                disabled={eventTemplates.isBusy}
                onSave={eventTemplates.saveAs}
                onUpdate={eventTemplates.updateApplied}
              />
            </section>
          )}
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
              tone="danger"
              className={styles.deleteBtn}
              onClick={() => {
                setDeleteError(null);
                setConfirmDeleteOpen(true);
              }}
              disabled={deleteMutation.isPending}
              data-testid="delete-event-button"
            >
              <Trash2 size={ICON_SIZE.md} aria-hidden />
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
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDeleteOpen(false)}
          testId="delete-event-confirm-dialog"
        />
      </div>
    </Modal>
  );
}
