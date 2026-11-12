import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export default function VoteLimitDialog({
  open,
  maxVotes,
  onClose,
}: Readonly<{ open: boolean; maxVotes: number | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const max = maxVotes ?? 0;
  return (
    <ConfirmDialog
      open={open}
      title={t('movies.list.voteLimitReachedTitle')}
      message={pluralizeCount(
        max,
        'movies.list.voteLimitReachedOne',
        'movies.list.voteLimitReachedMany',
        t,
        { max }
      )}
      confirmLabel={t('movies.list.voteLimitReachedOk')}
      confirmTone="default"
      hideCancel
      onConfirm={onClose}
      onCancel={onClose}
      testId="vote-limit-dialog"
    />
  );
}
