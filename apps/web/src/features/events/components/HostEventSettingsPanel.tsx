import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { CircleAlert, Check, Lock } from 'lucide-react';
import Field from '@/shared/components/Field';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import StatusDot from '@/shared/components/StatusDot';
import ToggleRow from '@/shared/components/ToggleRow';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation, type Translate } from '@/shared/i18n';
import { splitDateTimeLocal } from '@/shared/utils/eventDateTimeLocal';
import { eventDateBounds } from '@/features/events/lib/eventStartShortcuts';
import {
  buildTemplateDraft,
  defaultTemplateFields,
  isSameTemplateConfig,
  type TemplateConfigDraft,
} from '@/features/events/lib/eventTemplateDraft';
import type { EventData } from '@/features/events/types';
import { firstRuleError } from '@/features/events/lib/eventLimits';
import EventTemplateSaveBar from './EventTemplateSaveBar';
import HostEventDangerZone from './HostEventDangerZone';
import NightDateField from './night-form/NightDateField';
import NightFormLayout, { useNightFormBodyClass } from './night-form/NightFormLayout';
import NightGroupField from './night-form/NightGroupField';
import NightRepeatField from './night-form/NightRepeatField';
import NightRuleStarts, { ManageTemplatesButton } from './night-form/NightRuleStarts';
import NightRules from './night-form/NightRules';
import NightThemeField from './night-form/NightThemeField';
import nightStyles from './night-form/NightForm.module.css';
import { useHostEventSettingsDraft } from './useHostEventSettingsDraft';
import type { SaveState } from './hostEventSettingsDraft';
import styles from './HostEventSettingsPanel.module.css';

type HostEventSettingsPanelProps = {
  slug: string;
  hostToken: string | null;
  event: EventData;
  open: boolean;
  onClose: () => void;
};

type SettingsDraft = ReturnType<typeof useHostEventSettingsDraft>;

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

const SAVE_STATUS_ICON: Record<SaveState, ReactNode> = {
  saved: <Check size={ICON_SIZE.sm} aria-hidden />,
  pending: <StatusDot pulsing />,
  error: <CircleAlert size={ICON_SIZE.sm} aria-hidden />,
};

function SaveStatus({ state, t }: Readonly<{ state: SaveState; t: Translate }>) {
  return (
    <span className={clsx(styles.saveStatus, SAVE_STATUS_CLASS[state])}>
      {SAVE_STATUS_ICON[state]}
      <span className={styles.saveStatusLabel}>{t(SAVE_STATUS_LABEL_KEYS[state])}</span>
    </span>
  );
}

function withoutTheme(draft: TemplateConfigDraft): TemplateConfigDraft {
  return { ...draft, theme: null };
}

const DEFAULT_RULES = withoutTheme(buildTemplateDraft(defaultTemplateFields()));

function SettingsMain({ draft, event }: Readonly<{ draft: SettingsDraft; event: EventData }>) {
  const { t } = useTranslation();
  const bounds = eventDateBounds(new Date());
  const chosenGroup = draft.groups.find((group) => group.id === draft.groupId) ?? null;
  const dateValue = splitDateTimeLocal(draft.eventDateLocal) ?? { date: '', time: '' };
  const showNotify = draft.dateWasEdited && !draft.fieldErrors.date;

  return (
    <>
      <NightDateField
        id="host-cfg-datetime"
        value={dateValue}
        onChange={(next) => draft.setEventDateLocal(`${next.date}T${next.time}`)}
        onLeave={draft.commitEventDate}
        min={bounds.min}
        max={bounds.max}
        today={bounds.today}
        error={draft.fieldErrors.date}
        disabled={draft.configLocked}
      >
        {showNotify ? (
          <ToggleRow
            title={t('events.form.notify')}
            checked={draft.notifyDateChange}
            onChange={draft.setNotifyDateChange}
            className={styles.notifyRow}
          />
        ) : null}
      </NightDateField>
      <div className={nightStyles.block}>
        <Field
          label={<span className={nightStyles.blockTitle}>{t('events.create.nameLabel')}</span>}
          htmlFor="host-cfg-title"
          error={draft.fieldErrors.title}
          className={nightStyles.fieldBare}
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
              disabled={draft.configLocked}
              maxLength={200}
              placeholder={t('events.settings.titlePlaceholder')}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      </div>
      <NightThemeField
        inputId="host-cfg-theme"
        emoji={draft.themeEmoji}
        text={draft.themeText}
        disabled={draft.configLocked}
        onChange={(emoji, text) => {
          draft.setThemeEmoji(emoji);
          draft.setThemeText(text);
          draft.scheduleAutoSave();
        }}
      />
      {draft.isConnectedCreator ? (
        <NightGroupField
          groups={draft.groups}
          groupId={chosenGroup?.id ?? null}
          disabled={event.isFinished}
          onChange={(next) => {
            draft.setGroupId(next);
            draft.scheduleAutoSave(true);
          }}
        />
      ) : null}
    </>
  );
}

function SettingsRules({
  draft,
  defaultsSelected,
  lockNotice,
  showTitle,
}: Readonly<{
  draft: SettingsDraft;
  defaultsSelected: boolean;
  lockNotice: ReactNode;
  showTitle: boolean;
}>) {
  const [managing, setManaging] = useState(false);
  const templates = draft.eventTemplates.templates;
  const matchingTemplate = draft.eventTemplates.matchingTemplate;
  const appliedTemplate = draft.eventTemplates.appliedTemplate;
  const ownsTemplates = draft.isConnectedCreator;

  return (
    <NightRules
      idPrefix="host-cfg"
      fields={draft.ruleFields}
      caps={draft.limitCaps}
      errors={draft.fieldErrors}
      onChange={draft.applyRulesPatch}
      locked={draft.configLocked}
      anonymousLocked={draft.anonymousLocked}
      winnerMin={Math.max(1, draft.drawnWinnerCount)}
      showTitle={showTitle}
      notice={lockNotice}
      titleAction={
        ownsTemplates && templates.length > 0 ? (
          <ManageTemplatesButton
            managing={managing}
            disabled={draft.eventTemplates.isBusy}
            onManagingChange={setManaging}
          />
        ) : undefined
      }
      start={
        ownsTemplates ? (
          <NightRuleStarts
            defaultsSelected={defaultsSelected}
            templates={templates}
            selectedTemplateId={matchingTemplate?.id ?? null}
            modifiedTemplateId={matchingTemplate ? null : (appliedTemplate?.id ?? null)}
            applyLocked={draft.configLocked}
            managing={managing}
            onManagingChange={setManaging}
            busy={draft.eventTemplates.isBusy}
            onRename={draft.eventTemplates.rename}
            onDelete={draft.eventTemplates.remove}
            onChoose={(choice) => {
              if (draft.configLocked) return;
              if (choice.kind === 'template') draft.eventTemplates.apply(choice.template);
              if (choice.kind === 'defaults') draft.applyDefaultRules();
            }}
          />
        ) : null
      }
      end={
        ownsTemplates ? (
          <EventTemplateSaveBar
            draft={draft.templateDraft}
            templates={templates}
            appliedTemplate={appliedTemplate}
            lastSaved={draft.eventTemplates.lastSaved}
            disabled={draft.eventTemplates.isBusy}
            onBeforeSave={draft.templateLimitsAreValid}
            onSave={draft.eventTemplates.saveAs}
            onUpdate={draft.eventTemplates.updateApplied}
          />
        ) : null
      }
    />
  );
}

function rulesSummaryOf(draft: SettingsDraft, defaultsSelected: boolean, t: Translate): string {
  const matching = draft.eventTemplates.matchingTemplate;
  if (matching) return matching.name;
  if (defaultsSelected) return t('events.create.rules.defaultsItem');
  return t('events.form.rulesCustom');
}

export default function HostEventSettingsPanel({
  slug,
  hostToken,
  event,
  open,
  onClose,
}: Readonly<HostEventSettingsPanelProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const bodyClassName = useNightFormBodyClass();
  const draft = useHostEventSettingsDraft({ slug, hostToken, event, open });
  const [rulesOpen, setRulesOpen] = useState(false);
  const ruleError = firstRuleError('host-cfg', draft.fieldErrors)?.message;
  const [seenRuleError, setSeenRuleError] = useState(ruleError);
  if (ruleError !== seenRuleError) {
    setSeenRuleError(ruleError);
    if (ruleError && isMobile) setRulesOpen(true);
  }
  const defaultsSelected =
    draft.eventTemplates.matchingTemplate === null &&
    isSameTemplateConfig(withoutTheme(draft.templateDraft), DEFAULT_RULES);

  const lockBanner = draft.configLocked ? (
    <output className={nightStyles.lockBanner}>
      <Lock size={ICON_SIZE.sm} aria-hidden />
      <span>{t('events.settings.configLockedHint')}</span>
    </output>
  ) : null;

  const deleteAction = draft.isConnectedCreator ? (
    <HostEventDangerZone
      slug={slug}
      hostToken={hostToken}
      eventTitle={event.title}
      className={isMobile ? nightStyles.deleteAction : undefined}
    />
  ) : null;

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      size="xl"
      sheetSize="lg"
      title={t('events.settings.title')}
      detail={<SaveStatus state={draft.saveState} t={t} />}
      footer={isMobile ? undefined : (deleteAction ?? undefined)}
      bodyClassName={bodyClassName}
    >
      {lockBanner}
      {draft.saveError ? (
        <p className={clsx('error', styles.saveError)} role="alert">
          {draft.saveError}
        </p>
      ) : null}
      <NightFormLayout
        main={<SettingsMain draft={draft} event={event} />}
        mainEnd={
          <>
            <NightRepeatField
              recurrence={draft.recurrence}
              locked={draft.recurrenceLocked}
              onToggle={() => {
                draft.setRecurrence((value) => (value === null ? 'weekly' : null));
                draft.scheduleAutoSave(true);
              }}
              onRhythm={(value) => {
                draft.setRecurrence(value);
                draft.scheduleAutoSave(true);
              }}
            />
            {isMobile ? deleteAction : null}
          </>
        }
        rules={
          <SettingsRules
            draft={draft}
            defaultsSelected={defaultsSelected}
            lockNotice={isMobile ? lockBanner : null}
            showTitle={!isMobile}
          />
        }
        rulesSummary={rulesSummaryOf(draft, defaultsSelected, t)}
        rulesError={ruleError}
        rulesOpen={rulesOpen}
        onRulesOpenChange={setRulesOpen}
      />
    </ResponsiveDialog>
  );
}
