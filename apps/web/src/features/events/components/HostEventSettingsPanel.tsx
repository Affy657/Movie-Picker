import { useId, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { Lock, Settings, X } from 'lucide-react';
import HostEventDateField from './HostEventDateField';
import HostEventThemeField from './HostEventThemeField';
import WheelModeField from './WheelModeField';
import EventTemplateSaveBar from './EventTemplateSaveBar';
import EventTemplatesRow from './EventTemplatesRow';
import HostEventDangerZone from './HostEventDangerZone';
import { useHostEventSettingsDraft } from './useHostEventSettingsDraft';
import type { SaveState } from './hostEventSettingsDraft';
import NumberInput from '@/shared/components/NumberInput';
import Field from '@/shared/components/Field';
import ToggleRow from '@/shared/components/ToggleRow';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import dragStyles from '@/shared/components/SheetDrag.module.css';
import Modal from '@/shared/components/Modal';
import styles from './HostEventSettingsPanel.module.css';
import type { EventData } from '@/features/events/types';
import {
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  MAX_WINNERS_PER_EVENT,
} from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

type HostEventSettingsPanelProps = {
  slug: string;
  hostToken: string | null;
  event: EventData;

  open: boolean;

  onClose: () => void;
};

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

export default function HostEventSettingsPanel({
  slug,
  hostToken,
  event,
  open,
  onClose,
}: Readonly<HostEventSettingsPanelProps>) {
  const { t } = useTranslation();
  const {
    eventTitle,
    setEventTitle,
    themeEmoji,
    setThemeEmoji,
    themeText,
    setThemeText,
    themeOpen,
    setThemeOpen,
    themePreview,
    eventDateLocal,
    setEventDateLocal,
    relativeDateLabel,
    dateWasEdited,
    notifyDateChange,
    setNotifyDateChange,
    maxProp,
    setMaxProp,
    maxParticipants,
    setMaxParticipants,
    maxParticipantsHint,
    voteLimitEnabled,
    setVoteLimitEnabled,
    maxVotes,
    setMaxVotes,
    wheelMode,
    setWheelMode,
    allowSeries,
    setAllowSeries,
    recurrence,
    setRecurrence,
    winnerCount,
    setWinnerCount,
    drawnWinnerCount,
    configLocked,
    recurrenceLocked,
    fieldErrors,
    saveError,
    saveState,
    scheduleAutoSave,
    templateDraft,
    eventTemplates,
    isConnectedCreator,
  } = useHostEventSettingsDraft({ slug, hostToken, event, open });

  const titleId = useId();
  const themeCollapseId = useId();
  const wheelModeLabelId = useId();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);

  const recurrenceOptions = useMemo(
    () => [
      { value: 'weekly' as const, label: t('events.settings.recurrenceWeekly') },
      { value: 'biweekly' as const, label: t('events.settings.recurrenceBiweekly') },
      { value: 'monthly' as const, label: t('events.settings.recurrenceMonthly') },
    ],
    [t]
  );

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
          <HostEventDangerZone slug={slug} hostToken={hostToken} eventTitle={event.title} />
        )}
      </div>
    </Modal>
  );
}
