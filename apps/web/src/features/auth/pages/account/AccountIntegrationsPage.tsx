import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { oauthStartUrl, unlinkOAuthProvider } from '@/features/auth/api/authApi';
import { useOAuthProviders } from '@/features/auth/hooks/useOAuthProviders';
import { resolveOAuthErrorKey } from '@/features/auth/utils/oauthErrors';
import type { UserProfile } from '@/features/auth/types';
import LetterboxdImportSection from '@/features/letterboxd/components/LetterboxdImportSection';
import { ROUTES } from '@/app/routes';
import sharedStyles from './AccountShared.module.css';

const PROVIDER_LABELS: Record<string, string> = { google: 'Google', github: 'GitHub' };

export default function AccountIntegrationsPage({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const availableProviders = useOAuthProviders();
  const [confirmingProvider, setConfirmingProvider] = useState<string | null>(null);

  const unlinkAction = useCallback(
    async (provider: string) => {
      await unlinkOAuthProvider(provider);
      queryClient.setQueryData(queryKeys.auth.me, (prev: UserProfile | null | undefined) =>
        prev
          ? { ...prev, linkedProviders: prev.linkedProviders.filter((p) => p !== provider) }
          : prev
      );
      setConfirmingProvider(null);
    },
    [queryClient]
  );

  const {
    run: runUnlink,
    loading: unlinking,
    error: unlinkError,
  } = useAsyncAction(unlinkAction, t('auth.account.connectionsUnlinkFallbackError'));

  const oauthLinked = params.get('oauthLinked');
  const oauthErrorKey = resolveOAuthErrorKey(params.get('oauthError'));
  const linked = user.linkedProviders;
  const unlinkable = availableProviders.filter((p) => !linked.includes(p));
  const isLastProvider = (provider: string) => linked.length === 1 && linked[0] === provider;

  return (
    <>
      <div className={sharedStyles.panelHead}>
        <h2 id="account-integrations-heading" className={sharedStyles.panelHeading}>
          {t('auth.account.integrationsTitle')}
        </h2>
      </div>

      <LetterboxdImportSection />

      {(availableProviders.length > 0 || linked.length > 0) && (
        <div className={sharedStyles.card}>
          <p className={sharedStyles.cardTitle}>
            <span>{t('auth.account.connectionsTitle')}</span>
          </p>

          {oauthLinked && (
            <p className="hint" role="status" aria-live="polite">
              {t('auth.account.connectionsLinkedBanner', {
                provider: PROVIDER_LABELS[oauthLinked] ?? oauthLinked,
              })}
            </p>
          )}
          {oauthErrorKey && (
            <p className="error" role="alert">
              {t(oauthErrorKey)}
            </p>
          )}
          {unlinkError && (
            <p className="error" role="alert">
              {unlinkError}
            </p>
          )}

          {linked.map((provider) => {
            const lockedOut = !user.hasPassword && isLastProvider(provider);
            return (
              <div className={sharedStyles.row} key={provider}>
                <div className={sharedStyles.rowMain}>
                  <p className={sharedStyles.rowLabel}>{PROVIDER_LABELS[provider] ?? provider}</p>
                  <p className={sharedStyles.rowSub}>
                    {lockedOut
                      ? t('auth.account.connectionsLastProviderHint')
                      : t('auth.account.connectionsLinked')}
                  </p>
                </div>
                {confirmingProvider === provider ? (
                  <div className="nav-actions">
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={unlinking}
                      onClick={() => void runUnlink(provider)}
                    >
                      {t('common.confirm')}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={unlinking}
                      onClick={() => setConfirmingProvider(null)}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    disabled={lockedOut}
                    onClick={() => setConfirmingProvider(provider)}
                  >
                    {t('auth.account.connectionsUnlinkButton')}
                  </button>
                )}
              </div>
            );
          })}
          {unlinkable.map((provider) => (
            <div className={sharedStyles.row} key={provider}>
              <div className={sharedStyles.rowMain}>
                <p className={sharedStyles.rowLabel}>{PROVIDER_LABELS[provider] ?? provider}</p>
              </div>
              <a href={oauthStartUrl(provider, ROUTES.accountIntegrations)} className="btn">
                {t('auth.account.connectionsLinkButton', {
                  provider: PROVIDER_LABELS[provider] ?? provider,
                })}
              </a>
            </div>
          ))}
          {linked.length > 0 && user.hasPassword && (
            <p className="hint">{t('auth.account.connectionsUnlinkSafeHint')}</p>
          )}
        </div>
      )}
    </>
  );
}
