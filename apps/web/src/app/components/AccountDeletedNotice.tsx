import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import Notice from '@/shared/components/Notice';
import { returnToOf } from '@/shared/utils/returnTo';
import { arrivesFromDeletion } from '@/app/pages/account/accountDeletedState';
import { useTopNoticeTurn } from './topNoticeQueue';

export default function AccountDeletedNotice() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const shown = useTopNoticeTurn('accountDeleted', arrivesFromDeletion(location.state));

  if (!shown) return null;

  return (
    <Notice
      title={t('auth.account.accountDeletedTitle')}
      description={t('auth.account.accountDeletedDescription')}
      onClose={() => void navigate(returnToOf(location), { replace: true, state: null })}
    />
  );
}
