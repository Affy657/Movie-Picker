import { Navigate, Route, Routes, useLocation } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { hasSessionHint } from '@/features/auth/session-hint';
import SessionCheckErrorState from '@/features/auth/components/SessionCheckErrorState';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageSelector from '@/app/components/LanguageSelector';
import AccentColorPicker from '@/app/components/AccentColorPicker';
import { ROUTES } from '@/app/routes';
import { returnToOf } from '@/shared/utils/returnTo';
import type { UserProfile } from '@/features/auth/types';
import AccountLayout from '@/app/pages/account/AccountLayout';
import AccountIndexPage from '@/app/pages/account/AccountIndexPage';
import ProfileEditPage from '@/app/pages/account/ProfileEditPage';
import AccountPreferencesPage from '@/app/pages/account/AccountPreferencesPage';
import AccountNotificationsPage from '@/app/pages/account/AccountNotificationsPage';
import AccountIntegrationsPage from '@/app/pages/account/AccountIntegrationsPage';
import AccountSecurityPage from '@/app/pages/account/AccountSecurityPage';
import AccountLoadingSkeleton from '@/app/pages/account/AccountLoadingSkeleton';
import styles from './AccountPage.module.css';
import AccountChoiceLinks from '@/shared/components/AccountChoiceLinks';
import Field from '@/shared/components/Field';

function GuestPreferencesSection() {
  const { t } = useTranslation();

  return (
    <section className="section section--panel" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading">{t('auth.account.preferencesTitle')}</h2>
      <div className="form">
        <Field label={t('auth.account.languageLabel')} htmlFor="account-language">
          {({ id, labelId }) => <LanguageSelector id={id} ariaLabelledBy={labelId} />}
        </Field>

        <div className={styles.groupField}>
          <span className="label" id="account-theme-label">
            {t('auth.account.themeLabel')}
          </span>
          <ThemeToggle id="account-theme" ariaLabelledBy="account-theme-label" />
        </div>

        <div className={styles.groupField}>
          <span className="label" id="account-accent-label">
            {t('auth.account.accentColorLabel')}
          </span>
          <AccentColorPicker id="account-accent" ariaLabelledBy="account-accent-label" />
        </div>
      </div>
    </section>
  );
}

function AccountAuthenticated({ user }: Readonly<{ user: UserProfile }>) {
  return (
    <Routes>
      <Route path="profil" element={<ProfileEditPage user={user} />} />
      <Route path="*" element={<AccountSettings user={user} />} />
    </Routes>
  );
}

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

export default function AccountPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.account.title')), ROUTES.account);
  const { user, isLoading, authCheckFailed } = useAuth();
  const returnTo = returnToOf(useLocation());

  if (isLoading) {
    return (
      <PageLayout className={styles.layoutWide}>
        <AccountLoadingSkeleton />
      </PageLayout>
    );
  }

  if (!user && authCheckFailed && hasSessionHint()) return <SessionCheckErrorState />;

  if (!user) {
    return (
      <PageLayout className={styles.layout}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('auth.account.title')}</h1>
        </header>
        <p className="lead">{t('auth.account.guestLead')}</p>

        <GuestPreferencesSection />

        <nav className="nav-actions" aria-label={t('auth.account.guestNavAriaLabel')}>
          <AccountChoiceLinks returnTo={returnTo} />
        </nav>
      </PageLayout>
    );
  }

  return <AccountAuthenticated user={user} />;
}
