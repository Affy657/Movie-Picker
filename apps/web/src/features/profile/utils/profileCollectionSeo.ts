import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import type { Translate } from '@/shared/i18n';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import type { PublicProfile } from '@/features/profile/api/profileApi';

export interface ProfileCollectionSeoTexts {
  pageTitle: (name: string) => string;
  seoDescription: (profile: PublicProfile) => string;
}

export function profileCollectionSeo(
  profile: PublicProfile | undefined,
  isNotFound: boolean,
  t: Translate,
  texts: ProfileCollectionSeoTexts,
  canonicalPath: (handle: string) => string
) {
  if (!profile) return { title: pageTitle(t('profile.loading')), noindex: isNotFound };
  return {
    title: pageTitle(texts.pageTitle(profile.displayName)),
    description: texts.seoDescription(profile),
    canonical: absoluteUrl(canonicalPath(profile.handle)),
  };
}
