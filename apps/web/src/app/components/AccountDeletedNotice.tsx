import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import Notice from '@/shared/components/Notice';
import { returnToOf } from '@/shared/utils/returnTo';
import { arrivesFromDeletion } from '@/app/pages/account/accountDeletedState';

export default function AccountDeletedNotice() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  if (!arrivesFromDeletion(location.state)) return null;

  return (
    <Notice
      title={t('auth.account.accountDeletedTitle')}
      description={t('auth.account.accountDeletedDescription')}
      onClose={() => void navigate(returnToOf(location), { replace: true, state: null })}
    />
  );
}
