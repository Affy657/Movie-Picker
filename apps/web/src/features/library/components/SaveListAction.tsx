import { Link, useLocation } from 'react-router';
import { BookmarkPlus } from 'lucide-react';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { ROUTES, withReturnTo } from '@/app/routes';
import SavedToggleButton from '@/features/library/components/SavedToggleButton';
import type { useSavedListToggle } from '@/features/library/hooks/useSavedLists';

function SaveForVisitor({ compact }: Readonly<{ compact: boolean }>) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <Link
      to={withReturnTo(ROUTES.login, pathname)}
      className={buttonClass({ size: compact ? 'sm' : 'md' })}
    >
      <BookmarkPlus aria-hidden size={ICON_SIZE.md} />
      <span>{t(compact ? 'lists.saved.saveShort' : 'lists.saved.save')}</span>
    </Link>
  );
}

export default function SaveListAction({
  isSignedIn,
  compact,
  toggle,
}: Readonly<{
  isSignedIn: boolean;
  compact: boolean;
  toggle: ReturnType<typeof useSavedListToggle>;
}>) {
  if (!isSignedIn) return <SaveForVisitor compact={compact} />;
  return (
    <SavedToggleButton
      saved={toggle.saved}
      compact={compact}
      disabled={toggle.isLoading || toggle.isPending}
      onClick={toggle.toggle}
    />
  );
}
