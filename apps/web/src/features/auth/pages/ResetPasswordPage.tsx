import { useTranslation } from '@/shared/i18n';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t('auth.resetPassword.title')}</h1>
      <p>{t('auth.resetPassword.description')}</p>
    </main>
  );
}
