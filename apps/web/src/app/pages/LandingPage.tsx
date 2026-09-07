import { useRef } from 'react';
import PageLayout from '@/shared/components/PageLayout';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import LandingHero from './landing/LandingHero';
import LandingProblem from './landing/LandingProblem';
import LandingSteps from './landing/LandingSteps';
import LandingWheel from './landing/LandingWheel';
import LandingFeatures from './landing/LandingFeatures';
import LandingSocial from './landing/LandingSocial';
import LandingTrust from './landing/LandingTrust';
import LandingFaq from './landing/LandingFaq';
import LandingFinalCta from './landing/LandingFinalCta';
import { useRevealOnScroll } from './landing/useRevealOnScroll';
import shared from './landing/landingShared.module.css';
import './landing/landingPalette.css';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);

  usePageSeo({
    title: pageTitle(t('nav.landing.howItWorks')),
    description: t('landing.seoDescription'),
    imageAlt: t('landing.ogImageAlt'),
    canonical: `${SITE_URL}${ROUTES.discover}`,
    ogType: 'website',
  });

  useRevealOnScroll(rootRef, shared.reveal);

  return (
    <PageLayout ref={rootRef} className={`landingPalette ${styles.landing}`}>
      <LandingHero />
      <LandingProblem />
      <LandingSteps />
      <LandingWheel />
      <LandingFeatures />
      <LandingSocial />
      <LandingTrust />
      <LandingFaq />
      <LandingFinalCta />
    </PageLayout>
  );
}
