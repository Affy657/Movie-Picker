import { Link } from 'react-router';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { buttonClass, buttonLabelClass } from './Button';

export type AccountChoice = 'register' | 'login';

type AccountChoiceLinksProps = {
  returnTo: string;
  fullWidth?: boolean;
  onChoose?: (choice: AccountChoice) => void;
};

export default function AccountChoiceLinks({
  returnTo,
  fullWidth = false,
  onChoose,
}: Readonly<AccountChoiceLinksProps>) {
  const { t } = useTranslation();
  const registerLabel = t('home.ctaRegister');
  const loginLabel = t('home.ctaHaveAccount');

  return (
    <>
      <Link
        to={withReturnTo(ROUTES.register, returnTo)}
        className={buttonClass({ variant: 'primary', fullWidth })}
        onClick={() => onChoose?.('register')}
      >
        <span className={buttonLabelClass(registerLabel)}>{registerLabel}</span>
      </Link>
      <Link
        to={withReturnTo(ROUTES.login, returnTo)}
        className={buttonClass({ fullWidth })}
        onClick={() => onChoose?.('login')}
      >
        <span className={buttonLabelClass(loginLabel)}>{loginLabel}</span>
      </Link>
    </>
  );
}
