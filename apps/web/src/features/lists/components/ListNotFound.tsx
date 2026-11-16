import { Link } from 'react-router';
import { ListX } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import ErrorState from '@/shared/components/ErrorState';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';

export default function ListNotFound({
  title,
  message,
  back,
}: Readonly<{ title: string; message: string; back?: { to: string; label: string } }>) {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <ErrorState
        icon={<ListX size={ICON_SIZE['4xl']} />}
        title={title}
        message={message}
        actions={
          <Link to={back?.to ?? ROUTES.lists} className={buttonClass({ variant: 'primary' })}>
            {back?.label ?? t('lists.page.notFoundBack')}
          </Link>
        }
      />
    </PageLayout>
  );
}
