import { BookmarkCheck, BookmarkPlus } from 'lucide-react';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation, type TranslationKey } from '@/shared/i18n';

function labelKey(saved: boolean, compact: boolean): TranslationKey {
  if (saved) return 'lists.saved.saved';
  return compact ? 'lists.saved.saveShort' : 'lists.saved.save';
}

export default function SavedToggleButton({
  saved,
  compact,
  disabled,
  onClick,
}: Readonly<{ saved: boolean; compact: boolean; disabled?: boolean; onClick: () => void }>) {
  const { t } = useTranslation();
  const Icon = saved ? BookmarkCheck : BookmarkPlus;
  return (
    <Button
      type="button"
      variant={saved ? 'soft' : 'secondary'}
      size={compact ? 'sm' : 'md'}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden size={ICON_SIZE.md} />
      <span>{t(labelKey(saved, compact))}</span>
    </Button>
  );
}
