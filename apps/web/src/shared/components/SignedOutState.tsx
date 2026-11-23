import type { ReactNode } from 'react';
import EmptyState from '@/shared/components/EmptyState';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import AccountChoiceLinks from '@/shared/components/AccountChoiceLinks';

type SignedOutStateProps = {
  icon: ReactNode;
  title?: string;
  message: ReactNode;
  returnTo: string;
  compact?: boolean;
};

export default function SignedOutState({
  icon,
  title,
  message,
  returnTo,
  compact,
}: Readonly<SignedOutStateProps>) {
  const { track } = useAnalytics();

  return (
    <EmptyState
      icon={icon}
      title={title}
      titleTag="h2"
      message={message}
      compact={compact}
      actions={
        <AccountChoiceLinks
          returnTo={returnTo}
          onChoose={(cta) => track('signed_out_cta_clicked', { page: returnTo, cta })}
        />
      }
    />
  );
}
