import { NavLink, Outlet, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import type { UserProfile } from '@/features/auth/types';
import AccountIdentityHeader from './AccountIdentityHeader';
import { ACCOUNT_RUBRIQUES } from './accountRubriques';
import styles from './AccountLayout.module.css';

export default function AccountLayout({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const needsAttention = user.letterboxdPendingReconciliationCount > 0;

  return (
    <div className={styles.account}>
      {!isMobile && <AccountIdentityHeader user={user} variant="desktop" />}

      {isMobile ? (
        <div className={styles.mobileSubHeader}>
          <button type="button" className={styles.back} onClick={() => navigate(ROUTES.account)}>
            <ChevronLeft size={16} aria-hidden />
            <span>{t('auth.account.backToAccount')}</span>
          </button>
        </div>
      ) : (
        <nav className={styles.rubrics} aria-label={t('auth.account.rubricsNavAriaLabel')}>
          {ACCOUNT_RUBRIQUES.map((rubrique) => {
            const Icon = rubrique.icon;
            const showDot = rubrique.key === 'integrations' && needsAttention;
            return (
              <NavLink
                key={rubrique.key}
                to={rubrique.to}
                end
                className={({ isActive }) =>
                  isActive ? `${styles.rubric} ${styles.rubricActive}` : styles.rubric
                }
              >
                <Icon size={17} aria-hidden />
                <span>{t(rubrique.labelKey)}</span>
                {showDot && (
                  <>
                    <span className={styles.rubricDot} aria-hidden="true" />
                    <span className="visually-hidden">{t('auth.account.attentionSuffix')}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      )}

      <div className={styles.panel}>
        <Outlet />
      </div>
    </div>
  );
}
