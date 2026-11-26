import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router';
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
import AccountLoadingSkeleton from '@/app/pages/account/AccountLoadingSkeleton';
import styles from './AccountPage.module.css';
import AccountChoiceLinks from '@/shared/components/AccountChoiceLinks';
import Field from '@/shared/components/Field';

const loadAccountSettingsRoutes = () => import('@/app/pages/account/AccountSettingsRoutes');
const AccountSettingsRoutes = lazy(loadAccountSettingsRoutes);

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

function AccountLoading() {
  return (
    <PageLayout className={styles.layoutWide}>
      <AccountLoadingSkeleton />
    </PageLayout>
  );
}

export default function AccountPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.account.title')), ROUTES.account);
  const { user, isLoading, authCheckFailed } = useAuth();
  const returnTo = returnToOf(useLocation());
  const sessionHinted = hasSessionHint();

  useEffect(() => {
    if (sessionHinted) loadAccountSettingsRoutes().catch(() => undefined);
  }, [sessionHinted]);

  if (isLoading && sessionHinted) return <AccountLoading />;

  if (!user && authCheckFailed && sessionHinted) return <SessionCheckErrorState />;

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

  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountSettingsRoutes user={user} />
    </Suspense>
  );
}
