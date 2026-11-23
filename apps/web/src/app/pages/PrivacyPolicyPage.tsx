import LegalContentPage from '@/app/pages/LegalContentPage';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import { PRIVACY_LAST_UPDATED } from '@/app/pages/legalMeta';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <LegalContentPage
      heading={t('legal.privacyTitle')}
      intro={t('legal.privacyIntro')}
      updatedAt={PRIVACY_LAST_UPDATED}
      canonical={absoluteUrl(ROUTES.privacyPolicy)}
      sections={[
        {
          title: t('legal.privacyControllerTitle'),
          body: t('legal.privacyControllerBody', { email: SUPPORT_EMAIL }),
        },
        {
          title: t('legal.privacyDataTitle'),
          body: t('legal.privacyDataBody'),
          items: [
            t('legal.privacyDataAccount'),
            t('legal.privacyDataUsage'),
            t('legal.privacyDataAnalytics'),
            t('legal.privacyDataTechnical'),
          ],
        },
        {
          title: t('legal.privacyPurposesTitle'),
          body: t('legal.privacyPurposesBody'),
          items: [
            t('legal.privacyPurposeService'),
            t('legal.privacyPurposeSecurity'),
            t('legal.privacyPurposeAnalytics'),
            t('legal.privacyPurposeCounts'),
          ],
        },
        { title: t('legal.privacyErrorsTitle'), body: t('legal.privacyErrorsBody') },
        { title: t('legal.privacyOAuthTitle'), body: t('legal.privacyOAuthBody') },
        { title: t('legal.privacyDonationsTitle'), body: t('legal.privacyDonationsBody') },
        { title: t('legal.privacyIdeasTitle'), body: t('legal.privacyIdeasBody') },
        {
          title: t('legal.privacyProcessorsTitle'),
          body: t('legal.privacyProcessorsBody'),
          items: [
            t('legal.privacyProcessorGoogleCloud'),
            t('legal.privacyProcessorAtlas'),
            t('legal.privacyProcessorResend'),
            t('legal.privacyProcessorSentry'),
            t('legal.privacyProcessorPostHog'),
            t('legal.privacyProcessorGitHub'),
            t('legal.privacyProcessorKofi'),
          ],
        },
        { title: t('legal.privacyThirdPartiesTitle'), body: t('legal.privacyThirdPartiesBody') },
        { title: t('legal.privacyTransfersTitle'), body: t('legal.privacyTransfersBody') },
        {
          title: t('legal.privacyRetentionTitle'),
          body: t('legal.privacyRetentionBody'),
          items: [t('legal.privacyRetentionBackups'), t('legal.privacyRetentionLogs')],
        },
        {
          title: t('legal.privacyRightsTitle'),
          body: t('legal.privacyRightsBody', { email: SUPPORT_EMAIL }),
        },
        { title: t('legal.privacyComplaintTitle'), body: t('legal.privacyComplaintBody') },
        {
          title: t('legal.privacyContactTitle'),
          body: t('legal.privacyContactBody', { email: SUPPORT_EMAIL }),
        },
      ]}
    />
  );
}
