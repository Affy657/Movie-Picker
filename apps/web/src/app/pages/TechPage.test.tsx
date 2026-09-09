import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import TechPage from '@/app/pages/TechPage';
import { TECH_SECTIONS } from '@/app/pages/tech/TechRail';
import { PLANNED_MILESTONES, SHIPPED_MILESTONES } from '@/app/pages/tech/TechTimeline';
import { TECH_METRICS } from '@/app/pages/tech/generated/techMetrics';
import { fr } from '@/shared/i18n/locales/fr';
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /movie picker est construit/i
    );
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
    expect(screen.getByText(String(TECH_METRICS.commits))).toBeInTheDocument();
    expect(
      screen.getAllByText((text) => text.replace(/\D/g, '') === String(TECH_METRICS.testCases))
        .length
    ).toBeGreaterThan(0);
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
    const labels = [...container.querySelectorAll('#method svg text')].map(
      (node) => node.textContent
    );

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

  it('présente la méthode en cartes et compte ses procédures comme le schéma', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#method') as HTMLElement;

    expect(section.querySelectorAll('article')).toHaveLength(4);
    expect(section.querySelectorAll('figure')).toHaveLength(4);
    expect(section.textContent).toMatch(/cinq procédures/i);
    expect(section.textContent).not.toMatch(/quatre procédures/i);
    expect(section.textContent).toContain(String(TECH_METRICS.assistantTools));
  });

  it('nomme les deux secrets vitaux au démarrage et chiffre la limitation de débit', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#production') as HTMLElement;

    expect(section.querySelectorAll('article')).toHaveLength(8);
    expect(section.textContent).toContain(fr.tech.production.passwords);
    expect(section.textContent).toContain(String(TECH_METRICS.rateLimitPolicies));
    expect(section.textContent).toMatch(/liste d.origines autorisées ni adresse de base/i);
    expect(section.textContent).not.toMatch(/refuse de démarrer s.il manque un secret/i);
  });

  it("ne présente plus le format d'erreur comme un chantier ouvert", () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#trajectory') as HTMLElement;

    expect(section.textContent).not.toMatch(/format d.erreur normalisé/i);
  });

  it('range Sonar parmi les seuils bloquants et dit son verdict', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#quality') as HTMLElement;
    const groups = [...section.querySelectorAll('[class*="factList"]')];

    expect(groups[0]?.querySelectorAll('article')).toHaveLength(4);
    expect(groups[1]?.querySelectorAll('article')).toHaveLength(2);
    expect(groups[0]?.textContent).toContain(fr.tech.quality.sonar);
    expect(section.textContent).not.toMatch(/portail qualité informatif/i);
    expect(section.textContent).toContain(String(TECH_METRICS.lighthouseWatchlistPerformance));
  });

  it('dit que le déploiement est constaté et que le planificateur dépend de son jeton', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#infra') as HTMLElement;

    expect(section.textContent).toContain(fr.tech.infra.smoke);
    expect(section.textContent).toContain(String(TECH_METRICS.deploySecrets));
    expect(section.textContent).toMatch(/seulement si le jeton existe/i);
    expect(section.textContent).not.toMatch(/remet en ligne l.image précédente/i);
  });

  it("détaille la chaîne d'intégration au lieu de la laisser au seul schéma", () => {
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
    for (const node of ['ciLintWorkflows', 'ciE2eMongo'] as const) {
      expect(diagram).toContain(fr.tech.diagram[node]);
    }
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

  it('présente la trajectoire en frise, un repère par palier', () => {
    const { container } = renderTechPage();
    const steps = [...container.querySelectorAll('section#trajectory > ol > li')];

    expect(steps).toHaveLength(11);
    expect(steps[0]).toHaveTextContent(/MVP/);
    expect(steps.at(-1)).toHaveTextContent(/V2/);

    for (const step of steps) {
      expect(step.querySelector('h3')).not.toBeNull();
      expect(step.querySelectorAll(':scope > ul > li').length).toBeGreaterThanOrEqual(3);
    }
  });

  it('sépare les paliers livrés de ceux qui restent à faire', () => {
    const { container } = renderTechPage();
    const steps = [...container.querySelectorAll('section#trajectory > ol > li')];
    const state = (step: Element) => step.getAttribute('data-state');

    expect(steps.filter((step) => state(step) === 'planned')).toHaveLength(PLANNED_MILESTONES);
    expect(steps.filter((step) => state(step) !== 'planned')).toHaveLength(SHIPPED_MILESTONES);
    expect(state(steps.at(-1) as Element)).toBe('planned');

    for (const step of steps) {
      const badge = /à venir/i.test(step.textContent ?? '');
      expect(badge).toBe(state(step) === 'planned');
    }
  });

  it('nomme les quatre procédures outillées et affiche le TDD dans le flot', () => {
    const { container } = renderTechPage();
    const labels = [...container.querySelectorAll('#method svg text')].map(
      (node) => node.textContent
    );

    for (const command of [
      '/design:design-critique',
      '/engineering:testing-strategy',
      '/verify',
      '/engineering:code-review',
      '/engineering:tech-debt',
    ]) {
      expect(labels).toContain(command);
    }
    expect(labels.some((label) => label?.includes('TDD'))).toBe(true);
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

    expect(container.querySelector('#quality')?.textContent).toMatch(/contrôle d.architecture/i);
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

  it('appuie la promesse de frontière par des faits de structure', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#architecture') as HTMLElement;

    for (const fact of ['boundary', 'stateless', 'deploys'] as const) {
      expect(section.textContent).toContain(fr.tech.architecture[fact]);
    }
    expect(section.textContent).toContain(fr.tech.architecture.structureHeading);
  });

  it("sépare les services appelés par le serveur de ceux qui l'appellent", () => {
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

  it('justifie chaque choix technique par son alternative et son coût', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#choices') as HTMLElement;

    const cards = [...section.querySelectorAll('article')];
    const trades = [...section.querySelectorAll('[class*="factTrade"]')].filter(
      (node) => node.tagName === 'P'
    );

    expect(cards).toHaveLength(9);
    expect(trades).toHaveLength(cards.length);
    for (const choice of [
      'runtime',
      'database',
      'persistence',
      'auth',
      'front',
      'styling',
      'hosting',
      'split',
      'mono',
    ] as const) {
      expect(section.textContent).toContain(fr.tech.choices[choice]);
      expect(trades.map((trade) => trade.textContent)).toContain(
        `${fr.tech.choices.tradeLabel} ${fr.tech.choices[`${choice}Trade`]}`
      );
    }
  });

  it('laisse les suites de tests à leur section et garde le serveur sur ses garanties', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#server') as HTMLElement;
    const cards = [...section.querySelectorAll('article')];

    expect(cards).toHaveLength(3);
    for (const fact of ['rules', 'versioning', 'health'] as const) {
      expect(section.textContent).toContain(fr.tech.server[fact]);
    }
    expect(section.textContent).not.toMatch(/suite unitaire|suite d.intégration/i);
  });

  it('décrit le contrat comme une vérification, pas comme une génération', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#contract') as HTMLElement;
    const diagram = [...section.querySelectorAll('svg text')]
      .map((node) => node.textContent)
      .join(' ');

    expect(section.textContent).toContain(fr.tech.contract.types);
    expect(section.textContent).not.toMatch(/jamais (recopiés|écrits)/i);
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

  it("n'annonce plus les écrans publics comme une exception", () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#choices') as HTMLElement;

    expect(section.textContent).not.toMatch(/quasi-totalité des écrans/i);
    expect(section.textContent).not.toMatch(/un numéro de version/i);
  });

  it('détaille le modèle de données, collections et index compris', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#data') as HTMLElement;
    const labels = [...section.querySelectorAll('svg text')].map((node) => node.textContent);

    for (const collection of ['users', 'events', 'movies', 'votes', 'participants']) {
      expect(labels).toContain(collection);
    }
    expect(section.textContent).toContain(String(TECH_METRICS.mongoCollections));
    expect(section.textContent).toContain(String(TECH_METRICS.mongoIndexes));
  });

  it('adosse unicité, expirations et cache des affiches à des mesures de build', () => {
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

  it('déroule une fonctionnalité de bout en bout, arbitrage humain compris', () => {
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

  it('nomme les régions et les briques d’infrastructure', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#infra') as HTMLElement;
    const labels = [...section.querySelectorAll('svg text')].map((node) => node.textContent);

    for (const brick of ['Cloud Run', 'CloudFront', 'S3', 'MongoDB Atlas', 'Artifact Registry']) {
      expect(labels).toContain(brick);
    }
    expect(section.textContent).toMatch(/europe-west1/);
    expect(section.textContent).toMatch(/eu-west-1/);
  });

  it('rattache chaque mesure à un seuil qui peut arrêter une livraison', () => {
    const { container } = renderTechPage();
    const section = container.querySelector('#quality') as HTMLElement;

    expect(section.textContent).toContain(String(TECH_METRICS.lighthousePages));
    expect(section.textContent).toContain(String(TECH_METRICS.lighthousePerformance));
    expect(section.textContent).toContain(String(TECH_METRICS.coverageBranches));
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

    for (const work of [
      'terraform',
      'staging',
      'oidc',
      'leastPrivilege',
      'consolidate',
      'prerender',
    ] as const) {
      expect(tags).toContain(fr.tech.trajectory[work]);
    }
  });
});
