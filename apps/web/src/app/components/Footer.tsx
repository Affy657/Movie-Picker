import clsx from 'clsx';
import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { APP_VERSION } from '@/shared/appVersion';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { usePwaInstallClick } from '@/shared/hooks/usePwaInstall';
import ProposeIdeaButton from './ProposeIdeaButton';
import SupportReportButton from './SupportReportButton';
import InstallPwaDialog from './InstallPwaDialog';
import ThemeToggle from './ThemeToggle';
import styles from './Footer.module.css';

type FooterProps = {
  clearMobileNav?: boolean;
  onOpenWhatsNew?: () => void;
};

function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.socialIcon}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.socialIcon}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ clearMobileNav = false, onOpenWhatsNew }: Readonly<FooterProps>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    shouldShow: showInstall,
    mode: installMode,
    guideOpen: installGuideOpen,
    guideMode: installGuideMode,
    onClick: onInstallClick,
    closeGuide: closeInstallGuide,
  } = usePwaInstallClick('footer');

  return (
    <footer
      className={clsx(styles.footer, clearMobileNav && styles.aboveMobileNav)}
      aria-label={t('footer.ariaLabel')}
    >
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to={ROUTES.home} className={styles.brandLink}>
            <span className={styles.brandName}>Movie Picker</span>
          </Link>
          <p className={styles.brandTagline}>{t('footer.tagline')}</p>
          {showInstall ? (
            <button
              type="button"
              className={clsx(styles.colLink, styles.colButtonReset, styles.brandAction)}
              aria-haspopup={installMode === 'native' ? undefined : 'dialog'}
              onClick={() => void onInstallClick()}
            >
              {t('pwaInstall.trigger')}
            </button>
          ) : null}
          <ul className={styles.socialList} aria-label={t('footer.socialTitle')}>
            <li>
              <a
                href="https://github.com/Affy657"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label={t('footer.githubLabel')}
              >
                <GitHubIcon />
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/adrien-morand/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label={t('footer.linkedinLabel')}
              >
                <LinkedInIcon />
                LinkedIn
              </a>
            </li>
          </ul>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('footer.navTitle')}</p>
          <ul className={styles.colList}>
            <li>
              <Link to={ROUTES.home} className={styles.colLink}>
                {t('nav.home')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.howItWorks} className={styles.colLink}>
                {t('nav.landing.howItWorks')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.myEvents} className={styles.colLink}>
                {t('nav.myEvents')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.createEvent} className={styles.colLink}>
                {t('nav.createEvent')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.watchlist} className={styles.colLink}>
                {t('nav.watchlist')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.account} className={styles.colLink}>
                {t('nav.account')}
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('footer.helpTitle')}</p>
          <ul className={styles.colList}>
            <li>
              <SupportReportButton className={clsx(styles.colLink, styles.colButtonReset)} />
            </li>
            {user ? (
              <li>
                <ProposeIdeaButton className={clsx(styles.colLink, styles.colButtonReset)} />
              </li>
            ) : null}
            <li>
              <Link to={ROUTES.donate} className={styles.colLink}>
                {t('footer.donate')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.tech} className={styles.colLink}>
                {t('footer.tech')}
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>{t('footer.legalTitle')}</p>
          <ul className={styles.colList}>
            <li>
              <Link to={ROUTES.legalNotice} className={styles.colLink}>
                {t('footer.legalNotice')}
              </Link>
            </li>
            <li>
              <Link to={ROUTES.privacyPolicy} className={styles.colLink}>
                {t('footer.privacyPolicy')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.meta}>
          <div className={styles.copyrightRow}>
            <p className={styles.copyright}>
              {t('footer.copyright', { year: String(CURRENT_YEAR), version: APP_VERSION })}
            </p>
            {onOpenWhatsNew ? (
              <button type="button" className={styles.whatsNewLink} onClick={onOpenWhatsNew}>
                {t('footer.whatsNew')}
              </button>
            ) : null}
          </div>
          <p className={styles.tmdb}>
            {t('footer.tmdbPrefix')}{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.tmdbLink}
              aria-label={t('footer.tmdbLinkAria')}
            >
              TMDB
            </a>
            {t('footer.tmdbSuffix')}
          </p>
        </div>

        <div className={styles.appearance}>
          <span className={styles.appearanceLabel} id="footer-theme-label">
            {t('footer.appearanceTitle')}
          </span>
          <ThemeToggle
            id="footer-theme"
            ariaLabelledBy="footer-theme-label"
            size="sm"
            iconOnly
            className={styles.appearanceToggle}
          />
        </div>
      </div>
      {installGuideOpen ? (
        <InstallPwaDialog open mode={installGuideMode} onClose={closeInstallGuide} />
      ) : null}
    </footer>
  );
}
