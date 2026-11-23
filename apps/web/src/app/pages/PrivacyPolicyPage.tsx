import LegalContentPage from '@/app/pages/LegalContentPage';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation, type Translate } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import { PRIVACY_LAST_UPDATED } from '@/app/pages/legalMeta';

type PrivacySectionName =
  | 'Controller'
  | 'Data'
  | 'Purposes'
  | 'Errors'
  | 'OAuth'
  | 'Donations'
  | 'Ideas'
  | 'Processors'
  | 'ThirdParties'
  | 'Transfers'
  | 'Retention'
  | 'Rights'
  | 'Complaint'
  | 'Contact';

type PrivacyItemName =
  | 'DataAccount'
  | 'DataUsage'
  | 'DataAnalytics'
  | 'DataTechnical'
  | 'PurposeService'
  | 'PurposeSecurity'
  | 'PurposeAnalytics'
  | 'PurposeCounts'
  | 'ProcessorGoogleCloud'
  | 'ProcessorAtlas'
  | 'ProcessorResend'
  | 'ProcessorSentry'
  | 'ProcessorPostHog'
  | 'ProcessorGitHub'
  | 'ProcessorKofi'
  | 'RetentionBackups'
  | 'RetentionLogs';

const PRIVACY_SECTIONS: ReadonlyArray<
  readonly [name: PrivacySectionName, items?: readonly PrivacyItemName[]]
> = [
  ['Controller'],
  ['Data', ['DataAccount', 'DataUsage', 'DataAnalytics', 'DataTechnical']],
  ['Purposes', ['PurposeService', 'PurposeSecurity', 'PurposeAnalytics', 'PurposeCounts']],
  ['Errors'],
  ['OAuth'],
  ['Donations'],
  ['Ideas'],
  [
    'Processors',
    [
      'ProcessorGoogleCloud',
      'ProcessorAtlas',
      'ProcessorResend',
      'ProcessorSentry',
      'ProcessorPostHog',
      'ProcessorGitHub',
      'ProcessorKofi',
    ],
  ],
  ['ThirdParties'],
  ['Transfers'],
  ['Retention', ['RetentionBackups', 'RetentionLogs']],
  ['Rights'],
  ['Complaint'],
  ['Contact'],
];

function privacySections(t: Translate) {
  return PRIVACY_SECTIONS.map(([name, items]) => ({
    title: t(`legal.privacy${name}Title`),
    body: t(`legal.privacy${name}Body`, { email: SUPPORT_EMAIL }),
    items: items?.map((item) => t(`legal.privacy${item}`)),
  }));
}

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <LegalContentPage
      heading={t('legal.privacyTitle')}
      intro={t('legal.privacyIntro')}
      updatedAt={PRIVACY_LAST_UPDATED}
      canonical={absoluteUrl(ROUTES.privacyPolicy)}
      sections={privacySections(t)}
    />
  );
}
