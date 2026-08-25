import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/shared/components/PageLayout';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { ROUTES } from '@/app/routes';
import { setSessionHint } from '@/features/auth/session-hint';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';

export default function OAuthCallbackPage() {
  const { t } = useTranslation();
  useNoindexPage(pageTitle(t('auth.oauth.callbackLoading')), ROUTES.oauthCallback);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const returnTo = safeReturnTo(params.get('returnTo'));
    const provider = params.get('provider');
    const event = params.get('event');

    setSessionHint();
    if (provider && (event === 'signup' || event === 'login')) {
      track(event === 'signup' ? 'user_signed_up' : 'user_logged_in', { method: provider });
    }

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list }),
    ]).finally(() => {
      navigate(returnTo, { replace: true });
    });
  }, [navigate, params, queryClient, track]);

  return (
    <PageLayout>
      <p className="placeholder" aria-busy="true">
        {t('auth.oauth.callbackLoading')}
      </p>
    </PageLayout>
  );
}
