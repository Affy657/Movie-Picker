import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { Check, Pencil, Sparkles, Trash2 } from 'lucide-react';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import Chip from '@/shared/components/Chip';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import TemplateNameEditor from '@/features/events/components/TemplateNameEditor';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { MAX_EVENT_TEMPLATES, type EventTemplateData } from '@/features/events/types';
import styles from './EventTemplatesRow.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

type Props = {
  templates: EventTemplateData[];
  appliedTemplate: EventTemplateData | null;
  disabled?: boolean;
  applyLockedHint?: string | null;
  className?: string;
  onApply: (template: EventTemplateData) => void;
  onRename: (template: EventTemplateData, name: string) => void;
  onDelete: (template: EventTemplateData) => void;
};

export default function EventTemplatesRow({
  templates,
  appliedTemplate,
  disabled = false,
  applyLockedHint = null,
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

  const countLabel = pluralizeCount(
    templates.length,
    'events.settings.templates.count',
    'events.settings.templates.countMany',
    t,
    { count: templates.length, max: MAX_EVENT_TEMPLATES }
  );

  const applyLocked = applyLockedHint !== null;

  const hint = () => {
    if (managing) return <p className={styles.hint}>{countLabel}</p>;
    if (applyLocked) return <p className={styles.hint}>{applyLockedHint}</p>;
    if (appliedTemplate)
      return (
        <output className={styles.hintApplied}>
          <Check size={ICON_SIZE.sm} aria-hidden />
          <span className={styles.hintLabel}>{t('events.settings.templates.applied')}</span>
        </output>
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
        <Sparkles size={ICON_SIZE.sm} aria-hidden className={styles.headerIcon} />
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
                <TemplateNameEditor
                  id={`${nameFieldId}-${template.id}`}
                  value={draftName}
                  onChange={setDraftName}
                  onConfirm={() => confirmRename(template)}
                  onCancel={cancelRename}
                />
              ) : (
                <>
                  <span className={styles.manageName}>{template.name}</span>
                  <IconButton
                    size="lg"
                    disabled={disabled}
                    label={t('events.settings.templates.renameAriaLabel', {
                      name: template.name,
                    })}
                    onClick={() => startRename(template)}
                  >
                    <Pencil size={ICON_SIZE.md} aria-hidden />
                  </IconButton>
                  <IconButton
                    size="lg"
                    tone="danger"
                    disabled={disabled}
                    label={t('events.settings.templates.deleteAriaLabel', {
                      name: template.name,
                    })}
                    onClick={() => setPendingDeletion(template)}
                  >
                    <Trash2 size={ICON_SIZE.md} aria-hidden />
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.chips}>
          {templates.map((template) => {
            const applied = template.id === appliedTemplate?.id;
            return (
              <Chip
                key={template.id}
                tone={applied ? 'primary' : 'neutral'}
                selected={applied}
                icon={applied ? Check : undefined}
                className={styles.chip}
                disabled={disabled || applyLocked}
                onClick={() => {
                  if (!disabled && !applyLocked) onApply(template);
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
        loading={disabled}
        onConfirm={() => {
          if (pendingDeletion) onDelete(pendingDeletion);
          setPendingDeletion(null);
        }}
        onCancel={() => setPendingDeletion(null)}
      />
    </section>
  );
}
