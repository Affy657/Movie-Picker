import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import Notice from '@/shared/components/Notice';
import { useTopNoticeTurn } from './topNoticeQueue';

export default function SignOutPendingNotice() {
  const { t } = useTranslation();
  const { signOutPending } = useAuth();
  const shown = useTopNoticeTurn('signOutPending', signOutPending);

  if (!shown) return null;

  return (
    <Notice
      title={t('auth.logout.pendingTitle')}
      description={t('auth.logout.pendingDescription')}
    />
  );
}
