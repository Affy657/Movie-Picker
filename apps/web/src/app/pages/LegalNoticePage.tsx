import LegalContentPage from '@/app/pages/LegalContentPage';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import { LEGAL_LAST_UPDATED } from '@/app/pages/legalMeta';

export default function LegalNoticePage() {
  const { t } = useTranslation();
  return (
    <LegalContentPage
      heading={t('legal.noticeTitle')}
      intro={t('legal.noticeIntro')}
      updatedAt={LEGAL_LAST_UPDATED}
      canonical={absoluteUrl(ROUTES.legalNotice)}
      sections={[
        {
          title: t('legal.noticeEditorTitle'),
          body: t('legal.noticeEditorBody', { email: SUPPORT_EMAIL }),
        },
        { title: t('legal.noticeHostingTitle'), body: t('legal.noticeHostingBody') },
        { title: t('legal.noticeIpTitle'), body: t('legal.noticeIpBody') },
        { title: t('legal.noticeDonationsTitle'), body: t('legal.noticeDonationsBody') },
        {
          title: t('legal.noticeContactTitle'),
          body: t('legal.noticeContactBody', { email: SUPPORT_EMAIL }),
        },
      ]}
    />
  );
}
