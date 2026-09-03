import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageSelector from '@/app/components/LanguageSelector';
import AccentColorPicker from '@/app/components/AccentColorPicker';
import RatingScaleToggle from '@/app/components/RatingScaleToggle';
import AccountSavedChip from './AccountSavedChip';
import { useSavedFlash } from './useSavedFlash';
import styles from './AccountShared.module.css';

export default function AccountPreferencesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [saved, flashSaved] = useSavedFlash();

  return (
    <>
      <div className={styles.panelHead}>
        <h2 id="account-preferences-heading" className={styles.panelHeading}>
          {t('auth.account.preferencesTitle')}
        </h2>
        <AccountSavedChip visible={saved} />
      </div>

      <div className={styles.card}>
        <div className={styles.field}>
          <label className="label" htmlFor="account-language">
            {t('auth.account.languageLabel')}
          </label>
          <LanguageSelector id="account-language" />
        </div>

        <div className={styles.field}>
          <span className="label" id="account-theme-label">
            {t('auth.account.themeLabel')}
          </span>
          <ThemeToggle
            id="account-theme"
            ariaLabelledBy="account-theme-label"
            onSaved={flashSaved}
          />
        </div>

        <div className={styles.field}>
          <span className="label" id="account-accent-label">
            {t('auth.account.accentColorLabel')}
          </span>
          <AccentColorPicker
            id="account-accent"
            ariaLabelledBy="account-accent-label"
            onSaved={flashSaved}
          />
          <p className="hint">{t('auth.account.accentColorHint')}</p>
        </div>

        {user && (
          <div className={styles.field}>
            <span className="label" id="account-rating-scale-label">
              {t('auth.account.ratingScaleLabel')}
            </span>
            <RatingScaleToggle
              id="account-rating-scale"
              ariaLabelledBy="account-rating-scale-label"
              onSaved={flashSaved}
            />
          </div>
        )}
      </div>
    </>
  );
}
