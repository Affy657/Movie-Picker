import { useCallback, useState } from 'react';
import type { ComponentType } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleHelp, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  fetchActiveSessions,
  revokeOtherSessions,
  revokeSession,
} from '@/features/auth/api/authApi';
import type { ActiveSession } from '@/features/auth/types';
import { sessionActivityLabel, sessionDeviceLabel } from '@/features/auth/utils/sessionDevice';
import { ApiError } from '@/shared/api/apiError';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import InlineError from '@/shared/components/InlineError';
import { Skeleton } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import styles from './ActiveSessionsCard.module.css';

const OTHERS = 'others';
const TITLE_ID = 'active-sessions-title';

const DEVICE_ICONS: Record<
  ActiveSession['deviceKind'],
  ComponentType<{ size?: number; 'aria-hidden'?: boolean; className?: string }>
> = {
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  unknown: CircleHelp,
};

function LogoutButton() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const logoutAction = useCallback(() => logout(), [logout]);
  const { run, loading, error } = useAsyncAction(logoutAction, t('auth.logout.fallbackError'));

  return (
    <>
      <Button type="button" disabled={loading} onClick={() => void run()}>
        {loading ? t('auth.logout.submitting') : t('auth.account.logoutButton')}
      </Button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function FallbackCurrentDeviceRow() {
  const { t } = useTranslation();
  return (
    <div className={sharedStyles.row}>
      <LogOut size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
      <div className={sharedStyles.rowMain}>
        <p className={sharedStyles.rowLabel}>{t('auth.account.sessionRowLabel')}</p>
        <p className={sharedStyles.rowSub}>{t('auth.account.sessionRowHint')}</p>
      </div>
      <LogoutButton />
    </div>
  );
}

type SessionRowProps = {
  session: ActiveSession;
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

function SessionRow({
  session,
  confirming,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: Readonly<SessionRowProps>) {
  const { t, locale } = useTranslation();
  const Icon = DEVICE_ICONS[session.deviceKind];
  const device = sessionDeviceLabel(session, t);

  return (
    <div className={sharedStyles.row}>
      <Icon size={ICON_SIZE.xl} aria-hidden className={sharedStyles.rowIcon} />
      <div className={sharedStyles.rowMain}>
        <p className={`${sharedStyles.rowLabel} ${styles.deviceName}`}>
          <span>{device}</span>
          {session.current && (
            <Chip tone="success" size="sm">
              {t('auth.account.activeSessionsCurrentChip')}
            </Chip>
          )}
        </p>
        <p className={sharedStyles.rowSub}>{sessionActivityLabel(session, locale, t)}</p>
      </div>
      {session.current && <LogoutButton />}
      {!session.current && confirming && (
        <div className={`nav-actions ${styles.actions}`}>
          <Button type="button" tone="danger" loading={busy} onClick={onConfirm}>
            {t('common.confirm')}
          </Button>
          <Button type="button" disabled={busy} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      )}
      {!session.current && !confirming && (
        <Button
          type="button"
          aria-label={t('auth.account.activeSessionsRevokeAriaLabel', { device })}
          onClick={onAsk}
        >
          {t('auth.account.activeSessionsRevokeButton')}
        </Button>
      )}
    </div>
  );
}

type OthersFooterProps = {
  othersCount: number;
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

function OthersFooter({
  othersCount,
  confirming,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: Readonly<OthersFooterProps>) {
  const { t } = useTranslation();
  if (othersCount === 0) {
    return <p className={styles.empty}>{t('auth.account.activeSessionsEmpty')}</p>;
  }
  if (confirming) {
    return (
      <div className={styles.footer}>
        <p className={styles.footerText}>
          {othersCount === 1
            ? t('auth.account.activeSessionsOthersConfirmOne')
            : t('auth.account.activeSessionsOthersConfirmMany', { count: String(othersCount) })}
        </p>
        <div className="nav-actions">
          <Button type="button" tone="danger" loading={busy} onClick={onConfirm}>
            {t('common.confirm')}
          </Button>
          <Button type="button" disabled={busy} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.footer}>
      <p className={styles.footerText}>{t('auth.account.activeSessionsOthersHint')}</p>
      <Button type="button" tone="danger" onClick={onAsk}>
        {t('auth.account.activeSessionsOthersButton')}
      </Button>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1].map((row) => (
        <div className={sharedStyles.row} key={row}>
          <Skeleton variant="block" width={ICON_SIZE.xl} height={ICON_SIZE.xl} />
          <div className={sharedStyles.rowMain}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="62%" className={styles.skeletonLine} />
          </div>
        </div>
      ))}
    </>
  );
}

function errorKeyOf(error: unknown): string | null {
  return ApiError.is(error) && error.reason === 'session_not_found' ? 'session_not_found' : null;
}

export default function ActiveSessionsCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: fetchActiveSessions,
  });
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const sessions = sessionsQuery.data ?? [];
  const others = sessions.filter((s) => !s.current);

  const ask = (target: string) => {
    setConfirming(target);
    setNotice(null);
    setFailure(null);
  };

  const settle = async (action: () => Promise<void>, done: string, failed: string) => {
    setBusy(true);
    try {
      await action();
      setNotice(done);
    } catch (error) {
      setFailure(errorKeyOf(error) ? t('apiErrors.session_not_found') : failed);
    } finally {
      setBusy(false);
      setConfirming(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
    }
  };

  const revokeOne = (session: ActiveSession) => {
    const device = sessionDeviceLabel(session, t);
    void settle(
      () => revokeSession(session.id),
      t('auth.account.activeSessionsRevoked', { device }),
      t('auth.account.activeSessionsRevokeError', { device })
    );
  };

  const revokeOthers = () =>
    void settle(
      revokeOtherSessions,
      t('auth.account.activeSessionsOthersRevoked'),
      t('auth.account.activeSessionsOthersError')
    );

  return (
    <Card
      as="section"
      aria-labelledby={TITLE_ID}
      padding="none"
      elevation="sm"
      className={sharedStyles.card}
    >
      <p className={sharedStyles.cardTitle} id={TITLE_ID}>
        <span>{t('auth.account.activeSessionsTitle')}</span>
      </p>

      {sessionsQuery.isPending && <LoadingRows />}

      {sessionsQuery.isError && (
        <>
          <InlineError
            className={styles.loadError}
            message={t('auth.account.activeSessionsLoadError')}
            retryLabel={t('common.retry')}
            onRetry={() => void sessionsQuery.refetch()}
          />
          <FallbackCurrentDeviceRow />
        </>
      )}

      {sessionsQuery.isSuccess && (
        <>
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              confirming={confirming === session.id}
              busy={busy}
              onAsk={() => ask(session.id)}
              onCancel={() => setConfirming(null)}
              onConfirm={() => revokeOne(session)}
            />
          ))}
          <output className={styles.notice}>{notice}</output>
          {failure && (
            <p className="error" role="alert">
              {failure}
            </p>
          )}
          <OthersFooter
            othersCount={others.length}
            confirming={confirming === OTHERS}
            busy={busy}
            onAsk={() => ask(OTHERS)}
            onCancel={() => setConfirming(null)}
            onConfirm={revokeOthers}
          />
        </>
      )}
    </Card>
  );
}
