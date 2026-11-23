import { useLocation } from 'react-router';
import { BookmarkPlus } from 'lucide-react';
import AccountPromptLink from '@/shared/components/AccountPromptLink';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import SavedToggleButton from '@/features/library/components/SavedToggleButton';
import type { useSavedListToggle } from '@/features/library/hooks/useSavedLists';

function SaveForVisitor({ compact }: Readonly<{ compact: boolean }>) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <AccountPromptLink
      returnTo={pathname}
      title={t('lists.saved.visitorTitle')}
      message={t('lists.saved.visitorMessage')}
      className={buttonClass({ size: compact ? 'sm' : 'md' })}
    >
      <BookmarkPlus aria-hidden size={ICON_SIZE.md} />
      <span>{t(compact ? 'lists.saved.saveShort' : 'lists.saved.save')}</span>
    </AccountPromptLink>
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
