import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import SignedOutState from '@/shared/components/SignedOutState';
import SessionCheckErrorState from '@/features/auth/components/SessionCheckErrorState';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { hasSessionHint } from '@/features/auth/session-hint';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { returnToOf } from '@/shared/utils/returnTo';
import styles from './SessionGate.module.css';
import BackLink from '@/shared/components/BackLink';

type SessionGateProps = {
  icon: ReactNode;
  headingKey: TranslationKey;
  headingHidden?: boolean;
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  back?: { to: string; labelKey: TranslationKey };
  children: ReactNode;
};

function SignedOutGate({
  icon,
  headingKey,
  headingHidden,
  titleKey,
  messageKey,
  back,
}: Readonly<Omit<SessionGateProps, 'children'>>) {
  const { t } = useTranslation();
  const location = useLocation();
  useNoindexPage(pageTitle(t(headingKey)), location.pathname);

  return (
    <PageLayout>
      <h1 className={headingHidden ? 'visually-hidden' : styles.title}>{t(headingKey)}</h1>
      {back ? (
        <BackLink to={back.to} className={styles.backLink}>
          {t(back.labelKey)}
        </BackLink>
      ) : null}
      <SignedOutState
        icon={icon}
        title={t(titleKey)}
        message={t(messageKey)}
        returnTo={returnToOf(location)}
      />
    </PageLayout>
  );
}

export default function SessionGate({ children, ...signedOut }: Readonly<SessionGateProps>) {
  const { user, isLoading, authCheckFailed } = useAuth();

  const sessionPossible = hasSessionHint();
  if (user || (sessionPossible && isLoading)) return <>{children}</>;
  if (sessionPossible && authCheckFailed) return <SessionCheckErrorState />;

  return <SignedOutGate {...signedOut} />;
}
