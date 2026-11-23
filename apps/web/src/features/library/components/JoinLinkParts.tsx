import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Link2Off, Users } from 'lucide-react';
import AccountChoiceLinks from '@/shared/components/AccountChoiceLinks';
import { buttonClass } from '@/shared/components/Button';
import ErrorState from '@/shared/components/ErrorState';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { isNotFoundError } from '@/shared/api/apiError';
import { ROUTES } from '@/app/routes';
import type { Translate } from '@/shared/i18n';

interface JoinLinkClassNames {
  layout?: string;
  message?: string;
  actions?: string;
  full?: string;
  fullTitle?: string;
}

interface JoinLinkPendingLabels {
  title: string;
  invalidTitle: string;
  invalidMessage: string;
  backHome: string;
  loadError: string;
  retry: string;
  loading: string;
}

export function joinLinkPendingLabels(
  t: Translate,
  scope: 'groups.join' | 'lists.join'
): JoinLinkPendingLabels {
  return {
    title: t(`${scope}.title`),
    invalidTitle: t(`${scope}.invalidTitle`),
    invalidMessage: t(`${scope}.invalidMessage`),
    backHome: t(`${scope}.backHome`),
    loadError: t(`${scope}.loadError`),
    retry: t(`${scope}.retry`),
    loading: t(`${scope}.loading`),
  };
}

export function JoinLinkPending({
  error,
  onRetry,
  labels,
  classNames,
  children,
}: Readonly<{
  error: unknown;
  onRetry: () => void;
  labels: JoinLinkPendingLabels;
  classNames: JoinLinkClassNames;
  children: ReactNode;
}>) {
  if (error && isNotFoundError(error)) {
    return (
      <ErrorState
        icon={<Link2Off size={ICON_SIZE['4xl']} />}
        title={labels.invalidTitle}
        message={labels.invalidMessage}
        actions={
          <Link to={ROUTES.home} className={buttonClass({ variant: 'primary' })}>
            {labels.backHome}
          </Link>
        }
      />
    );
  }

  return (
    <PageLayout className={classNames.layout}>
      <h1 className="visually-hidden">{labels.title}</h1>
      {error ? (
        <InlineError message={labels.loadError} retryLabel={labels.retry} onRetry={onRetry} />
      ) : (
        <SkeletonScreen label={labels.loading}>{children}</SkeletonScreen>
      )}
    </PageLayout>
  );
}

export function JoinLinkFull({
  title,
  message,
  classNames,
}: Readonly<{ title: string; message: string; classNames: JoinLinkClassNames }>) {
  return (
    <div className={classNames.full}>
      <h2 className={classNames.fullTitle}>
        <Users aria-hidden size={ICON_SIZE.md} />
        {title}
      </h2>
      <p className={classNames.message}>{message}</p>
    </div>
  );
}

export function JoinLinkSignIn({
  message,
  returnTo,
  classNames,
}: Readonly<{ message: string; returnTo: string; classNames: JoinLinkClassNames }>) {
  return (
    <>
      <p className={classNames.message}>{message}</p>
      <div className={classNames.actions}>
        <AccountChoiceLinks returnTo={returnTo} />
      </div>
    </>
  );
}
