import { useId, useState, type SubmitEvent } from 'react';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import { ModalActions } from '@/shared/components/Modal';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';
import { GROUP_NAME_MAX_LENGTH } from '@/features/groups/api/groupsApi';
import { useCreateGroup, useRenameGroup } from '@/features/groups/hooks/useGroups';
import styles from './GroupFormDialog.module.css';

interface RenamedGroup {
  id: string;
  name: string;
}

export default function GroupFormDialog({
  group,
  onClose,
  onSaved,
}: Readonly<{
  group?: RenamedGroup;
  onClose: () => void;
  onSaved: (group: FriendGroupSummary) => void;
}>) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateGroup();
  const renameGroup = useRenameGroup(group?.id ?? '');
  const pending = createGroup.isPending || renameGroup.isPending;
  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !pending;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const saved = group
        ? await renameGroup.mutateAsync(trimmedName)
        : await createGroup.mutateAsync(trimmedName);
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, t('errors.generic')));
    }
  };

  return (
    <ResponsiveDialog
      open
      title={group ? t('groups.form.renameTitle') : t('groups.form.createTitle')}
      onClose={onClose}
      footer={
        <ModalActions>
          <Button type="button" onClick={onClose}>
            {t('groups.form.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabled={!canSubmit}
            loading={pending}
          >
            {group ? t('groups.form.save') : t('groups.form.create')}
          </Button>
        </ModalActions>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <Field
          label={t('groups.form.nameLabel')}
          hint={group ? undefined : t('groups.form.createHint')}
        >
          {({ id, describedBy }) => (
            <input
              id={id}
              className="input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('groups.form.namePlaceholder')}
              maxLength={GROUP_NAME_MAX_LENGTH}
              autoComplete="off"
              aria-describedby={describedBy}
              required
            />
          )}
        </Field>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </ResponsiveDialog>
  );
}
