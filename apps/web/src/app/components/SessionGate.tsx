import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import SignedOutState from '@/shared/components/SignedOutState';
import SessionCheckErrorState from '@/features/auth/components/SessionCheckErrorState';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { hasSessionHint } from '@/features/auth/session-hint';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import styles from './SessionGate.module.css';

type SessionGateProps = {
  icon: ReactNode;
  headingKey: TranslationKey;
  headingHidden?: boolean;
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  returnTo: string;
  maxWidth?: string;
  back?: { to: string; labelKey: TranslationKey };
  children: ReactNode;
};

export default function SessionGate({
  icon,
  headingKey,
  headingHidden,
  titleKey,
  messageKey,
  returnTo,
  maxWidth,
  back,
  children,
}: Readonly<SessionGateProps>) {
  const { user, isLoading, authCheckFailed } = useAuth();
  const { t } = useTranslation();

  const sessionPossible = hasSessionHint();
  if (user || (sessionPossible && isLoading)) return <>{children}</>;
  if (sessionPossible && authCheckFailed) return <SessionCheckErrorState />;

  const layoutStyle = maxWidth ? ({ '--page-max-width': maxWidth } as CSSProperties) : undefined;

  return (
    <PageLayout style={layoutStyle}>
      <h1 className={headingHidden ? 'visually-hidden' : styles.title}>{t(headingKey)}</h1>
      {back ? (
        <Link to={back.to} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          <span className={styles.backLinkLabel}>{t(back.labelKey)}</span>
        </Link>
      ) : null}
      <SignedOutState icon={icon} title={t(titleKey)} message={t(messageKey)} returnTo={returnTo} />
    </PageLayout>
  );
}
