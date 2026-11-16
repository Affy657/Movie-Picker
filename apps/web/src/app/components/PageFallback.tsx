import PageLayout from '@/shared/components/PageLayout';
import { BrandLoader } from '@/shared/brand/BrandLoader';
import { useTranslation } from '@/shared/i18n';

export default function PageFallback() {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <BrandLoader label={t('common.loading')} />
    </PageLayout>
  );
}
