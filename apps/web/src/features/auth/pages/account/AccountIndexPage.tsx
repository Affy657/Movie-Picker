import { Navigate, Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import type { UserProfile } from '@/features/auth/types';
import AccountIdentityHeader from './AccountIdentityHeader';
import { ACCOUNT_RUBRIQUES } from './accountRubriques';
import styles from './AccountIndexPage.module.css';

export default function AccountIndexPage({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const needsAttention = user.letterboxdPendingReconciliationCount > 0;

  if (!isMobile) {
    return <Navigate to={ACCOUNT_RUBRIQUES[0]!.key} replace />;
  }

  return (
    <div>
      <AccountIdentityHeader user={user} variant="mobile" />

      <ul className={styles.navList}>
        {ACCOUNT_RUBRIQUES.map((rubrique) => {
          const Icon = rubrique.icon;
          const showDot = rubrique.key === 'integrations' && needsAttention;
          return (
            <li key={rubrique.key}>
              <Link to={rubrique.to} className={styles.navItem}>
                <Icon size={18} aria-hidden className={styles.navIcon} />
                <span className={styles.navText}>
                  <span className={styles.navLabel}>{t(rubrique.labelKey)}</span>
                  <span className={styles.navSummary}>{t(rubrique.summaryKey)}</span>
                </span>
                {showDot && (
                  <>
                    <span className={styles.navDot} aria-hidden="true" />
                    <span className="visually-hidden">{t('auth.account.attentionSuffix')}</span>
                  </>
                )}
                <ChevronRight size={16} aria-hidden className={styles.navChevron} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
