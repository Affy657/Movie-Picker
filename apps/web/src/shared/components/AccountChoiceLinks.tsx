import { Link } from 'react-router';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { buttonClass, buttonLabelClass } from './Button';

export type AccountChoice = 'register' | 'login';

type AccountChoiceLinksProps = {
  returnTo: string;
  fullWidth?: boolean;
  linkClassName?: string;
  onChoose?: (choice: AccountChoice) => void;
};

const CHOICES = [
  { choice: 'register', path: ROUTES.register, labelKey: 'home.ctaRegister', variant: 'primary' },
  { choice: 'login', path: ROUTES.login, labelKey: 'home.ctaHaveAccount', variant: 'secondary' },
] as const;

export default function AccountChoiceLinks({
  returnTo,
  fullWidth = false,
  linkClassName,
  onChoose,
}: Readonly<AccountChoiceLinksProps>) {
  const { t } = useTranslation();

  return (
    <>
      {CHOICES.map(({ choice, path, labelKey, variant }) => {
        const label = t(labelKey);
        return (
          <Link
            key={choice}
            to={withReturnTo(path, returnTo)}
            className={linkClassName ?? buttonClass({ variant, fullWidth })}
            onClick={() => onChoose?.(choice)}
          >
            {linkClassName ? label : <span className={buttonLabelClass(label)}>{label}</span>}
          </Link>
        );
      })}
    </>
  );
}
