import { useTranslation } from '@/shared/i18n';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t('auth.forgotPassword.title')}</h1>
      <p>{t('auth.forgotPassword.description')}</p>
    </main>
  );
}
