import { useId, useState } from 'react';
import clsx from 'clsx';
import { BadgeCheck, Bookmark, Plus, RotateCcw } from 'lucide-react';
import Button from '@/shared/components/Button';
import TemplateNameEditor from '@/features/events/components/TemplateNameEditor';
import { useTranslation } from '@/shared/i18n';
import { MAX_EVENT_TEMPLATES, type EventTemplateData } from '@/features/events/types';
import {
  isSameTemplateConfig,
  suggestTemplateName,
  templateToDraft,
  type TemplateConfigDraft,
} from '@/features/events/lib/eventTemplateDraft';
import styles from './EventTemplateSaveBar.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

type Props = {
  draft: TemplateConfigDraft;
  templates: EventTemplateData[];
  appliedTemplate: EventTemplateData | null;
  lastSaved?: EventTemplateData | null;
  disabled?: boolean;
  hidden?: boolean;
  className?: string;
  onBeforeSave?: () => boolean;
  onSave: (name: string) => void;
  onUpdate?: (template: EventTemplateData) => void;
};

export default function EventTemplateSaveBar({
  draft,
  templates,
  appliedTemplate,
  lastSaved = null,
  disabled = false,
  hidden = false,
  className,
  onBeforeSave,
  onSave,
  onUpdate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const nameFieldId = useId();

  const isFull = templates.length >= MAX_EVENT_TEMPLATES;
  const takenNames = templates.map((template) => template.name);
  const hasDrifted =
    appliedTemplate !== null && !isSameTemplateConfig(draft, templateToDraft(appliedTemplate));
  const sameAsApplied = appliedTemplate !== null && !hasDrifted;
  const justSaved =
    lastSaved !== null && isSameTemplateConfig(draft, templateToDraft(lastSaved))
      ? lastSaved
      : null;

  const capHint = isFull ? (
    <p className={styles.capHint}>
      {t('events.settings.templates.capReached', { max: String(MAX_EVENT_TEMPLATES) })}
    </p>
  ) : null;

  const draftCanBeSaved = () => onBeforeSave === undefined || onBeforeSave();

  const startNaming = () => {
    if (!draftCanBeSaved()) return;
    setDraftName(
      suggestTemplateName(draft.theme, takenNames, (index) =>
        t('events.settings.templates.numberedName', { index })
      )
    );
    setNaming(true);
  };

  const cancelNaming = () => {
    setNaming(false);
    setDraftName('');
  };

  const confirmNaming = () => {
    const trimmed = draftName.trim();
    if (trimmed.length === 0) return;
    onSave(trimmed);
    cancelNaming();
  };

  if (naming) {
    return (
      <div className={clsx(styles.bar, className)}>
        <TemplateNameEditor
          id={nameFieldId}
          value={draftName}
          onChange={setDraftName}
          onConfirm={confirmNaming}
          onCancel={cancelNaming}
        />
      </div>
    );
  }

  if (justSaved) {
    return (
      <div className={clsx(styles.bar, className)}>
        <output className={styles.saved}>
          <BadgeCheck size={ICON_SIZE.md} aria-hidden />
          <span className={styles.savedLabel}>
            {t('events.settings.templates.savedAs', { name: justSaved.name })}
          </span>
        </output>
      </div>
    );
  }

  if (hasDrifted && onUpdate) {
    return (
      <div className={clsx(styles.bar, styles.actions, className)}>
        <Button
          variant="soft"
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (draftCanBeSaved()) onUpdate(appliedTemplate);
          }}
        >
          <RotateCcw size={ICON_SIZE.sm} aria-hidden />
          {t('events.settings.templates.updateAction')}
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled || isFull} onClick={startNaming}>
          <Plus size={ICON_SIZE.sm} aria-hidden />
          {t('events.settings.templates.saveAsNewAction')}
        </Button>
        {capHint}
      </div>
    );
  }

  if (hidden || sameAsApplied) return null;

  return (
    <div className={clsx(styles.bar, className)}>
      <Button
        variant="ghost"
        size="sm"
        className={styles.saveAction}
        disabled={disabled || isFull}
        onClick={startNaming}
      >
        <Bookmark size={ICON_SIZE.sm} aria-hidden />
        {t('events.settings.templates.saveAction')}
      </Button>
      {capHint}
    </div>
  );
}
