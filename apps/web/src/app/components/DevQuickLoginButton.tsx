import { useState } from 'react';
import Button from '@/shared/components/Button';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  DEV_QUICK_LOGIN_EMAIL,
  DEV_QUICK_LOGIN_PASSWORD,
} from '@/features/auth/devQuickLoginCredentials';
import { useTranslation } from '@/shared/i18n';

export default function DevQuickLoginButton({
  returnTo,
  className,
}: Readonly<{ returnTo: string; className?: string }>) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [pending, setPending] = useState(false);

  const signIn = () => {
    setPending(true);
    login(DEV_QUICK_LOGIN_EMAIL, DEV_QUICK_LOGIN_PASSWORD, returnTo)
      .catch(() => undefined)
      .finally(() => setPending(false));
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className={className}
      disabled={pending}
      onClick={signIn}
      aria-label={t('auth.login.devQuickAriaLabel')}
    >
      {t('auth.login.devQuickButton')}
    </Button>
  );
}
