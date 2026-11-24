import { useEffect, useId, useState } from 'react';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import TemplateNameEditor from '@/features/events/components/TemplateNameEditor';
import type { EventTemplateData } from '@/features/events/types';
import styles from './NightForm.module.css';

export type RuleStart =
  | { kind: 'defaults' }
  | { kind: 'night'; slug: string; title: string }
  | { kind: 'template'; template: EventTemplateData };

type NightRuleStartsProps = {
  defaultsSelected: boolean;
  nights?: ReadonlyArray<{ slug: string; title: string }>;
  selectedNightSlug?: string | null;
  templates: EventTemplateData[];
  selectedTemplateId: string | null;
  modifiedTemplateId?: string | null;
  onChoose: (choice: RuleStart) => void;
  applyLocked?: boolean;
  managing: boolean;
  onManagingChange: (managing: boolean) => void;
  busy?: boolean;
  onRename: (template: EventTemplateData, name: string) => void;
  onDelete: (template: EventTemplateData) => void;
};

export function ManageTemplatesButton({
  managing,
  disabled = false,
  onManagingChange,
}: Readonly<{
  managing: boolean;
  disabled?: boolean;
  onManagingChange: (managing: boolean) => void;
}>) {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      aria-pressed={managing}
      onClick={() => onManagingChange(!managing)}
    >
      {managing ? t('events.settings.templates.manageDone') : t('events.settings.templates.manage')}
    </Button>
  );
}

export default function NightRuleStarts({
  defaultsSelected,
  nights = [],
  selectedNightSlug = null,
  templates,
  selectedTemplateId,
  modifiedTemplateId = null,
  onChoose,
  applyLocked = false,
  managing,
  onManagingChange,
  busy = false,
  onRename,
  onDelete,
}: Readonly<NightRuleStartsProps>) {
  const { t } = useTranslation();
  const nameFieldId = useId();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeletion, setPendingDeletion] = useState<EventTemplateData | null>(null);
  const [wasManaging, setWasManaging] = useState(managing);
  const noTemplate = templates.length === 0;

  if (managing !== wasManaging) {
    setWasManaging(managing);
    setRenamingId(null);
    setDraftName('');
  }

  useEffect(() => {
    if (noTemplate && managing) onManagingChange(false);
  }, [noTemplate, managing, onManagingChange]);

  if (nights.length === 0 && noTemplate) return null;

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

  const confirmDialog = (
    <ConfirmDialog
      open={pendingDeletion !== null}
      title={t('events.settings.templates.deleteConfirmTitle')}
      message={t('events.settings.templates.deleteConfirmMessage', {
        name: pendingDeletion?.name ?? '',
      })}
      confirmLabel={t('events.settings.templates.deleteConfirmAction')}
      loading={busy}
      onConfirm={() => {
        if (pendingDeletion) onDelete(pendingDeletion);
        setPendingDeletion(null);
      }}
      onCancel={() => setPendingDeletion(null)}
    />
  );

  if (managing) {
    return (
      <div className={styles.block}>
        <ul className={styles.manageList}>
          {templates.map((template) => (
            <Card as="li" key={template.id} padding="none" className={styles.manageItem}>
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
                    disabled={busy}
                    ariaLabel={t('events.settings.templates.renameAriaLabel', {
                      name: template.name,
                    })}
                    onClick={() => {
                      setRenamingId(template.id);
                      setDraftName(template.name);
                    }}
                  >
                    <Pencil size={ICON_SIZE.md} aria-hidden />
                  </IconButton>
                  <IconButton
                    size="lg"
                    tone="danger"
                    disabled={busy}
                    ariaLabel={t('events.settings.templates.deleteAriaLabel', {
                      name: template.name,
                    })}
                    onClick={() => setPendingDeletion(template)}
                  >
                    <Trash2 size={ICON_SIZE.md} aria-hidden />
                  </IconButton>
                </>
              )}
            </Card>
          ))}
        </ul>
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className={styles.block}>
      <div className={styles.chips}>
        <Chip
          size="md"
          selected={defaultsSelected}
          disabled={applyLocked}
          onClick={() => onChoose({ kind: 'defaults' })}
        >
          {t('events.create.rules.defaultsItem')}
        </Chip>
        {nights.map((night) => (
          <Chip
            key={night.slug}
            size="md"
            icon={RotateCcw}
            selected={selectedNightSlug === night.slug}
            disabled={applyLocked}
            onClick={() => onChoose({ kind: 'night', slug: night.slug, title: night.title })}
          >
            {t('events.create.rules.likeItem', { title: night.title })}
          </Chip>
        ))}
        {templates.map((template) => (
          <Chip
            key={template.id}
            size="md"
            selected={selectedTemplateId === template.id}
            dot={modifiedTemplateId === template.id}
            disabled={applyLocked}
            onClick={() => onChoose({ kind: 'template', template })}
          >
            {template.name}
          </Chip>
        ))}
      </div>
      {applyLocked && !noTemplate ? (
        <p className={styles.message}>{t('events.settings.templates.lockedHint')}</p>
      ) : null}
      {confirmDialog}
    </div>
  );
}
