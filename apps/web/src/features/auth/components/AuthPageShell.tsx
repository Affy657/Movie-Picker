import type { ReactNode, Ref } from 'react';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import FormPageShell from '@/shared/components/FormPageShell';
import { returnsToEvent } from '@/features/auth/utils/eventReturn';
import styles from './AuthPageShell.module.css';

type AuthPageShellProps = {
  title: string;
  description?: string;
  returnTo?: string;
  titleRef?: Ref<HTMLHeadingElement>;
  announceDescription?: boolean;
  children: ReactNode;
};

export default function AuthPageShell({
  title,
  description,
  returnTo,
  titleRef,
  announceDescription,
  children,
}: Readonly<AuthPageShellProps>) {
  const { t } = useTranslation();
  const back =
    returnTo !== undefined && returnsToEvent(returnTo)
      ? { to: returnTo, label: t('auth.backToEvent') }
      : { to: ROUTES.home, label: t('nav.home') };
  return (
    <FormPageShell
      title={title}
      description={description}
      back={back}
      titleRef={titleRef}
      announceDescription={announceDescription}
    >
      {children}
    </FormPageShell>
  );
}

export { styles as authPageShellStyles };
