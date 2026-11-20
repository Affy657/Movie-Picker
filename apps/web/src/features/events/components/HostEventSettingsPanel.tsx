import { useId, useMemo } from 'react';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import HostEventDateField from './HostEventDateField';
import HostEventThemeField from './HostEventThemeField';
import WheelModeField from './WheelModeField';
import EventLimitFields from './EventLimitFields';
import EventTemplateSaveBar from './EventTemplateSaveBar';
import EventTemplatesRow from './EventTemplatesRow';
import HostEventDangerZone from './HostEventDangerZone';
import { useHostEventSettingsDraft } from './useHostEventSettingsDraft';
import type { SaveState } from './hostEventSettingsDraft';
import NumberInput from '@/shared/components/NumberInput';
import Field from '@/shared/components/Field';
import ToggleRow from '@/shared/components/ToggleRow';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import styles from './HostEventSettingsPanel.module.css';
import templatesStyles from './EventTemplatesSection.module.css';
import type { EventData } from '@/features/events/types';
import { MAX_WINNERS_PER_EVENT } from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import { ICON_SIZE } from '@/shared/components/iconSize';
import Chip, { type ChipTone } from '@/shared/components/Chip';
import GroupChips from '@/features/events/components/GroupChips';

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

const SAVE_STATUS_TONE = {
  saved: 'success',
  pending: 'muted',
  error: 'danger',
} as const satisfies Record<SaveState, ChipTone>;

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
    commitEventDate,
    relativeDateLabel,
    dateWasEdited,
    notifyDateChange,
    setNotifyDateChange,
    proposalLimitEnabled,
    toggleProposalLimit,
    maxProp,
    setMaxProp,
    participantLimitEnabled,
    toggleParticipantLimit,
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
    groupId,
    setGroupId,
    groups,
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
    templateLimitsAreValid,
    eventTemplates,
    isConnectedCreator,
  } = useHostEventSettingsDraft({ slug, hostToken, event, open });

  const chosenGroup = groups.find((group) => group.id === groupId) ?? null;
  const shownGroupId = chosenGroup?.id ?? null;
  const themeCollapseId = useId();
  const wheelModeLabelId = useId();

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
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      size="md"
      sheetSize="lg"
      title={t('events.settings.title')}
      detail={
        <Chip
          size="sm"
          tone={SAVE_STATUS_TONE[saveState]}
          dot={saveState === 'pending' ? 'pulsing' : true}
          className={styles.saveStatus}
        >
          {saveStatusLabel}
        </Chip>
      }
    >
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
              onValueChange={setEventDateLocal}
              onCommit={commitEventDate}
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

        {isConnectedCreator && groups.length > 0 ? (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('events.settings.sectionGroup')}</h3>
            <div className={styles.field}>
              <GroupChips
                className={styles.groupChips}
                groups={groups}
                groupId={shownGroupId}
                disabled={event.isFinished}
                onChange={(next) => {
                  setGroupId(next);
                  scheduleAutoSave(true);
                }}
              />
              <p className="hint">
                {shownGroupId === null
                  ? t('events.settings.groupHintNone')
                  : t('events.settings.groupHint')}
              </p>
            </div>
          </div>
        ) : null}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('events.settings.sectionParticipants')}</h3>

          <fieldset className={styles.lockable} disabled={configLocked}>
            <EventLimitFields
              idPrefix="host-cfg"
              disabled={configLocked}
              rowClassName={styles.field}
              limits={{
                participants: {
                  enabled: participantLimitEnabled,
                  value: maxParticipants,
                  error: fieldErrors.maxParticipants,
                  hint: maxParticipantsHint,
                  onEnabledChange: toggleParticipantLimit,
                  onValueChange: (v) => {
                    setMaxParticipants(v);
                    scheduleAutoSave();
                  },
                },
                proposals: {
                  enabled: proposalLimitEnabled,
                  value: maxProp,
                  error: fieldErrors.maxProposals,
                  onEnabledChange: toggleProposalLimit,
                  onValueChange: (v) => {
                    setMaxProp(v);
                    scheduleAutoSave();
                  },
                },
              }}
            />

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
          </fieldset>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('events.settings.sectionDraw')}</h3>

          <fieldset className={styles.lockable} disabled={configLocked}>
            <EventLimitFields
              idPrefix="host-cfg"
              disabled={configLocked}
              rowClassName={styles.field}
              limits={{
                votes: {
                  enabled: voteLimitEnabled,
                  value: maxVotes,
                  error: fieldErrors.maxVotes,
                  onEnabledChange: (enabled) => {
                    setVoteLimitEnabled(enabled);
                    scheduleAutoSave(true);
                  },
                  onValueChange: (v) => {
                    setMaxVotes(v);
                    scheduleAutoSave();
                  },
                },
              }}
            />

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
          </fieldset>

          <Field
            label={t('events.settings.winnerCountLabel')}
            htmlFor="host-cfg-winner-count"
            error={fieldErrors.winnerCount}
            hint={
              fieldErrors.winnerCount
                ? undefined
                : t('events.settings.winnerCountHint', { max: MAX_WINNERS_PER_EVENT })
            }
            className={clsx(styles.field, styles.counterField)}
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

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('events.settings.sectionAfter')}</h3>

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
                <p className="hint">
                  {chosenGroup
                    ? t('events.settings.recurrenceGroupHint', { group: chosenGroup.name })
                    : t('events.settings.recurrenceShareHint')}
                </p>
              </div>
            )}
            {recurrenceLocked && (
              <p className="hint">{t('events.settings.recurrenceLockedHint')}</p>
            )}
          </div>
        </div>

        {isConnectedCreator && (
          <section className={templatesStyles.section} data-testid="event-templates-section">
            <EventTemplatesRow
              className={templatesStyles.row}
              templates={eventTemplates.templates}
              appliedTemplate={eventTemplates.matchingTemplate}
              disabled={eventTemplates.isBusy}
              applyLockedHint={configLocked ? t('events.settings.templates.lockedHint') : null}
              onApply={eventTemplates.apply}
              onRename={eventTemplates.rename}
              onDelete={eventTemplates.remove}
            />
            <EventTemplateSaveBar
              className={templatesStyles.saveBar}
              variant="event"
              draft={templateDraft}
              templates={eventTemplates.templates}
              appliedTemplate={eventTemplates.appliedTemplate}
              lastSaved={eventTemplates.lastSaved}
              disabled={eventTemplates.isBusy}
              onBeforeSave={templateLimitsAreValid}
              onSave={eventTemplates.saveAs}
              onUpdate={eventTemplates.updateApplied}
            />
          </section>
        )}
      </form>

      {isConnectedCreator && (
        <HostEventDangerZone slug={slug} hostToken={hostToken} eventTitle={event.title} />
      )}
    </ResponsiveDialog>
  );
}
