import type { ReactNode } from 'react';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import FormPageShell from '@/shared/components/FormPageShell';
import styles from './AuthPageShell.module.css';

type AuthPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function AuthPageShell({
  title,
  description,
  children,
}: Readonly<AuthPageShellProps>) {
  const { t } = useTranslation();
  return (
    <FormPageShell
      title={title}
      description={description}
      back={{ to: ROUTES.home, label: t('nav.home') }}
    >
      {children}
    </FormPageShell>
  );
}

export { styles as authPageShellStyles };
