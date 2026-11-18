import { Globe, Lock } from 'lucide-react';
import { MenuItem } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import ListActionsMenu from '@/features/library/components/ListActionsMenu';

export default function CollectionVisibilityMenu({
  isPublic,
  onChange,
}: Readonly<{ isPublic: boolean; onChange: (isPublic: boolean) => void }>) {
  const { t } = useTranslation();
  return (
    <ListActionsMenu>
      {(pick) => (
        <MenuItem
          icon={
            isPublic ? (
              <Lock aria-hidden size={ICON_SIZE.sm} />
            ) : (
              <Globe aria-hidden size={ICON_SIZE.sm} />
            )
          }
          onClick={pick(() => onChange(!isPublic))}
        >
          {isPublic ? t('lists.visibility.makePrivate') : t('lists.visibility.makePublic')}
        </MenuItem>
      )}
    </ListActionsMenu>
  );
}
