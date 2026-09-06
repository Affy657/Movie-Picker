import clsx from 'clsx';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import shared from './landingShared.module.css';
import styles from './LandingTrust.module.css';

const ITEMS = ['free', 'data', 'a11y', 'tmdb'] as const;

export default function LandingTrust() {
  const { t } = useTranslation();

  return (
    <section className={clsx(shared.section, styles.section)} aria-labelledby="landing-trust">
      <div className={shared.container}>
        <h2 className="visually-hidden" id="landing-trust">
          {t('landing.trust.srTitle')}
        </h2>
        <div className={styles.grid}>
          {ITEMS.map((item) => (
            <div key={item} className={clsx(styles.item, shared.reveal)}>
              <p className={styles.title}>{t(`landing.trust.${item}.title` as TranslationKey)}</p>
              <p className={styles.text}>{t(`landing.trust.${item}.text` as TranslationKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
