import { useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { useTranslation } from '@/shared/i18n';
import TemplateNameEditor from '@/features/events/components/TemplateNameEditor';
import type { CreateEventFieldErrors } from '@/features/events/lib/createEventValidation';
import type { TemplateFormFields } from '@/features/events/lib/eventTemplateDraft';
import type { EventTemplateData } from '@/features/events/types';
import CreateEventRules from './CreateEventRules';
import styles from './CreateEventDialog.module.css';

export type RulesChoice =
  | { kind: 'defaults' }
  | { kind: 'night'; slug: string; title: string }
  | { kind: 'template'; template: EventTemplateData };

type CreateEventRulesStepProps = {
  open: boolean;
  onClose: () => void;
  fields: TemplateFormFields;
  errors: CreateEventFieldErrors;
  onChange: (patch: Partial<TemplateFormFields>) => void;
  selected: RulesChoice['kind'] | null;
  selectedTemplateId: string | null;
  lastNight: { slug: string; title: string } | null;
  templates: EventTemplateData[];
  onChoose: (choice: RulesChoice) => void;
  canSaveTemplate: boolean;
  suggestTemplateName: () => string | null;
  onSaveTemplate: (name: string) => void;
  templateError: string | null;
};

export default function CreateEventRulesStep({
  open,
  onClose,
  fields,
  errors,
  onChange,
  selected,
  selectedTemplateId,
  lastNight,
  templates,
  onChoose,
  canSaveTemplate,
  suggestTemplateName,
  onSaveTemplate,
  templateError,
}: Readonly<CreateEventRulesStepProps>) {
  const { t } = useTranslation();
  const startingPointId = useId();
  const [templateName, setTemplateName] = useState<string | null>(null);

  const startNaming = () => {
    const suggested = suggestTemplateName();
    if (suggested !== null) setTemplateName(suggested);
  };

  const confirmName = () => {
    const name = templateName?.trim() ?? '';
    if (name.length === 0) return;
    onSaveTemplate(name);
    setTemplateName(null);
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={t('events.create.rules.title')}
      footer={
        <div className={styles.footer}>
          <span className={styles.footerSpacer} />
          {canSaveTemplate && templateName === null ? (
            <Button onClick={startNaming}>{t('events.create.rules.saveAsTemplate')}</Button>
          ) : null}
          <Button variant="primary" onClick={onClose}>
            {t('events.create.rules.done')}
          </Button>
        </div>
      }
    >
      <section className={styles.startingPoint} aria-labelledby={startingPointId}>
        <h3 id={startingPointId} className={styles.startingPointTitle}>
          {t('events.create.rules.startFrom')}
        </h3>
        <div className={styles.chips}>
          <Chip
            size="md"
            selected={selected === 'defaults'}
            onClick={() => onChoose({ kind: 'defaults' })}
          >
            {t('events.create.rules.defaultsItem')}
          </Chip>
          {lastNight ? (
            <Chip
              size="md"
              icon={RotateCcw}
              selected={selected === 'night'}
              onClick={() => onChoose({ kind: 'night', ...lastNight })}
            >
              {t('events.create.rules.likeItem', { title: lastNight.title })}
            </Chip>
          ) : null}
          {templates.map((template) => (
            <Chip
              key={template.id}
              size="md"
              selected={selected === 'template' && selectedTemplateId === template.id}
              onClick={() => onChoose({ kind: 'template', template })}
            >
              {template.name}
            </Chip>
          ))}
        </div>
      </section>
      <CreateEventRules fields={fields} errors={errors} onChange={onChange} />
      {templateName === null ? null : (
        <div className={styles.templateName}>
          <TemplateNameEditor
            id="create-template-name"
            value={templateName}
            onChange={setTemplateName}
            onConfirm={confirmName}
            onCancel={() => setTemplateName(null)}
          />
        </div>
      )}
      {templateError ? (
        <p className="error" role="alert">
          {templateError}
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}
