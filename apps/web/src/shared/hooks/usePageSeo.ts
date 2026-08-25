import { useEffect } from 'react';
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_NAME,
  SITE_URL,
} from '@/shared/seo/siteMeta';

export type OgType = 'website' | 'profile' | 'article';

export interface PageSeo {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: OgType;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

interface ResolvedSeo {
  title: string;
  description: string;
  url: string;
  ogType: OgType;
  image: string;
  imageAlt: string;
  noindex: boolean;
  jsonLdSerialized: string;
}

const JSON_LD_MARKER = 'data-page-seo';
const INACTIVE_JSON_LD_TYPE = 'application/ld+json-inactive';
const HOME_URL = `${SITE_URL}/`;

const SEO_DEFAULTS: ResolvedSeo = {
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  url: HOME_URL,
  ogType: 'website',
  image: DEFAULT_OG_IMAGE,
  imageAlt: DEFAULT_OG_IMAGE_ALT,
  noindex: false,
  jsonLdSerialized: '',
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setRobots(noindex: boolean): void {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (noindex) {
    const el = existing ?? document.createElement('meta');
    el.setAttribute('name', 'robots');
    el.setAttribute('content', 'noindex, nofollow');
    if (!existing) document.head.appendChild(el);
  } else if (existing) {
    existing.setAttribute('content', 'index, follow');
  }
}

function setDefaultJsonLdVisible(visible: boolean): void {
  if (visible) {
    document.head
      .querySelectorAll<HTMLScriptElement>(`script[type="${INACTIVE_JSON_LD_TYPE}"]`)
      .forEach((el) => {
        el.type = 'application/ld+json';
      });
    return;
  }
  document.head
    .querySelectorAll<HTMLScriptElement>(
      `script[type="application/ld+json"]:not([${JSON_LD_MARKER}])`
    )
    .forEach((el) => {
      el.type = INACTIVE_JSON_LD_TYPE;
    });
}

function setJsonLd(serialized: string): void {
  const existing = document.head.querySelector(`script[${JSON_LD_MARKER}]`);
  if (existing) existing.remove();
  if (!serialized) return;
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute(JSON_LD_MARKER, '');
  script.textContent = serialized;
  document.head.appendChild(script);
}

function applySeo(seo: ResolvedSeo): void {
  document.title = seo.title;
  upsertMeta('name', 'description', seo.description);
  setCanonical(seo.url);
  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:url', seo.url);
  upsertMeta('property', 'og:type', seo.ogType);
  upsertMeta('property', 'og:image', seo.image);
  upsertMeta('property', 'og:image:alt', seo.imageAlt);
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'twitter:description', seo.description);
  upsertMeta('name', 'twitter:image', seo.image);
  upsertMeta('name', 'twitter:image:alt', seo.imageAlt);
  setRobots(seo.noindex);
  setDefaultJsonLdVisible(seo.url === HOME_URL && !seo.noindex);
  setJsonLd(seo.jsonLdSerialized);
}

function resolveCanonical(canonical: string | undefined, noindex: boolean): string {
  if (canonical) return canonical;
  if (noindex) {
    const path = globalThis.location?.pathname;
    if (path && path !== '/') return absoluteUrl(path);
  }
  return HOME_URL;
}

export function usePageSeo(seo: PageSeo): void {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    canonical,
    ogType = 'website',
    image = DEFAULT_OG_IMAGE,
    imageAlt = DEFAULT_OG_IMAGE_ALT,
    noindex = false,
    jsonLd = null,
  } = seo;
  const url = resolveCanonical(canonical, noindex);
  const jsonLdSerialized = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    applySeo({ title, description, url, ogType, image, imageAlt, noindex, jsonLdSerialized });
  }, [title, description, url, ogType, image, imageAlt, noindex, jsonLdSerialized]);

  useEffect(() => () => applySeo(SEO_DEFAULTS), []);
}

export function useNoindexPage(title: string, path?: string): void {
  usePageSeo({ title, noindex: true, canonical: path ? absoluteUrl(path) : undefined });
}
