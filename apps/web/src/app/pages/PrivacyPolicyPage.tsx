import LegalContentPage from '@/app/pages/LegalContentPage';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <LegalContentPage
      heading={t('legal.privacyTitle')}
      intro={t('legal.privacyIntro')}
      canonical={absoluteUrl(ROUTES.privacyPolicy)}
      sections={[
        { title: t('legal.privacyDataTitle'), body: t('legal.privacyDataBody') },
        { title: t('legal.privacyOAuthTitle'), body: t('legal.privacyOAuthBody') },
        { title: t('legal.privacyDonationsTitle'), body: t('legal.privacyDonationsBody') },
        { title: t('legal.privacyRetentionTitle'), body: t('legal.privacyRetentionBody') },
        {
          title: t('legal.privacyRightsTitle'),
          body: t('legal.privacyRightsBody', { email: SUPPORT_EMAIL }),
        },
        {
          title: t('legal.privacyContactTitle'),
          body: t('legal.privacyContactBody', { email: SUPPORT_EMAIL }),
        },
      ]}
    />
  );
}
