import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { Check, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useTranslation } from '@/shared/i18n';
import {
  MAX_EVENT_TEMPLATES,
  MAX_EVENT_TEMPLATE_NAME_LENGTH,
  type EventTemplateData,
} from '@/features/events/types';
import styles from './EventTemplatesRow.module.css';

type Props = {
  templates: EventTemplateData[];
  appliedTemplateId: string | null;
  disabled?: boolean;
  className?: string;
  onApply: (template: EventTemplateData) => void;
  onRename: (template: EventTemplateData, name: string) => void;
  onDelete: (template: EventTemplateData) => void;
};

export default function EventTemplatesRow({
  templates,
  appliedTemplateId,
  disabled = false,
  className,
  onApply,
  onRename,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [managing, setManaging] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeletion, setPendingDeletion] = useState<EventTemplateData | null>(null);
  const nameFieldId = useId();

  const isEmpty = templates.length === 0;

  useEffect(() => {
    if (isEmpty) {
      setManaging(false);
      setRenamingId(null);
      setPendingDeletion(null);
    }
  }, [isEmpty]);

  if (isEmpty) return null;

  const startRename = (template: EventTemplateData) => {
    setRenamingId(template.id);
    setDraftName(template.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setDraftName('');
  };

  const confirmRename = (template: EventTemplateData) => {
    const trimmed = draftName.trim();
    if (trimmed.length === 0) return;
    if (trimmed !== template.name) onRename(template, trimmed);
    cancelRename();
  };

  const isFull = templates.length >= MAX_EVENT_TEMPLATES;
  const appliedTemplate = templates.find((template) => template.id === appliedTemplateId) ?? null;

  const countLabel =
    templates.length === 1
      ? t('events.settings.templates.count', {
          count: String(templates.length),
          max: String(MAX_EVENT_TEMPLATES),
        })
      : t('events.settings.templates.countMany', {
          count: String(templates.length),
          max: String(MAX_EVENT_TEMPLATES),
        });

  const hint = () => {
    if (managing) return <p className={styles.hint}>{countLabel}</p>;
    if (appliedTemplate)
      return (
        <p className={styles.hintApplied} role="status">
          <Check size={14} aria-hidden />
          <span className={styles.hintLabel}>{t('events.settings.templates.applied')}</span>
        </p>
      );
    if (isFull)
      return (
        <p className={styles.hint}>
          {t('events.settings.templates.capReached', { max: String(MAX_EVENT_TEMPLATES) })}
        </p>
      );
    return null;
  };

  return (
    <section className={clsx(styles.row, className)}>
      <div className={styles.header}>
        <Sparkles size={14} aria-hidden className={styles.headerIcon} />
        <span className={styles.headerLabel}>{t('events.settings.templates.title')}</span>
        <Button
          variant="secondary"
          size="sm"
          className={styles.manageButton}
          disabled={disabled}
          onClick={() => {
            setManaging((value) => !value);
            cancelRename();
          }}
        >
          {managing
            ? t('events.settings.templates.manageDone')
            : t('events.settings.templates.manage')}
        </Button>
      </div>

      {managing ? (
        <ul className={styles.manageList}>
          {templates.map((template) => (
            <li key={template.id} className={styles.manageItem}>
              {renamingId === template.id ? (
                <>
                  <label className="visually-hidden" htmlFor={`${nameFieldId}-${template.id}`}>
                    {t('events.settings.templates.nameLabel')}
                  </label>
                  <input
                    id={`${nameFieldId}-${template.id}`}
                    type="text"
                    className={`input ${styles.nameInput}`}
                    value={draftName}
                    maxLength={MAX_EVENT_TEMPLATE_NAME_LENGTH}
                    placeholder={t('events.settings.templates.namePlaceholder')}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        confirmRename(template);
                      }
                      if (event.key === 'Escape') cancelRename();
                    }}
                  />
                  <Button
                    variant="primary"
                    className={styles.iconSquare}
                    aria-label={t('events.settings.templates.confirmAriaLabel')}
                    onClick={() => confirmRename(template)}
                  >
                    <Check size={16} aria-hidden />
                  </Button>
                  <button
                    type="button"
                    className={`icon-btn-outline ${styles.iconSquare}`}
                    aria-label={t('events.settings.templates.cancelAriaLabel')}
                    onClick={cancelRename}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.manageName}>{template.name}</span>
                  <button
                    type="button"
                    className={`icon-btn-outline ${styles.iconSquare}`}
                    disabled={disabled}
                    aria-label={t('events.settings.templates.renameAriaLabel', {
                      name: template.name,
                    })}
                    onClick={() => startRename(template)}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={`icon-btn-outline ${styles.iconSquare} ${styles.iconDanger}`}
                    disabled={disabled}
                    aria-label={t('events.settings.templates.deleteAriaLabel', {
                      name: template.name,
                    })}
                    onClick={() => setPendingDeletion(template)}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.chips}>
          {templates.map((template) => {
            const applied = template.id === appliedTemplateId;
            return (
              <Chip
                key={template.id}
                tone={applied ? 'primary' : 'neutral'}
                selected={applied}
                pressed={applied}
                icon={applied ? Check : undefined}
                className={styles.chip}
                onClick={() => {
                  if (!disabled) onApply(template);
                }}
              >
                {template.name}
              </Chip>
            );
          })}
        </div>
      )}

      {hint()}

      <ConfirmDialog
        open={pendingDeletion !== null}
        title={t('events.settings.templates.deleteConfirmTitle')}
        message={t('events.settings.templates.deleteConfirmMessage', {
          name: pendingDeletion?.name ?? '',
        })}
        confirmLabel={t('events.settings.templates.deleteConfirmAction')}
        busy={disabled}
        onConfirm={() => {
          if (pendingDeletion) onDelete(pendingDeletion);
          setPendingDeletion(null);
        }}
        onCancel={() => setPendingDeletion(null)}
      />
    </section>
  );
}
