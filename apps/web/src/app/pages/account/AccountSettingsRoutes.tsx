import { Navigate, Route, Routes } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { UserProfile } from '@/features/auth/types';
import AccountLayout from '@/app/pages/account/AccountLayout';
import AccountIndexPage from '@/app/pages/account/AccountIndexPage';
import ProfileEditPage from '@/app/pages/account/ProfileEditPage';
import AccountPreferencesPage from '@/app/pages/account/AccountPreferencesPage';
import AccountNotificationsPage from '@/app/pages/account/AccountNotificationsPage';
import AccountIntegrationsPage from '@/app/pages/account/AccountIntegrationsPage';
import AccountSecurityPage from '@/app/pages/account/AccountSecurityPage';
import styles from './AccountPage.module.css';

function AccountSettings({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();

  return (
    <PageLayout className={styles.layoutWide}>
      <h1 className="visually-hidden">{t('auth.account.title')}</h1>
      <Routes>
        <Route index element={<AccountIndexPage user={user} />} />
        <Route element={<AccountLayout user={user} />}>
          <Route path="preferences" element={<AccountPreferencesPage />} />
          <Route path="notifications" element={<AccountNotificationsPage />} />
          <Route path="integrations" element={<AccountIntegrationsPage user={user} />} />
          <Route path="securite" element={<AccountSecurityPage user={user} />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.accountPreferences} replace />} />
      </Routes>
    </PageLayout>
  );
}

export default function AccountSettingsRoutes({ user }: Readonly<{ user: UserProfile }>) {
  return (
    <Routes>
      <Route path="profil" element={<ProfileEditPage user={user} />} />
      <Route path="*" element={<AccountSettings user={user} />} />
    </Routes>
  );
}
