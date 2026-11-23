import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import TechPage from '@/app/pages/TechPage';
import { TECH_SECTIONS } from '@/app/pages/tech/TechRail';
import {
  CURRENT_MILESTONES,
  PLANNED_MILESTONES,
  SHIPPED_MILESTONES,
} from '@/app/pages/tech/TechTimeline';
import { TECH_METRICS } from '@/app/pages/tech/generated/techMetrics';
import {
  EXTERNAL_SKILL_COUNT,
  FRONT_DOMAINS,
  PROJECT_SKILL_COUNT,
  SKILL_COUNT,
} from '@/app/pages/tech/TechDiagrams';
import { TECH_PAGE_LAST_UPDATE } from '@/app/pages/tech/lastUpdate';
import { SOURCE_REPOSITORY_URL } from '@/app/pages/tech/TechHero';
import { TypeScriptLogo } from '@/app/pages/tech/TechLogos';
import { techFormat } from '@/app/pages/tech/techFormat';
import { fr } from '@/shared/i18n/locales/fr';
import { en } from '@/shared/i18n/locales/en';
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

const FEATURE_FOLDERS = [
  ...new Set(
    Object.keys(import.meta.glob('../../features/*/**/*.{ts,tsx}')).map(
      (file) => file.split('/')[3] as string
    )
  ),
].sort((a, b) => a.localeCompare(b));

function techTexts(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (node && typeof node === 'object') return Object.values(node).flatMap(techTexts);
  return [];
}

afterEach(() => {
  localStorage.removeItem('moviepicker-locale');
});

describe('TechPage', () => {
  it('affiche le titre principal et le canonical de /tech', () => {
    renderTechPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /movie picker est construit/i
    );
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}${ROUTES.tech}`
    );
  });

  it('renders one section per table-of-contents entry, each reachable by anchor', () => {
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

  it('shows the metrics generated at build time rather than hard-coded values', () => {
    renderTechPage();
    expect(screen.getAllByText(String(TECH_METRICS.endpoints)).length).toBeGreaterThan(0);
    for (const metric of [TECH_METRICS.commits, TECH_METRICS.testCases]) {
      expect(
        screen.getAllByText((text) => text.replace(/\D/g, '') === String(metric)).length
      ).toBeGreaterThan(0);
    }
    expect(
      screen.getByRole('heading', { name: new RegExp(`(^|\\D)${TECH_METRICS.ciJobs}(\\D|$)`) })
    ).toBeInTheDocument();
  });

  it('gives every diagram an accessible title', () => {
    renderTechPage();
    const diagrams = screen.getAllByRole('img');
    expect(diagrams.length).toBeGreaterThanOrEqual(10);
    for (const diagram of diagrams) {
      expect(diagram).toHaveAccessibleName();
    }
  });

  it('cites the eight tools wired to the assistant, Sentry and Resend included', () => {
    const { container } = renderTechPage();
    const labels = [...container.querySelectorAll('#method svg text')].map(
      (node) => node.textContent
    );

    for (const tool of [
      'GitHub',
      'Google Cloud',
      'SonarCloud',
      'Sentry',
      'PostHog',
      'MongoDB',
      'Resend',
    ]) {
      expect(labels).toContain(tool);
    }
  });

  it('presents the facts as titled cards rather than paragraphs', () => {
    const { container } = renderTechPage();
    const cards = container.querySelectorAll('article');

    expect(cards.length).toBeGreaterThanOrEqual(20);
    for (const card of cards) {
      expect(card.querySelector('h3')).not.toBeNull();
      expect(card.querySelector('svg')).not.toBeNull();
    }
  });

  it('leaks no unresolved translation key', () => {
    const { container } = renderTechPage();
    expect(container.textContent).not.toMatch(/tech\.[a-zA-Z]+\.[a-zA-Z]+/);
  });

  it('presents the method as cards and counts its procedures like the diagram', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#method') as HTMLElement;

    expect(section.querySelectorAll('article')).toHaveLength(5);
    expect(section.querySelectorAll('figure')).toHaveLength(4);
    expect(section.textContent).toContain(`${SKILL_COUNT} procédures`);
    expect(section.querySelectorAll('svg g[data-origin]')).toHaveLength(SKILL_COUNT);
    expect(section.textContent).toContain(String(TECH_METRICS.assistantTools));
  });

  it('names the two vital secrets at startup and quantifies the rate limiting', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#production') as HTMLElement;

    expect(section.querySelectorAll('article')).toHaveLength(9);
    expect(section.textContent).toContain(fr.tech.production.passwords);
    expect(section.textContent).toContain(fr.tech.production.audit);
    expect(section.textContent).toMatch(/400 jours/);
    expect(section.textContent).toContain(String(TECH_METRICS.rateLimitPolicies));
    expect(section.textContent).toMatch(/liste d.origines autorisées ni adresse de base/i);
    expect(section.textContent).not.toMatch(/refuse de démarrer s.il manque un secret/i);
  });

  it('no longer presents the error format as open work', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#trajectory') as HTMLElement;

    expect(section.textContent).not.toMatch(/format d.erreur normalisé/i);
  });

  it('range Sonar parmi les seuils bloquants et dit son verdict', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#quality') as HTMLElement;
    const groups = [...section.querySelectorAll('[class*="factList"]')];

    expect(groups[0]?.querySelectorAll('article')).toHaveLength(4);
    expect(groups[1]?.querySelectorAll('article')).toHaveLength(3);
    expect(groups[0]?.textContent).toContain(fr.tech.quality.sonar);
    expect(groups[1]?.textContent).toContain(fr.tech.quality.monitoring);
    expect(section.textContent).not.toMatch(/portail qualité informatif/i);
  });

  it('says the deployment is observed and that the scheduler retries under its signed token', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#infra') as HTMLElement;

    expect(section.textContent).toContain(fr.tech.infra.smoke);
    expect(section.textContent).toContain(String(TECH_METRICS.deploySecrets));
    expect(section.textContent).toMatch(/version servie/i);
    expect(section.textContent).toMatch(/retentent trois fois/i);
    expect(section.textContent).not.toMatch(/seulement si le jeton existe/i);
    expect(section.textContent).not.toMatch(/remet en ligne l.image précédente/i);
  });

  it('explains why the former address serves a leaving worker instead of a bare redirect', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#infra') as HTMLElement;

    expect(section.querySelectorAll('article')).toHaveLength(10);
    expect(section.textContent).toContain(fr.tech.infra.legacy);
    expect(section.textContent).toMatch(/web\.movie-picker\.fr/);
    expect(section.textContent).toMatch(/service worker/i);
  });

  it('details the integration chain instead of leaving it to the diagram alone', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#ci') as HTMLElement;
    const diagram = [...section.querySelectorAll('svg text')]
      .map((node) => node.textContent)
      .join(' ');

    expect(section.querySelectorAll('article')).toHaveLength(6);
    for (const fact of ['trigger', 'scope', 'secrets', 'image', 'guard', 'caches'] as const) {
      expect(section.textContent).toContain(fr.tech.ci[fact]);
    }
    expect(diagram).toContain(fr.tech.diagram.ciDocker);
    for (const node of [
      'ciTrigger',
      'ciLintWorkflows',
      'ciLintApi',
      'ciLintWeb',
      'ciTestApi',
      'ciTestWeb',
      'ciE2e',
      'ciLintTerraform',
      'ciScopeAlways',
      'ciVerify',
      'ciBuildFront',
      'ciZoneGates',
      'ciZoneDeploy',
    ] as const) {
      expect(diagram).toContain(fr.tech.diagram[node]);
    }
    expect(diagram).not.toMatch(/vers l’image|vers le front/);
    expect(diagram).not.toMatch(/test api mongo|e2e mongo/i);
    expect(section.textContent).toMatch(/sur master, toutes tournent/i);
    expect(section.textContent).not.toMatch(
      /couches Docker|base de vulnérabilités sont conservées/i
    );
  });

  it('ne redit pas les familles de tests dans les pratiques', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#tests') as HTMLElement;
    const practices = [...section.querySelectorAll('article')].slice(3);

    expect(practices).toHaveLength(6);
    expect(section.textContent).toContain(fr.tech.tests.network);
    expect(section.textContent).toContain(String(TECH_METRICS.mswTestFiles));
    expect(section.textContent).toMatch(/couverture bloquante côté front/i);
    expect(section.textContent).toContain(String(TECH_METRICS.mongoCoverageLines));
    expect(section.textContent).not.toMatch(/sans seuil qui fasse échouer/i);
    expect(section.textContent).not.toMatch(/un vrai navigateur/i);
  });

  it('distingue les trois familles de tests par leur nom technique', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#tests') as HTMLElement;

    expect(section.textContent).toMatch(/tests unitaires/i);
    expect(section.textContent).toMatch(/tests d.intégration/i);
    expect(section.textContent).toMatch(/tests end to end/i);
    expect(section.textContent).not.toMatch(/bout en bout/i);
    expect(section.textContent).toContain(String(TECH_METRICS.integrationTestCases));
    expect(section.textContent).toContain(String(TECH_METRICS.e2eTestCases));
  });

  it('accorde le titre de la trajectoire avec la frise et les mesures', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#trajectory') as HTMLElement;
    const heading = section.querySelector('h2')?.textContent ?? '';

    expect(heading).toContain(String(TECH_METRICS.monthsActive));
    expect(heading).toContain(String(SHIPPED_MILESTONES));
    expect(heading).not.toMatch(/sept mois|huit paliers/i);
  });

  it('presents the trajectory as a timeline, one marker per milestone', () => {
    const { container } = renderTechPage();
    const steps = [...container.querySelectorAll('section#trajectory > ol > li')];

    expect(steps).toHaveLength(15);
    expect(steps[0]).toHaveTextContent(/MVP/);
    expect(steps.at(-1)).toHaveTextContent(/V2/);
    const titles = steps.map((step) => step.querySelector('h3')?.textContent ?? '');
    expect(titles.some((title) => title.includes('Prochainement'))).toBe(true);
    expect(titles.some((title) => /V1\.(8|9|10)\b/.test(title))).toBe(false);

    for (const step of steps.filter((step) => step.getAttribute('data-state') !== 'unplanned')) {
      const title = step.querySelector('h3')?.textContent ?? '';
      const minimumItems = title.includes('Prochainement') ? 1 : 3;
      expect(step.querySelector('h3')).not.toBeNull();
      expect(step.querySelectorAll(':scope > ul > li').length).toBeGreaterThanOrEqual(minimumItems);
    }
  });

  it('separates the delivered milestones, the current one and those still to do', () => {
    const { container } = renderTechPage();
    const steps = [...container.querySelectorAll('section#trajectory > ol > li')];
    const state = (step: Element) => step.getAttribute('data-state');

    expect(steps.filter((step) => state(step) === 'shipped')).toHaveLength(SHIPPED_MILESTONES);
    expect(steps.filter((step) => state(step) === 'current')).toHaveLength(CURRENT_MILESTONES);
    expect(steps.filter((step) => state(step) === 'planned')).toHaveLength(PLANNED_MILESTONES);
    expect(state(steps.at(-1) as Element)).toBe('planned');

    const unplanned = steps.filter((step) => state(step) === 'unplanned');
    expect(unplanned).toHaveLength(1);
    expect(unplanned[0]).toBe(steps.at(-2));
    expect(unplanned[0]?.textContent).toMatch(/backlog/i);
    expect(unplanned[0]?.textContent).toMatch(/sans date ni numéro de version/i);
    expect(unplanned[0]?.querySelector('h3')).toBeNull();
    expect(unplanned[0]?.querySelectorAll('li')).toHaveLength(0);

    expect(CURRENT_MILESTONES).toBe(1);
    const current = steps.find((step) => state(step) === 'current') as Element;
    expect(current.querySelector('h3')).toHaveTextContent('Flux continu');
    expect(steps.indexOf(current)).toBe(SHIPPED_MILESTONES);
    expect(current).toHaveTextContent(/en cours/i);
    const v16 = steps.find((step) =>
      step.querySelector('h3')?.textContent?.startsWith('V1.6')
    ) as Element;
    expect(state(v16)).toBe('shipped');
    expect(v16.textContent).not.toMatch(/en cours|fusion dans master/i);
    expect(fr.tech.trajectory.lead).not.toMatch(/en cours/i);

    for (const step of steps) {
      const badge = /à venir/i.test(step.textContent ?? '');
      expect(badge).toBe(state(step) === 'planned');
    }
  });

  it('names every tooled procedure of the flow and shows the TDD', () => {
    const { container } = renderTechPage();
    const labels = [...container.querySelectorAll('#method svg text')].map(
      (node) => node.textContent
    );

    for (const command of [
      '/dev-feature',
      '/product-management:write-spec',
      '/design:design-critique',
      '/engineering:testing-strategy',
      '/verify',
      '/engineering:code-review',
      '/simplify',
      '/security-review',
      '/engineering:deploy-checklist',
      '/weekly-maintenance',
      '/auto-maintenance',
    ]) {
      expect(labels).toContain(command);
    }
    expect(labels).not.toContain('/code-review');
    expect(labels).not.toContain('/engineering:tech-debt');
    expect(labels.some((label) => label?.includes('TDD'))).toBe(true);
  });

  it('reserves the Anthropic brand for Anthropic procedures, in-house procedures carry the clapperboard', () => {
    const { container } = renderTechPage();
    const boxes = [...container.querySelectorAll('svg g[data-origin]')];
    const boxOf = (command: string) =>
      boxes.find((box) => box.querySelector('text')?.textContent === command) as SVGGElement;

    for (const homemade of [
      '/dev-feature',
      '/verify',
      '/weekly-maintenance',
      '/auto-maintenance',
    ]) {
      const box = boxOf(homemade);
      expect(box.dataset.origin).toBe('project');
      expect(box.querySelector('image')?.getAttribute('href')).toBe('/logo.svg');
      expect(box.querySelector('svg')).toBeNull();
    }
    for (const anthropic of [
      '/product-management:write-spec',
      '/design:design-critique',
      '/engineering:testing-strategy',
      '/engineering:code-review',
      '/simplify',
      '/security-review',
      '/engineering:deploy-checklist',
    ]) {
      const box = boxOf(anthropic);
      expect(box.dataset.origin).toBe('anthropic');
      expect(box.querySelector('image')).toBeNull();
      expect(box.querySelector('svg')).not.toBeNull();
    }
  });

  it('places the functional report in the flow, instead of the technical plan', () => {
    const { container } = renderTechPage();
    const flow = container.querySelector(
      'svg[aria-labelledby="tech-featureflow-title"]'
    ) as SVGSVGElement;
    const labels = [...flow.querySelectorAll('text')].map((node) => node.textContent);

    expect(labels).toContain('compte rendu fonctionnel');
    expect(labels).toContain('plan de tests');
    expect(labels).toContain('contrôle en navigateur');
    expect(labels).not.toContain('plan technique');
    expect(labels.join(' ')).not.toMatch(/verify:local/);
    expect(flow.querySelectorAll('rect[width="8"]')).toHaveLength(5);
    expect(container.querySelector('#method')?.textContent).toContain(
      'Cadrage, compte rendu fonctionnel, maquette, recette locale.'
    );
  });

  it('ouvre sur le contexte et les chiffres, sans fiche technique', () => {
    const { container } = renderTechPage();
    const hero = container.querySelector('header') as HTMLElement;

    expect(hero.querySelectorAll('article')).toHaveLength(0);
    expect(hero.querySelector('dl')).toBeNull();
    expect(hero.querySelectorAll('li[class*="metric"]')).toHaveLength(6);
  });

  it('adosse chaque chiffre du hero a une mesure prise au build', () => {
    const { container } = renderTechPage();
    const hero = container.querySelector('header') as HTMLElement;
    const text = hero.textContent ?? '';

    for (const value of [
      TECH_METRICS.endpoints,
      TECH_METRICS.monthsActive,
      TECH_METRICS.coverageLines,
    ]) {
      expect(text).toContain(String(value));
    }
    expect(text).toContain(`${TECH_METRICS.monthsActive}\u00a0mois`);
    expect(text).toContain(`${TECH_METRICS.coverageLines}\u00a0%`);
  });

  it('annonce un projet toujours en cours, sans date de fin', () => {
    const { container } = renderTechPage();
    const hero = container.querySelector('header') as HTMLElement;

    expect(hero.textContent).toMatch(/février 2026/i);
    expect(hero.textContent).toMatch(/en ligne/i);
    expect(hero.textContent).not.toMatch(/février à septembre 2026/i);
  });

  it('explains every term through a bubble attached to the marker that triggers it', () => {
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

  it('offers a collapsible table of contents that announces the current section', async () => {
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

  it('no longer contains the removed sections nor an incident block', () => {
    const { container } = renderTechPage();

    expect(container.querySelector('#quality')?.textContent).toMatch(/contrôle d.architecture/i);
    expect(container.querySelector('#quality')?.textContent).toContain(
      fr.tech.quality.ruleWriteSeq
    );
    for (const id of ['tests', 'ci']) {
      expect(container.querySelector(`#${id}`)?.textContent).not.toMatch(
        /contrôle d.architecture/i
      );
    }

    for (const id of ['domain', 'decisions', 'debt']) {
      expect(container.querySelector(`section#${id}`)).toBeNull();
    }
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
  });

  it('ouvre sur l’architecture et referme sur la trajectoire', () => {
    const { container } = renderTechPage();
    const ids = [...container.querySelectorAll('section[id]')].map((node) => node.id);

    expect(ids).toEqual([...TECH_SECTIONS]);
    expect(ids.at(1)).toBe('choices');
    expect(ids.at(-1)).toBe('trajectory');
  });

  it('backs the boundary promise with structural facts', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#architecture') as HTMLElement;

    for (const fact of ['boundary', 'stateless', 'deploys'] as const) {
      expect(section.textContent).toContain(fr.tech.architecture[fact]);
    }
    expect(section.textContent).toContain(fr.tech.architecture.structureHeading);
    expect(section.textContent).not.toMatch(/rien ne vit dans le processus/i);
    expect(section.textContent).toMatch(/flux en direct/i);
    expect(section.textContent).toMatch(/30 secondes/);
  });

  it('separates the services called by the server from those calling it', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#architecture') as HTMLElement;
    const diagram = [...section.querySelectorAll('svg text')]
      .map((node) => node.textContent)
      .join(' ');

    expect(diagram).toContain(fr.tech.diagram.externalServices);
    expect(diagram).toContain(fr.tech.diagram.inboundCalls);
    expect(diagram).toContain('Resend');
    expect(diagram).toContain('Cloud Scheduler');
    expect(diagram).not.toMatch(/observabilit/i);

    for (const service of ['email', 'scheduler', 'kofi'] as const) {
      expect(section.textContent).toContain(fr.tech.architecture[service]);
    }
  });

  it('only quotes a price where there is one, without claiming everything was decided', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#choices') as HTMLElement;

    const cards = [...section.querySelectorAll('article')];
    const trades = [...section.querySelectorAll('[class*="factTrade"]')].filter(
      (node) => node.tagName === 'P'
    );

    expect(cards).toHaveLength(10);
    expect(fr.tech.choices.title).not.toMatch(/chaque brique/i);

    for (const choice of [
      'runtime',
      'hexagonal',
      'database',
      'persistence',
      'auth',
      'front',
      'styling',
      'hosting',
      'oneCloud',
      'mono',
    ] as const) {
      expect(section.textContent).toContain(fr.tech.choices[choice]);
    }

    const priced = [
      'runtime',
      'hexagonal',
      'database',
      'auth',
      'front',
      'hosting',
      'oneCloud',
    ] as const;
    expect(trades).toHaveLength(priced.length);
    for (const choice of priced) {
      expect(trades.map((trade) => trade.textContent)).toContain(
        `${fr.tech.choices.tradeLabel} ${fr.tech.choices[`${choice}Trade`]}`
      );
    }
  });

  it('dates the server rewrite without lending it a contract that did not exist', () => {
    expect(fr.tech.choices.runtimeHint).not.toMatch(/OpenAPI/i);
    expect(fr.tech.choices.runtimeTrade).not.toMatch(/deux mois/i);
    expect(fr.tech.choices.persistenceValue).not.toMatch(/chaque document est traduit/i);
  });

  it('leaves the test suites to their section and keeps the server on its guarantees', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#server') as HTMLElement;
    const cards = [...section.querySelectorAll('article')];

    expect(cards).toHaveLength(3);
    for (const fact of ['rules', 'versioning', 'health'] as const) {
      expect(section.textContent).toContain(fr.tech.server[fact]);
    }
    expect(section.textContent).not.toMatch(/suite unitaire|suite d.intégration/i);
  });

  it('describes the contract as a check, not as a generation', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#contract') as HTMLElement;
    const diagram = [...section.querySelectorAll('svg text')]
      .map((node) => node.textContent)
      .join(' ');

    expect(section.textContent).toContain(fr.tech.contract.types);
    expect(section.textContent).not.toMatch(/jamais (recopiés|écrits)/i);
    expect(section.textContent).not.toMatch(/importé par ce seul test/i);
    expect(section.textContent).toMatch(/openapi:sync/);
    expect(diagram).not.toMatch(/générés/i);
    expect(section.textContent).toContain(String(TECH_METRICS.contractCheckedTypes));
    expect(section.textContent).toContain(String(TECH_METRICS.contractResponses));
  });

  it('lit les versions du socle technique dans les mesures de build', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#ui') as HTMLElement;
    const diagram = [...section.querySelectorAll('svg text')]
      .map((node) => node.textContent)
      .join(' ');

    expect(diagram).toContain(`React ${TECH_METRICS.reactMajor}`);
    expect(diagram).toContain(`TypeScript ${TECH_METRICS.typescriptMajor}`);
    expect(diagram).toContain(`Vite ${TECH_METRICS.viteMajor}`);
    expect(diagram).toContain(`React Router ${TECH_METRICS.routerMajor}`);
    expect(section.textContent).toContain(String(TECH_METRICS.lazyRoutes));
  });

  it('draws the front domains as the features of the repository', () => {
    const { container } = renderTechPage();
    const diagram = container.querySelector(
      'svg[aria-labelledby="tech-frontgraph-title"]'
    ) as SVGSVGElement;
    const labels = [...diagram.querySelectorAll('text')].map((node) => node.textContent);

    expect(labels).toContain(fr.tech.diagram.domainLibrary);
    expect(labels).not.toContain('watchlist');
    expect(container.querySelector('#ui')?.textContent).toMatch(/table/i);
  });

  it('no longer announces the public screens as an exception', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#choices') as HTMLElement;

    expect(section.textContent).not.toMatch(/quasi-totalité des écrans/i);
    expect(section.textContent).not.toMatch(/un numéro de version/i);
  });

  it('details the data model, collections and indexes included', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#data') as HTMLElement;
    const labels = [...section.querySelectorAll('svg text')].map((node) => node.textContent);

    for (const collection of ['users', 'events', 'movies', 'votes', 'participants']) {
      expect(labels).toContain(collection);
    }
    expect(section.textContent).toContain(String(TECH_METRICS.mongoCollections));
    expect(section.textContent).toContain(String(TECH_METRICS.mongoIndexes));
  });

  it('draws the account deletion with the collections its transaction really writes', () => {
    const { container } = renderTechPage();
    const diagram = container.querySelector(
      'svg[aria-labelledby="tech-unitofwork-title"]'
    ) as SVGSVGElement;
    const labels = [...diagram.querySelectorAll('text')].map((node) => node.textContent);

    for (const collection of ['users', 'participants', 'watched_titles', 'avatar_photos']) {
      expect(labels).toContain(collection);
    }
    expect(labels).not.toContain('votes');
    expect(container.querySelector('#data')?.textContent).toMatch(/douze collections/);
    expect(container.querySelector('#data')?.textContent).not.toMatch(/huit collections/);
  });

  it('backs uniqueness, expirations and the poster cache with build-time measures', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#data') as HTMLElement;

    expect(section.querySelectorAll('article')).toHaveLength(7);
    for (const fact of ['uniqueness', 'expiry', 'inventory'] as const) {
      expect(section.textContent).toContain(fr.tech.data[fact]);
    }
    expect(section.textContent).toContain(String(TECH_METRICS.uniqueIndexes));
    expect(section.textContent).toContain(String(TECH_METRICS.inventoriedIndexes));
    expect(section.textContent).toContain(String(TECH_METRICS.posterCacheTtlDays));
    expect(section.textContent).not.toMatch(/jamais rechargées/i);
  });

  it('walks a feature end to end, human arbitration included', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#feature') as HTMLElement;

    expect(section.textContent).toMatch(/letterboxd/i);
    expect(section.querySelector('svg')).not.toBeNull();
    expect(section.querySelectorAll('article')).toHaveLength(6);
    expect(section.textContent).toContain(fr.tech.feature.triggerValue);
    expect(section.textContent).toContain(fr.tech.feature.humanValue);
    expect(section.textContent).toContain(fr.tech.feature.align);
    expect(section.textContent).toMatch(/retire ceux qui ont quitté/i);
    expect(section.textContent).not.toMatch(/un client modifié ne peut pas/i);
  });

  it('names the regions and the infrastructure building blocks', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#infra') as HTMLElement;
    const labels = [...section.querySelectorAll('svg text')].map((node) => node.textContent);

    for (const brick of [
      'Cloud Run',
      'Firebase Hosting',
      'Cloud Monitoring',
      'MongoDB Atlas',
      'Artifact Registry',
    ]) {
      expect(labels).toContain(brick);
    }
    expect(section.textContent).toMatch(/europe-west1/);
    expect(section.textContent).not.toMatch(/AWS|CloudFront|eu-west-1/);
  });

  it('ties every measure to a threshold that can stop a delivery', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#quality') as HTMLElement;

    expect(section.textContent).toContain(String(TECH_METRICS.lighthousePages));
    expect(section.textContent).toContain(String(TECH_METRICS.lighthousePerformance));
    expect(section.textContent).toContain(String(TECH_METRICS.coverageBranches));
    expect(section.textContent).not.toMatch(/déroge/i);
    expect(section.textContent).toMatch(/cinq fois/i);
    expect(section.textContent).toMatch(/sonarcloud/i);
    expect(section.textContent).toMatch(/sentry/i);
    expect(section.textContent).toMatch(/posthog/i);
  });

  it('annonce les chantiers techniques encore ouverts', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#trajectory') as HTMLElement;
    const tags = [...section.querySelectorAll('[class*="tag"]')]
      .map((node) => node.textContent?.trim())
      .filter(Boolean);

    for (const work of ['sharedCache', 'containerTwice', 'sentryToken', 'scopedAccess'] as const) {
      expect(tags).toContain(fr.tech.trajectory[work]);
    }
    expect(tags.join(' ')).not.toMatch(
      /pré-rendu|Google Cloud|fédérée|Environnement de recette|Infrastructure en code|au plus juste/i
    );
  });

  it('describes the staging, the infrastructure as code and the keyless identities', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#infra') as HTMLElement;

    expect(section.textContent).toMatch(/staging\.movie-picker\.fr/);
    expect(section.textContent).toMatch(/Terraform/);
    expect(section.textContent).toMatch(/sans clé/i);
    expect(section.textContent).not.toMatch(/restent à décrire|qu’une production/i);
  });

  it('lists the infrastructure and backup pipelines beside the main graph', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#ci') as HTMLElement;
    const tags = [...section.querySelectorAll('[class*="tag"]')]
      .map((node) => node.textContent?.trim())
      .filter(Boolean);

    for (const pipeline of ['rollback', 'terraform', 'backup', 'securityScan'] as const) {
      expect(tags).toContain(fr.tech.ci[pipeline]);
    }
    expect(tags.join(' ')).not.toMatch(/nettoyage du registre/i);
    expect(section.textContent).toMatch(/relecteur/i);
    expect(section.textContent).toMatch(/chaque lundi/i);
    expect(section.textContent).toMatch(/36 heures/);
    expect(section.textContent).toMatch(/pas d.autre branche durable/i);
    expect(section.textContent).toMatch(/feedback-attachments/);
    expect(section.textContent).not.toMatch(/branche de version/i);
  });

  it('files the prerendering among the choices made, no longer among open work', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#choices') as HTMLElement;
    const front = [...section.querySelectorAll('article')].find((card) =>
      card.textContent?.includes(fr.tech.choices.front)
    ) as HTMLElement;

    expect(front.textContent).toMatch(/pré-rendu/i);
    expect(front.textContent).not.toMatch(/chantier ouvert/i);
  });

  it('says the scheduler carries the reminders and the recurring movie nights', () => {
    const { container } = renderTechPage();
    const architecture = container.querySelector('#architecture') as HTMLElement;
    const infra = container.querySelector('#infra') as HTMLElement;

    expect(architecture.textContent).toMatch(/soirées récurrentes/i);
    expect(infra.textContent).toMatch(/soirées récurrentes/i);
    expect(infra.textContent).toMatch(/30 minutes/);
    expect(infra.textContent).toMatch(/une fois par jour/i);
    expect(infra.textContent).toMatch(/les cinq jobs/i);
    expect(architecture.textContent).toMatch(/catalogue de l.accueil/i);
    expect(fr.tech.trajectory.containerTwiceHint).toMatch(/cinq jobs planifiés/);
    expect(JSON.stringify(fr.tech)).not.toMatch(/trois jobs/);
  });

  it('observe la production aussi depuis Cloud Monitoring, sondes et alertes comprises', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#quality') as HTMLElement;

    expect(section.textContent).toMatch(/Cloud Monitoring/);
    expect(section.textContent).toMatch(/quatre sondes/i);
    expect(section.textContent).toMatch(/douze politiques d.alerte/i);
    expect(section.textContent).not.toMatch(/(cinq|huit|onze) politiques d.alerte/i);
    expect(section.textContent).toMatch(/les trois dernières/i);
    expect(section.textContent).not.toMatch(/les deux dernières/i);
  });

  it('gives the same test total in the header as the three tiers of the pyramid', () => {
    const { container } = renderTechPage();
    const hero = container.querySelector('header') as HTMLElement;
    const total =
      TECH_METRICS.unitTestCases + TECH_METRICS.integrationTestCases + TECH_METRICS.e2eTestCases;

    expect(TECH_METRICS.testCases).toBe(total);
    expect(hero.textContent).toContain(techFormat('fr').number(total));
    expect(hero.textContent).toContain(`dont ${TECH_METRICS.testLinesShare}\u00a0% de tests`);
    expect(fr.tech.hero.metricLinesHint).toMatch(/non vides/);
    expect(fr.tech.hero.metricLinesHint).toMatch(/sans le code généré/);
  });

  it('names its author and links to the source code from the header', () => {
    const { container } = renderTechPage();
    const hero = container.querySelector('header') as HTMLElement;
    const source = within(hero).getByRole('link', { name: /code source sur github/i });

    expect(hero.textContent).toContain('Adrien Morand');
    expect(source).toHaveAttribute('href', SOURCE_REPOSITORY_URL);
    expect(source).toHaveAttribute('target', '_blank');
    expect(SOURCE_REPOSITORY_URL).toBe('https://github.com/Affy657/Movie-Picker');
  });

  it('opens with a one-minute summary of five points', () => {
    renderTechPage();
    const summary = screen.getByRole('complementary', { name: 'En une minute' });

    expect(within(summary).getAllByRole('listitem')).toHaveLength(5);
    expect(summary.textContent).toContain(techFormat('fr').number(TECH_METRICS.testCases));
    expect(summary.textContent).not.toMatch(/\{\{/);
  });

  it('speaks French rather than jargon, with typographic apostrophes', () => {
    const text = techTexts(fr.tech).join(' ');

    expect(text).not.toMatch(/\bchecks\b|fallback|coquille en 200|\b(la|les|une|cette) portes?\b/i);
    expect(text).not.toContain("'");
    expect(fr.tech.quality.note).toMatch(/linters courants ne couvrent pas tels quels/);
    expect(fr.tech.quality.note).not.toMatch(/aucun linter du marché/);
  });

  it('never says both that nothing is deployed by hand and that the deployment is manual', () => {
    const text = JSON.stringify(fr.tech);

    expect(text).not.toMatch(/rien n.est déployé à la main|déploiement se lance à la main/i);
    expect(fr.tech.infra.lead).toMatch(/sur commande/);
    expect(fr.tech.ci.lead).toMatch(/sur commande/);
  });

  it('draws one front domain per folder of features/', () => {
    const { container } = renderTechPage();
    const diagram = container.querySelector(
      'svg[aria-labelledby="tech-frontgraph-title"]'
    ) as SVGSVGElement;
    const labels = [...diagram.querySelectorAll('text')].map((node) => node.textContent);

    expect(FEATURE_FOLDERS.length).toBeGreaterThan(0);
    expect(
      FRONT_DOMAINS.map((domain) => domain.feature).sort((a, b) => a.localeCompare(b))
    ).toEqual(FEATURE_FOLDERS);
    expect(labels).toContain(fr.tech.diagram.domainGroups);
    expect(container.querySelector('#ui h2 + p')?.textContent).toMatch(
      new RegExp(`^${FRONT_DOMAINS.length} domaines`)
    );
  });

  it('marks what follows V1.7 in the trajectory', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#trajectory') as HTMLElement;

    expect(section.textContent).toContain(fr.tech.trajectory.since17What);
    for (const item of ['since17Item4', 'since17Item5', 'since17Item6', 'since17Item7'] as const) {
      expect(section.textContent).toContain(fr.tech.trajectory[item]);
    }
  });

  it('writes down what the daily maintenance does alone and what waits for approval', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#method') as HTMLElement;

    expect(section.textContent).toContain(fr.tech.method.autonomyTitle);
    expect(section.textContent).toMatch(/\/auto-maintenance/);
    expect(section.textContent).toMatch(/Tout le reste m.attend/);
    expect(fr.tech.method.lead).not.toMatch(/jamais la décision/);
    expect(PROJECT_SKILL_COUNT + EXTERNAL_SKILL_COUNT).toBe(SKILL_COUNT);
    expect(section.textContent).toContain(`Les ${PROJECT_SKILL_COUNT} marquées du clap`);
    expect(section.textContent).toMatch(/ne figurent pas dans le dépôt/);
  });

  it('justifies the hexagonal architecture in a single .NET project', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#choices') as HTMLElement;

    expect(section.textContent).toContain(fr.tech.choices.hexagonal);
    expect(section.textContent).toMatch(/test d.architecture/);
  });

  it('draws the TypeScript logo with its two letters only', () => {
    const { container } = render(<TypeScriptLogo />);

    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  it('formats every number in the reader language', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    const { container } = renderTechPage();
    const english = techFormat('en');
    const french = techFormat('fr');

    expect(container.querySelector('h1')).toHaveTextContent(en.tech.hero.title);
    const pyramid = container.querySelector(
      'svg[aria-labelledby="tech-testpyramid-title"]'
    ) as SVGSVGElement;
    expect(pyramid.textContent).toContain(english.number(TECH_METRICS.unitTestCases));
    expect(pyramid.textContent).not.toContain(french.number(TECH_METRICS.unitTestCases));
    expect(container.textContent).toContain(english.date(TECH_PAGE_LAST_UPDATE));
  });

  it('lets the keyboard reach every diagram, a labelled region', () => {
    const { container } = renderTechPage();
    const regions = screen.getAllByRole('region', { name: /^Schéma : / });

    expect(regions).toHaveLength(container.querySelectorAll('figure').length);
    for (const region of regions) expect(region).toHaveAttribute('tabindex', '0');
    expect(
      screen.getByRole('region', { name: `Schéma : ${fr.tech.diagram.ciTitle}` })
    ).toBeInTheDocument();
  });

  it('says a diagram can be swiped only when it overflows', () => {
    renderTechPage();
    expect(screen.queryByText(fr.tech.figure.scrollHint)).toBeNull();
  });

  it('shows the swipe hint on a diagram wider than its frame', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => 880,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 300,
    });
    try {
      renderTechPage();
      const region = screen.getByRole('region', {
        name: `Schéma : ${fr.tech.diagram.ciTitle}`,
      });

      expect(region.parentElement?.textContent).toContain(fr.tech.figure.scrollHint);
      expect(region.parentElement).toHaveAttribute('data-more-after', 'true');
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
      Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
    }
  });

  it("shows the document's last update date, kept by hand", () => {
    renderTechPage();
    expect(
      screen.getByText(
        new RegExp(`mis à jour le ${techFormat('fr').date(TECH_PAGE_LAST_UPDATE)}`, 'i')
      )
    ).toBeVisible();
  });

  it('keeps the update date in ISO format and never in the future', () => {
    expect(TECH_PAGE_LAST_UPDATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const update = new Date(`${TECH_PAGE_LAST_UPDATE}T00:00:00Z`);
    expect(Number.isNaN(update.getTime())).toBe(false);
    expect(update.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
