import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import TechPage from '@/app/pages/TechPage';
import { TECH_SECTIONS } from '@/app/pages/tech/TechRail';
import { TECH_METRICS, TECH_WHEEL_SNIPPET } from '@/app/pages/tech/generated/techMetrics';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { ROUTES } from '@/app/routes';

function renderTechPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <TechPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('TechPage', () => {
  it('affiche le titre principal et le canonical de /tech', () => {
    renderTechPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sous la roue/i);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}${ROUTES.tech}`
    );
  });

  it('rend une section par entrée du sommaire, chacune atteignable par ancre', () => {
    const { container } = renderTechPage();
    const rail = screen.getByRole('navigation', { name: /sommaire/i });
    const links = within(rail).getAllByRole('link');

    expect(links).toHaveLength(TECH_SECTIONS.length);
    for (const id of TECH_SECTIONS) {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
    }
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      TECH_SECTIONS.map((id) => `#${id}`)
    );
  });

  it('affiche les métriques générées au build plutôt que des valeurs écrites en dur', () => {
    renderTechPage();
    expect(screen.getByText(String(TECH_METRICS.endpoints))).toBeInTheDocument();
    expect(screen.getByText(String(TECH_METRICS.testFiles))).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: new RegExp(String(TECH_METRICS.ciJobs)) })
    ).toBeInTheDocument();
  });

  it('donne un titre accessible à chaque schéma', () => {
    renderTechPage();
    const diagrams = screen.getAllByRole('img');
    expect(diagrams.length).toBeGreaterThanOrEqual(8);
    for (const diagram of diagrams) {
      expect(diagram).toHaveAccessibleName();
    }
  });

  it('expose les trois arbitrages de la section décisions', () => {
    renderTechPage();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(
      within(table).getByRole('columnheader', { name: /ce que ça coûte/i })
    ).toBeInTheDocument();
  });

  it('ne laisse fuiter aucune clé de traduction non résolue', () => {
    const { container } = renderTechPage();
    expect(container.textContent).not.toMatch(/tech\.[a-zA-Z]+\.[a-zA-Z]+/);
  });

  it('expose le code du tirage généré depuis le domaine', () => {
    const { container } = renderTechPage();
    const rendered = container.querySelector('pre')?.textContent ?? '';

    expect(TECH_WHEEL_SNIPPET).toContain('public static Movie Pick(');
    expect(TECH_WHEEL_SNIPPET).toContain('WheelMode.StrictRandom');
    expect(rendered).toBe(TECH_WHEEL_SNIPPET);
  });
});
