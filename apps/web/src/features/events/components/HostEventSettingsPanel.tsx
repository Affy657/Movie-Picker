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
  const draft = useHostEventSettingsDraft({ slug, hostToken, event, open });

  const chosenGroup = draft.groups.find((group) => group.id === draft.groupId) ?? null;
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

  const saveStatusLabel = t(SAVE_STATUS_LABEL_KEYS[draft.saveState]);

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
          tone={SAVE_STATUS_TONE[draft.saveState]}
          dot={draft.saveState === 'pending' ? 'pulsing' : true}
          className={styles.saveStatus}
        >
          {saveStatusLabel}
        </Chip>
      }
    >
      {draft.configLocked ? (
        <output className={styles.lockBanner}>
          <Lock size={ICON_SIZE.sm} aria-hidden />
          <span className={styles.lockBannerLabel}>{t('events.settings.configLockedHint')}</span>
        </output>
      ) : null}
      {draft.saveError && (
        <p className="error" role="alert">
          {draft.saveError}
        </p>
      )}
      <form className={`form ${styles.form}`}>
        <div className={styles.section}>
          <fieldset className={styles.lockable} disabled={draft.configLocked}>
            <Field
              label={t('events.settings.titleLabel')}
              htmlFor="host-cfg-title"
              error={draft.fieldErrors.title}
              className={styles.field}
            >
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  className="input"
                  type="text"
                  value={draft.eventTitle}
                  onChange={(e) => {
                    draft.setEventTitle(e.target.value);
                    draft.scheduleAutoSave();
                  }}
                  maxLength={200}
                  placeholder={t('events.settings.titlePlaceholder')}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </Field>

            <HostEventDateField
              value={draft.eventDateLocal}
              error={draft.fieldErrors.date}
              relativeDateLabel={draft.relativeDateLabel}
              showNotifyRow={draft.dateWasEdited && !draft.fieldErrors.date}
              notifyDateChange={draft.notifyDateChange}
              onValueChange={draft.setEventDateLocal}
              onCommit={draft.commitEventDate}
              onNotifyChange={draft.setNotifyDateChange}
            />

            <HostEventThemeField
              emoji={draft.themeEmoji}
              text={draft.themeText}
              preview={draft.themePreview}
              open={draft.themeOpen}
              collapseId={themeCollapseId}
              onToggle={() => draft.setThemeOpen((v) => !v)}
              onEmojiChange={(v) => {
                draft.setThemeEmoji(v);
                draft.scheduleAutoSave();
              }}
              onTextChange={(v) => {
                draft.setThemeText(v);
                draft.scheduleAutoSave();
              }}
              onClear={() => {
                draft.setThemeEmoji('');
                draft.setThemeText('');
                draft.scheduleAutoSave();
              }}
            />
          </fieldset>
        </div>

        {draft.isConnectedCreator && draft.groups.length > 0 ? (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('events.settings.sectionGroup')}</h3>
            <div className={styles.field}>
              <GroupChips
                className={styles.groupChips}
                groups={draft.groups}
                groupId={shownGroupId}
                disabled={event.isFinished}
                onChange={(next) => {
                  draft.setGroupId(next);
                  draft.scheduleAutoSave(true);
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

          <fieldset className={styles.lockable} disabled={draft.configLocked}>
            <EventLimitFields
              idPrefix="host-cfg"
              disabled={draft.configLocked}
              rowClassName={styles.field}
              limits={{
                participants: {
                  enabled: draft.participantLimitEnabled,
                  value: draft.maxParticipants,
                  error: draft.fieldErrors.maxParticipants,
                  hint: draft.maxParticipantsHint,
                  onEnabledChange: draft.toggleParticipantLimit,
                  onValueChange: (v) => {
                    draft.setMaxParticipants(v);
                    draft.scheduleAutoSave();
                  },
                },
                proposals: {
                  enabled: draft.proposalLimitEnabled,
                  value: draft.maxProp,
                  error: draft.fieldErrors.maxProposals,
                  onEnabledChange: draft.toggleProposalLimit,
                  onValueChange: (v) => {
                    draft.setMaxProp(v);
                    draft.scheduleAutoSave();
                  },
                },
              }}
            />

            <div className={styles.field}>
              <ToggleRow
                title={t('events.settings.allowSeriesLabel')}
                description={t('events.settings.allowSeriesDesc')}
                checked={draft.allowSeries}
                onChange={() => {
                  draft.setAllowSeries((v) => !v);
                  draft.scheduleAutoSave(true);
                }}
              />
            </div>
          </fieldset>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('events.settings.sectionDraw')}</h3>

          <fieldset className={styles.lockable} disabled={draft.configLocked}>
            <EventLimitFields
              idPrefix="host-cfg"
              disabled={draft.configLocked}
              rowClassName={styles.field}
              limits={{
                votes: {
                  enabled: draft.voteLimitEnabled,
                  value: draft.maxVotes,
                  error: draft.fieldErrors.maxVotes,
                  onEnabledChange: (enabled) => {
                    draft.setVoteLimitEnabled(enabled);
                    draft.scheduleAutoSave(true);
                  },
                  onValueChange: (v) => {
                    draft.setMaxVotes(v);
                    draft.scheduleAutoSave();
                  },
                },
              }}
            />

            <div className={styles.field}>
              <span className="label" id={wheelModeLabelId}>
                {t('events.settings.wheelModeLabel')}
              </span>
              <WheelModeField
                value={draft.wheelMode}
                labelId={wheelModeLabelId}
                onChange={(mode) => {
                  draft.setWheelMode(mode);
                  draft.scheduleAutoSave(true);
                }}
              />
            </div>
          </fieldset>

          <Field
            label={t('events.settings.winnerCountLabel')}
            htmlFor="host-cfg-winner-count"
            error={draft.fieldErrors.winnerCount}
            hint={
              draft.fieldErrors.winnerCount
                ? undefined
                : t('events.settings.winnerCountHint', { max: MAX_WINNERS_PER_EVENT })
            }
            className={clsx(styles.field, styles.counterField)}
          >
            {({ id, describedBy, invalid }) => (
              <NumberInput
                id={id}
                value={draft.winnerCount}
                onChange={(v) => {
                  draft.setWinnerCount(v);
                  draft.scheduleAutoSave();
                }}
                min={Math.max(1, draft.drawnWinnerCount)}
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
              checked={draft.recurrence !== null}
              disabled={draft.recurrenceLocked}
              onChange={() => {
                draft.setRecurrence((v) => (v === null ? 'weekly' : null));
                draft.scheduleAutoSave(true);
              }}
            />
            {draft.recurrence !== null && !draft.recurrenceLocked && (
              <div className={styles.recurrenceRhythm}>
                <SegmentedRadioGroup
                  className={styles.recurrenceSegments}
                  options={recurrenceOptions}
                  value={draft.recurrence}
                  size="sm"
                  ariaLabel={t('events.settings.recurrenceGroupLabel')}
                  onChange={(value) => {
                    draft.setRecurrence(value);
                    draft.scheduleAutoSave(true);
                  }}
                />
                <p className="hint">
                  {chosenGroup
                    ? t('events.settings.recurrenceGroupHint', { group: chosenGroup.name })
                    : t('events.settings.recurrenceShareHint')}
                </p>
              </div>
            )}
            {draft.recurrenceLocked && (
              <p className="hint">{t('events.settings.recurrenceLockedHint')}</p>
            )}
          </div>
        </div>

        {draft.isConnectedCreator && (
          <section className={templatesStyles.section} data-testid="event-templates-section">
            <EventTemplatesRow
              className={templatesStyles.row}
              templates={draft.eventTemplates.templates}
              appliedTemplate={draft.eventTemplates.matchingTemplate}
              disabled={draft.eventTemplates.isBusy}
              applyLockedHint={
                draft.configLocked ? t('events.settings.templates.lockedHint') : null
              }
              onApply={draft.eventTemplates.apply}
              onRename={draft.eventTemplates.rename}
              onDelete={draft.eventTemplates.remove}
            />
            <EventTemplateSaveBar
              className={templatesStyles.saveBar}
              variant="event"
              draft={draft.templateDraft}
              templates={draft.eventTemplates.templates}
              appliedTemplate={draft.eventTemplates.appliedTemplate}
              lastSaved={draft.eventTemplates.lastSaved}
              disabled={draft.eventTemplates.isBusy}
              onBeforeSave={draft.templateLimitsAreValid}
              onSave={draft.eventTemplates.saveAs}
              onUpdate={draft.eventTemplates.updateApplied}
            />
          </section>
        )}
      </form>

      {draft.isConnectedCreator && (
        <HostEventDangerZone slug={slug} hostToken={hostToken} eventTitle={event.title} />
      )}
    </ResponsiveDialog>
  );
}
