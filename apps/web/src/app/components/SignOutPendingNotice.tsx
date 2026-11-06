import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import Notice from '@/shared/components/Notice';

export default function SignOutPendingNotice() {
  const { t } = useTranslation();
  const { signOutPending } = useAuth();

  if (!signOutPending) return null;

  return (
    <Notice
      title={t('auth.logout.pendingTitle')}
      description={t('auth.logout.pendingDescription')}
    />
  );
}
