import { useId, useMemo, useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { Globe, Lock } from 'lucide-react';
import { ModalActions } from '@/shared/components/Modal';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import Field from '@/shared/components/Field';
import Button from '@/shared/components/Button';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { API_ERROR_REASONS, ApiError, getErrorMessage } from '@/shared/api/apiError';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { MovieListItemBody, MovieListSummary } from '@/features/library/api/listsApi';
import type { PublicListRef } from '@/features/library/api/publicListsApi';
import type { SavedListSourceType } from '@/features/library/api/savedListsApi';
import { useCreateList, useMyLists, useUpdateList } from '@/features/library/hooks/useLists';
import { useCopyPublicList } from '@/features/library/hooks/usePublicLists';
import { isMemberList } from '@/features/library/utils/listMembers';
import { useCopySavedList } from '@/features/library/hooks/useSavedLists';
import {
  LIST_DESCRIPTION_MAX_LENGTH,
  LIST_NAME_MAX_LENGTH,
  isListNameTaken,
  normalizeListName,
} from '@/features/library/utils/listName';
import styles from './ListFormDialog.module.css';

interface EditableList {
  id: string;
  name: string;
  description: string | null;
  isPublic?: boolean;
}

type CopiedListSource =
  { savedListId: string; publicList?: never } | { publicList: PublicListRef; savedListId?: never };

type CopiedList = CopiedListSource & {
  name: string;
  sourceType: SavedListSourceType;
};

type ListFormMode = 'create' | 'edit' | 'createAndAdd' | 'copy';

type ListVisibility = 'private' | 'public';

interface ListFormDialogProps {
  mode: ListFormMode;
  onClose: () => void;
  onSaved: (list: { id: string }) => void;
  list?: EditableList;
  item?: MovieListItemBody;
  copyOf?: CopiedList;
  knownLists?: readonly MovieListSummary[];
}

const SUBMIT_LABEL_KEYS: Record<ListFormMode, TranslationKey> = {
  create: 'lists.form.create',
  edit: 'lists.form.save',
  createAndAdd: 'lists.form.createAndAdd',
  copy: 'lists.copy.submit',
};

const TITLE_KEYS: Record<ListFormMode, TranslationKey> = {
  create: 'lists.form.createTitle',
  edit: 'lists.form.editTitle',
  createAndAdd: 'lists.form.createTitle',
  copy: 'lists.copy.title',
};

const COPY_HINT_KEYS: Record<SavedListSourceType, TranslationKey> = {
  tmdbCollection: 'lists.copy.hintCollection',
  explorerTheme: 'lists.copy.hintTheme',
  memberList: 'lists.copy.hintMemberList',
  memberWatched: 'lists.copy.hintMemberList',
  memberProposals: 'lists.copy.hintMemberList',
  memberWinningProposals: 'lists.copy.hintMemberList',
};

const VISIBILITY_HINT_KEYS: Record<ListVisibility, TranslationKey> = {
  private: 'lists.form.visibilityPrivateHint',
  public: 'lists.form.visibilityPublicHint',
};

function initialName(list?: EditableList, copyOf?: CopiedList): string {
  return list?.name ?? copyOf?.name.slice(0, LIST_NAME_MAX_LENGTH) ?? '';
}

function VisibilityHint({ value }: Readonly<{ value: ListVisibility }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (value === 'public' && user?.isProfilePublic === false) {
    return (
      <>
        {t('lists.form.visibilityPublicPrivateProfileHint')}{' '}
        <Link to={ROUTES.accountProfile} className={styles.profileLink}>
          {t('lists.form.visibilityProfileLink')}
        </Link>
      </>
    );
  }
  return t(VISIBILITY_HINT_KEYS[value]);
}

function VisibilityField({
  value,
  onChange,
}: Readonly<{ value: ListVisibility; onChange: (value: ListVisibility) => void }>) {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();
  const options = useMemo(
    () => [
      {
        value: 'private' as const,
        label: t('lists.form.visibilityPrivate'),
        icon: <Lock aria-hidden size={ICON_SIZE.sm} />,
      },
      {
        value: 'public' as const,
        label: t('lists.form.visibilityPublic'),
        icon: <Globe aria-hidden size={ICON_SIZE.sm} />,
      },
    ],
    [t]
  );
  return (
    <div className={styles.visibility}>
      <span id={labelId} className="label">
        {t('lists.form.visibilityLabel')}
      </span>
      <SegmentedRadioGroup
        options={options}
        value={value}
        onChange={onChange}
        ariaLabelledBy={labelId}
        ariaDescribedBy={hintId}
        size="sm"
      />
      <p id={hintId} className="hint">
        <VisibilityHint value={value} />
      </p>
    </div>
  );
}

export default function ListFormDialog({
  mode,
  onClose,
  onSaved,
  list,
  item,
  copyOf,
  knownLists,
}: Readonly<ListFormDialogProps>) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState(() => initialName(list, copyOf));
  const [description, setDescription] = useState(list?.description ?? '');
  const [visibility, setVisibility] = useState<ListVisibility>(
    list?.isPublic ? 'public' : 'private'
  );
  const [rejectedName, setRejectedName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const myLists = useMyLists({ enabled: knownLists === undefined });
  const createList = useCreateList();
  const updateList = useUpdateList();
  const copySavedList = useCopySavedList();
  const copyPublicList = useCopyPublicList();
  const pending =
    createList.isPending ||
    updateList.isPending ||
    copySavedList.isPending ||
    copyPublicList.isPending;
  const withDescription = mode === 'create' || mode === 'edit';
  const isPublic = visibility === 'public';

  const trimmedName = name.trim();
  const existingNames = (knownLists ?? myLists.data ?? [])
    .filter((summary) => !isMemberList(summary))
    .map((summary) => summary.name);
  const rejectedByServer =
    rejectedName !== null && normalizeListName(rejectedName) === normalizeListName(name);
  const nameTaken = rejectedByServer || isListNameTaken(name, existingNames, list?.name);
  const nameError = nameTaken ? t('lists.form.nameTaken', { name: trimmedName }) : undefined;
  const canSubmit = trimmedName.length > 0 && !nameTaken && !pending;

  const save = () => {
    const trimmedDescription = description.trim();
    if (mode === 'edit' && list) {
      return updateList.mutateAsync({
        id: list.id,
        body: { name: trimmedName, description: trimmedDescription || null, isPublic },
      });
    }
    if (mode === 'createAndAdd') {
      return createList.mutateAsync({ name: trimmedName, firstItem: item });
    }
    if (mode === 'copy' && copyOf?.publicList) {
      return copyPublicList.mutateAsync({ ref: copyOf.publicList, name: trimmedName });
    }
    if (mode === 'copy' && copyOf?.savedListId) {
      return copySavedList.mutateAsync({ id: copyOf.savedListId, name: trimmedName });
    }
    return createList.mutateAsync({
      name: trimmedName,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      isPublic,
    });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setFormError(null);
    try {
      onSaved(await save());
    } catch (error) {
      if (ApiError.is(error) && error.reason === API_ERROR_REASONS.listNameTaken) {
        setRejectedName(trimmedName);
        return;
      }
      setFormError(getErrorMessage(error, t('errors.generic')));
    }
  };

  const title = t(TITLE_KEYS[mode]);
  let hint: string | undefined;
  if (mode === 'createAndAdd' && item) hint = t('lists.form.addHint', { title: item.title });
  if (mode === 'copy' && copyOf) hint = t(COPY_HINT_KEYS[copyOf.sourceType]);

  return (
    <ResponsiveDialog
      open
      title={title}
      onClose={onClose}
      footer={
        <ModalActions>
          <Button type="button" onClick={onClose}>
            {t('lists.form.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabled={!canSubmit}
            loading={pending}
          >
            {t(SUBMIT_LABEL_KEYS[mode])}
          </Button>
        </ModalActions>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <Field label={t('lists.form.nameLabel')} error={nameError} hint={hint}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              className="input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('lists.form.namePlaceholder')}
              maxLength={LIST_NAME_MAX_LENGTH}
              autoComplete="off"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              required
            />
          )}
        </Field>
        {withDescription ? (
          <Field
            label={
              <>
                {t('lists.form.descriptionLabel')}{' '}
                <span className={styles.optional}>{t('lists.form.optional')}</span>
              </>
            }
          >
            {({ id, describedBy }) => (
              <textarea
                id={id}
                className="input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('lists.form.descriptionPlaceholder')}
                maxLength={LIST_DESCRIPTION_MAX_LENGTH}
                rows={2}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        ) : null}
        {withDescription ? <VisibilityField value={visibility} onChange={setVisibility} /> : null}
        {formError ? (
          <p className="error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </ResponsiveDialog>
  );
}
