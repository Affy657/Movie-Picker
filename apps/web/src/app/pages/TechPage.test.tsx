import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import TechPage from '@/app/pages/TechPage';
import { TECH_SECTIONS } from '@/app/pages/tech/TechRail';
import { TECH_METRICS } from '@/app/pages/tech/generated/techMetrics';
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
    expect(diagrams.length).toBeGreaterThanOrEqual(10);
    for (const diagram of diagrams) {
      expect(diagram).toHaveAccessibleName();
    }
  });

  it('cite les huit outils branchés sur l’assistant, Sentry et Resend compris', () => {
    const { container } = renderTechPage();
    const flow = container.querySelector('#method svg') as SVGElement;
    const labels = [...flow.querySelectorAll('text')].map((node) => node.textContent);

    for (const tool of [
      'GitHub',
      'Google Cloud',
      'AWS',
      'SonarCloud',
      'Sentry',
      'PostHog',
      'MongoDB',
      'Resend',
    ]) {
      expect(labels).toContain(tool);
    }
  });

  it('présente les faits en cartes titrées plutôt qu’en paragraphes', () => {
    const { container } = renderTechPage();
    const cards = container.querySelectorAll('article');

    expect(cards.length).toBeGreaterThanOrEqual(20);
    for (const card of cards) {
      expect(card.querySelector('h3')).not.toBeNull();
      expect(card.querySelector('svg')).not.toBeNull();
    }
  });

  it('ne laisse fuiter aucune clé de traduction non résolue', () => {
    const { container } = renderTechPage();
    expect(container.textContent).not.toMatch(/tech\.[a-zA-Z]+\.[a-zA-Z]+/);
  });

  it('présente la trajectoire en frise, un repère par palier', () => {
    const { container } = renderTechPage();
    const timeline = within(container.querySelector('section#trajectory') as HTMLElement);
    const steps = timeline.getAllByRole('listitem');

    expect(steps).toHaveLength(6);
    expect(steps[0]).toHaveTextContent(/MVP/);
    expect(steps.at(-1)).toHaveTextContent(/V1\.5/);
  });

  it('explique chaque terme par une bulle rattachée au repère qui la déclenche', () => {
    const { container } = renderTechPage();
    const terms = container.querySelectorAll('[aria-describedby]');

    expect(terms.length).toBeGreaterThan(30);
    for (const term of terms) {
      const bubble = container.querySelector(
        `#${CSS.escape(term.getAttribute('aria-describedby') as string)}`
      );
      expect(bubble?.textContent?.trim()).toBeTruthy();
      expect(term).toHaveAttribute('tabindex', '0');
    }
  });

  it('offre un sommaire dépliable qui annonce la section courante', async () => {
    const user = userEvent.setup();
    renderTechPage();
    const rail = screen.getByRole('navigation', { name: /sommaire/i });
    const toggle = within(rail).getByRole('button');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent(new RegExp(`\\d\\d / ${TECH_SECTIONS.length}`));
    expect(toggle.getAttribute('aria-controls')).toBe(
      within(rail).getByRole('list').getAttribute('id')
    );

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(rail).getAllByRole('link')[3] as HTMLElement);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('ne contient plus les sections retirées ni de bloc incident', () => {
    const { container } = renderTechPage();

    for (const id of ['domain', 'decisions', 'debt']) {
      expect(container.querySelector(`section#${id}`)).toBeNull();
    }
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(container.textContent).not.toMatch(/symptôme/i);
  });
});
