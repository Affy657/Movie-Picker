import { useCallback, useMemo, useState, type ComponentProps } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Globe,
  HeartHandshake,
  LogOut,
  MessageSquare,
  Palette,
  Settings,
  Sparkles,
} from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import CountBadge from '@/shared/components/CountBadge';
import {
  MenuChoiceRow,
  MenuItem,
  MenuPanel,
  MenuSeparator,
  type MenuChoiceOption,
} from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposeIdeaDialog } from '@/app/components/ProposeIdeaButton';
import {
  THEME_ICON,
  THEME_LABEL_KEY,
  THEME_OPTIONS,
  useUiThemeChoice,
} from '@/app/components/useUiThemeChoice';
import { ROUTES } from '@/app/routes';
import {
  useLocale,
  useTranslation,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  type LocaleCode,
} from '@/shared/i18n';
import type { UiThemePreference } from '@/shared/types/theme';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { usePwaInstallClick } from '@/shared/hooks/usePwaInstall';
import { hasUnseenReleaseNotes } from '@/shared/releaseNotesSeen';
import InstallPwaDialog from '@/shared/components/InstallPwaDialog';
import type { UserProfile } from '@/features/auth/types';
import { ownProfileDestination } from '@/features/auth/utils/ownProfileDestination';
import styles from './UserMenu.module.css';

type UserMenuProps = {
  user: UserProfile;
};

function menuIcon(Icon: typeof Settings) {
  return <Icon className={styles.icon} size={ICON_SIZE.lg} aria-hidden="true" focusable="false" />;
}

function ProfileSummary({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const handleKey = user.isProfilePublic ? 'nav.publicProfileHandle' : 'nav.privateProfileHandle';
  return (
    <span className={styles.identity}>
      <span className={styles.name}>{user.displayName}</span>
      {user.handle ? (
        <span className={styles.handle}>{t(handleKey, { handle: user.handle })}</span>
      ) : null}
    </span>
  );
}

function ProfileHeader({ user, onClose }: Readonly<{ user: UserProfile; onClose: () => void }>) {
  const { t } = useTranslation();
  const ownProfile = ownProfileDestination(user);
  const avatar = <Avatar avatarId={user.avatarId} pseudo={user.displayName} size="md" />;
  if (!ownProfile.isPublicProfile) {
    return (
      <div className={styles.header}>
        {avatar}
        <ProfileSummary user={user} />
      </div>
    );
  }
  return (
    <MenuItem
      to={ownProfile.path}
      icon={avatar}
      ariaLabel={t('profile.settings.viewMyProfile')}
      trailing={menuIcon(ChevronRight)}
      onClick={onClose}
    >
      <ProfileSummary user={user} />
    </MenuItem>
  );
}

function PreferenceRows() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const theme = useUiThemeChoice();

  const themeOptions = useMemo<ReadonlyArray<MenuChoiceOption<UiThemePreference>>>(
    () =>
      THEME_OPTIONS.map((code) => {
        const Icon = THEME_ICON[code];
        return {
          value: code,
          label: t(THEME_LABEL_KEY[code]),
          content: <Icon size={ICON_SIZE.sm} aria-hidden="true" focusable="false" />,
        };
      }),
    [t]
  );

  const localeOptions = useMemo<ReadonlyArray<MenuChoiceOption<LocaleCode>>>(
    () =>
      SUPPORTED_LOCALES.map((code) => ({
        value: code,
        label: LOCALE_LABELS[code],
        content: code.toUpperCase(),
      })),
    []
  );

  return (
    <>
      <MenuChoiceRow
        label={t('nav.appearance')}
        icon={menuIcon(Palette)}
        options={themeOptions}
        value={theme.preference}
        onChange={theme.commit}
      />
      <MenuChoiceRow
        label={t('nav.language')}
        icon={menuIcon(Globe)}
        options={localeOptions}
        value={locale}
        onChange={setLocale}
      />
      {theme.error ? (
        <p className={styles.error} role="alert">
          {theme.error}
        </p>
      ) : null}
    </>
  );
}

type UserMenuPanelProps = {
  user: UserProfile;
  panelProps: Omit<ComponentProps<typeof MenuPanel>, 'ariaLabel' | 'children'>;
  onClose: () => void;
  onOpenFeedback: () => void;
  install: { show: boolean; mode: string | null; onClick: () => Promise<void> | void };
  logout: { run: () => Promise<unknown>; loading: boolean; error: string | null };
};

function UserMenuPanel({
  user,
  panelProps,
  onClose,
  onOpenFeedback,
  install,
  logout,
}: Readonly<UserMenuPanelProps>) {
  const { t } = useTranslation();
  const [releaseNotesUnseen] = useState(() => hasUnseenReleaseNotes());

  return (
    <MenuPanel {...panelProps} ariaLabel={t('nav.accountMenu')} className={styles.panel}>
      <ProfileHeader user={user} onClose={onClose} />
      <MenuSeparator />
      <MenuItem to={ROUTES.account} icon={menuIcon(Settings)} onClick={onClose}>
        {t('nav.account')}
      </MenuItem>
      <PreferenceRows />
      <MenuSeparator />
      <MenuItem
        to={ROUTES.releaseNotes}
        icon={menuIcon(Sparkles)}
        onClick={onClose}
        trailing={
          releaseNotesUnseen ? <CountBadge value={t('nav.whatsNewUnread')} size="sm" /> : undefined
        }
      >
        {t('nav.whatsNew')}
      </MenuItem>
      <MenuItem
        icon={menuIcon(MessageSquare)}
        aria-haspopup="dialog"
        onClick={() => {
          onClose();
          onOpenFeedback();
        }}
      >
        {t('nav.sendFeedback')}
      </MenuItem>
      {install.show ? (
        <MenuItem
          icon={menuIcon(Download)}
          aria-haspopup={install.mode === 'native' ? undefined : 'dialog'}
          onClick={() => {
            onClose();
            void install.onClick();
          }}
        >
          {t('pwaInstall.trigger')}
        </MenuItem>
      ) : null}
      <MenuItem to={ROUTES.donate} icon={menuIcon(HeartHandshake)} onClick={onClose}>
        {t('footer.donate')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={menuIcon(LogOut)} onClick={() => void logout.run()} disabled={logout.loading}>
        {logout.loading ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
      </MenuItem>
      {logout.error ? (
        <p className={styles.error} role="alert">
          {logout.error}
        </p>
      ) : null}
    </MenuPanel>
  );
}

export default function UserMenu({ user }: Readonly<UserMenuProps>) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const menu = useMenuState();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const {
    shouldShow: showInstall,
    mode: installMode,
    guideOpen: installGuideOpen,
    guideMode: installGuideMode,
    onClick: onInstallClick,
    closeGuide: closeInstallGuide,
  } = usePwaInstallClick('user_menu');

  const logoutAction = useCallback(() => logout(), [logout]);
  const {
    run: runLogout,
    loading: loggingOut,
    error: logoutError,
  } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

  return (
    <div ref={menu.containerRef} className={styles.container}>
      <button
        {...menu.triggerProps}
        type="button"
        className={styles.trigger}
        aria-label={t('nav.accountMenu')}
      >
        <Avatar avatarId={user.avatarId} pseudo={user.displayName} size="sm" />
        <ChevronDown
          className={styles.chevron}
          data-open={menu.open || undefined}
          aria-hidden="true"
          focusable="false"
        />
      </button>

      {menu.open ? (
        <UserMenuPanel
          user={user}
          panelProps={menu.panelProps}
          onClose={menu.close}
          onOpenFeedback={() => setFeedbackDialogOpen(true)}
          install={{ show: showInstall, mode: installMode, onClick: onInstallClick }}
          logout={{ run: runLogout, loading: loggingOut, error: logoutError }}
        />
      ) : null}
      {feedbackDialogOpen ? (
        <ProposeIdeaDialog
          open
          title={t('nav.sendFeedback')}
          onClose={() => setFeedbackDialogOpen(false)}
        />
      ) : null}
      {installGuideOpen ? (
        <InstallPwaDialog open mode={installGuideMode} onClose={closeInstallGuide} />
      ) : null}
    </div>
  );
}
