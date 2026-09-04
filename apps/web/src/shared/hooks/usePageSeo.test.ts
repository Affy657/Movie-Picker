import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageSeo, useNoindexPage } from '@/shared/hooks/usePageSeo';
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_URL } from '@/shared/seo/siteMeta';

function meta(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('usePageSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('applique titre, description, canonical et Open Graph', () => {
    renderHook(() =>
      usePageSeo({
        title: 'Page test',
        description: 'Une description',
        canonical: `${SITE_URL}/u/alice`,
        ogType: 'profile',
      })
    );

    expect(document.title).toBe('Page test');
    expect(meta('meta[name="description"]')).toBe('Une description');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}/u/alice`
    );
    expect(meta('meta[property="og:title"]')).toBe('Page test');
    expect(meta('meta[property="og:type"]')).toBe('profile');
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_URL}/u/alice`);
    expect(meta('meta[name="twitter:title"]')).toBe('Page test');
  });

  it('retombe sur les valeurs par défaut du site', () => {
    renderHook(() => usePageSeo({ title: 'Accueil' }));

    expect(meta('meta[name="description"]')).toBe(DEFAULT_DESCRIPTION);
    expect(meta('meta[property="og:type"]')).toBe('website');
    expect(meta('meta[property="og:image"]')).toBe(DEFAULT_OG_IMAGE);
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_URL}/decouvrir`);
  });

  it('émet noindex quand demandé', () => {
    renderHook(() => usePageSeo({ title: 'Introuvable', noindex: true }));
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('injecte un unique bloc JSON-LD', () => {
    const jsonLd = { '@context': 'https://schema.org', '@type': 'Person', name: 'Alice' };
    const { rerender } = renderHook(
      (props: { data: Record<string, unknown> }) =>
        usePageSeo({ title: 'Alice', jsonLd: props.data }),
      { initialProps: { data: jsonLd } }
    );

    rerender({ data: jsonLd });

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]?.textContent ?? '{}')).toMatchObject({ name: 'Alice' });
  });

  it('masque le JSON-LD d’accueil hors de la home et le restaure au démontage', () => {
    const homeLd = document.createElement('script');
    homeLd.type = 'application/ld+json';
    homeLd.textContent = '{"@type":"WebSite"}';
    document.head.appendChild(homeLd);

    const { unmount } = renderHook(() =>
      usePageSeo({
        title: 'Alice',
        canonical: `${SITE_URL}/u/alice`,
        jsonLd: { '@type': 'Person', name: 'Alice' },
      })
    );

    const active = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
    expect(active).toHaveLength(1);
    expect(JSON.parse(active[0]?.textContent ?? '{}')).toMatchObject({ name: 'Alice' });
    expect(
      document.head.querySelector('script[type="application/ld+json-inactive"]')?.textContent
    ).toContain('WebSite');

    unmount();

    const restored = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
    expect(restored).toHaveLength(1);
    expect(JSON.parse(restored[0]?.textContent ?? '{}')).toMatchObject({ '@type': 'WebSite' });
  });

  it('réinitialise les balises aux valeurs par défaut au démontage', () => {
    const { unmount } = renderHook(() =>
      usePageSeo({
        title: 'Profil',
        ogType: 'profile',
        canonical: `${SITE_URL}/u/alice`,
        noindex: true,
        jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: 'Alice' },
      })
    );

    expect(meta('meta[property="og:type"]')).toBe('profile');
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');

    unmount();

    expect(meta('meta[property="og:type"]')).toBe('website');
    expect(meta('meta[name="robots"]')).toBe('index, follow');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}/decouvrir`
    );
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('useNoindexPage pose noindex et un canonical de la route', () => {
    renderHook(() => useNoindexPage('Connexion — Movie Picker', '/login'));
    expect(document.title).toBe('Connexion — Movie Picker');
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}/login`
    );
  });
});
