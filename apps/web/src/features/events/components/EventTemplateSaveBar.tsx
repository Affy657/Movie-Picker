import { useId, useState } from 'react';
import clsx from 'clsx';
import { BadgeCheck, Check, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import Button from '@/shared/components/Button';
import { useTranslation } from '@/shared/i18n';
import {
  MAX_EVENT_TEMPLATES,
  MAX_EVENT_TEMPLATE_NAME_LENGTH,
  type EventTemplateData,
} from '@/features/events/types';
import {
  isSameTemplateConfig,
  suggestTemplateName,
  templateToDraft,
  type TemplateConfigDraft,
} from '@/features/events/lib/eventTemplateDraft';
import styles from './EventTemplateSaveBar.module.css';

type Props = {
  draft: TemplateConfigDraft;
  templates: EventTemplateData[];
  appliedTemplate: EventTemplateData | null;
  lastSaved?: EventTemplateData | null;
  variant?: 'create' | 'event';
  disabled?: boolean;
  className?: string;
  onSave: (name: string) => void;
  onUpdate?: (template: EventTemplateData) => void;
};

export default function EventTemplateSaveBar({
  draft,
  templates,
  appliedTemplate,
  lastSaved = null,
  variant = 'create',
  disabled = false,
  className,
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
  const justSaved =
    lastSaved !== null && isSameTemplateConfig(draft, templateToDraft(lastSaved))
      ? lastSaved
      : null;

  const startNaming = () => {
    setDraftName(suggestTemplateName(draft.theme, takenNames));
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

  const saveLabel =
    variant === 'event'
      ? t('events.settings.templates.saveFromEventAction')
      : t('events.settings.templates.saveAction');

  const idleHint =
    variant === 'event'
      ? t('events.settings.templates.saveFromEventHint')
      : t('events.settings.templates.saveHint');

  const driftHint = hasDrifted
    ? t('events.settings.templates.modifiedHint', { name: appliedTemplate.name })
    : null;

  const hintLabel = driftHint ?? (appliedTemplate === null ? idleHint : null);

  return (
    <div className={clsx(styles.bar, className)}>
      {justSaved ? (
        <p className={styles.saved} role="status">
          <BadgeCheck size={15} aria-hidden />
          <span className={styles.savedLabel}>
            {t('events.settings.templates.savedAs', { name: justSaved.name })}
          </span>
        </p>
      ) : (
        hintLabel !== null && <p className={styles.hint}>{hintLabel}</p>
      )}

      {naming ? (
        <div className={styles.nameRow}>
          <label className="visually-hidden" htmlFor={nameFieldId}>
            {t('events.settings.templates.nameLabel')}
          </label>
          <input
            id={nameFieldId}
            type="text"
            className={`input ${styles.nameInput}`}
            value={draftName}
            maxLength={MAX_EVENT_TEMPLATE_NAME_LENGTH}
            placeholder={t('events.settings.templates.namePlaceholder')}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                confirmNaming();
              }
              if (event.key === 'Escape') cancelNaming();
            }}
          />
          <Button
            variant="primary"
            className={styles.iconSquare}
            aria-label={t('events.settings.templates.confirmAriaLabel')}
            onClick={confirmNaming}
          >
            <Check size={16} aria-hidden />
          </Button>
          <button
            type="button"
            className={`icon-btn-outline ${styles.iconSquare}`}
            aria-label={t('events.settings.templates.cancelAriaLabel')}
            onClick={cancelNaming}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
          {hasDrifted && onUpdate && (
            <Button
              variant="primary"
              size="sm"
              disabled={disabled}
              onClick={() => onUpdate(appliedTemplate)}
            >
              <RotateCcw size={14} aria-hidden />
              <span className={styles.actionLabel}>
                {t('events.settings.templates.updateAction')}
              </span>
            </Button>
          )}
          <Button
            size="sm"
            disabled={disabled || isFull || justSaved !== null}
            onClick={startNaming}
          >
            {hasDrifted ? <Plus size={14} aria-hidden /> : <Sparkles size={14} aria-hidden />}
            <span className={styles.actionLabel}>
              {hasDrifted ? t('events.settings.templates.saveAsNewAction') : saveLabel}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
