import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import type { Translate } from '@/shared/i18n';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import type { PublicProfile } from '@/features/profile/api/profileApi';

export interface ProfileCollectionSeoTexts {
  pageTitle: (name: string) => string;
  seoDescription: (profile: PublicProfile) => string;
}

export function missingProfileSeo(
  isNotFound: boolean,
  t: Translate,
  loadingTitle: string = APP_DOCUMENT_TITLE
) {
  return {
    title: isNotFound ? pageTitle(t('profile.notFoundTitle')) : loadingTitle,
    noindex: isNotFound,
  };
}

export function profileCollectionSeo(
  profile: PublicProfile | undefined,
  isNotFound: boolean,
  t: Translate,
  texts: ProfileCollectionSeoTexts,
  canonicalPath: (handle: string) => string
) {
  if (!profile) return missingProfileSeo(isNotFound, t, pageTitle(t('profile.loading')));
  return {
    title: pageTitle(texts.pageTitle(profile.displayName)),
    description: texts.seoDescription(profile),
    canonical: absoluteUrl(canonicalPath(profile.handle)),
  };
}
