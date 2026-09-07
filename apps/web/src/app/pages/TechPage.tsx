import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import TechHero from './tech/TechHero';
import TechRail, { sectionNumber, type TechSectionId } from './tech/TechRail';
import { Figure, Incident, SpecList, TechSection } from './tech/TechBlocks';
import {
  ArchitectureDiagram,
  BugFlowDiagram,
  CiGraphDiagram,
  ContractDiagram,
  ControlPyramidDiagram,
  FeatureFlowDiagram,
  LayersDiagram,
  TestPyramidDiagram,
} from './tech/TechDiagrams';
import { TECH_METRICS, TECH_WHEEL_SNIPPET } from './tech/generated/techMetrics';
import shared from './tech/techShared.module.css';
import styles from './tech/techPage.module.css';

const TRAJECTORY_STEPS = ['mvp', 'migration', 'v1', 'v12', 'v14', 'v15'] as const;

const DECISIONS = ['mongo', 'dotnet', 'monolith'] as const;

const DEBT_ITEMS = ['iac', 'staging', 'keys'] as const;

const METHOD_CARDS = ['reliability', 'memory', 'control', 'arbitration'] as const;

const ARCHITECTURE_KEYS = ['tmdb', 'letterboxd', 'oauth', 'push', 'kofi', 'issues'] as const;

const UI_KEYS = ['stack', 'domains', 'design', 'offline', 'languages', 'a11y'] as const;

const DATA_KEYS = ['atomicity', 'migrations', 'isolation', 'posters'] as const;

const DOMAIN_KEYS = ['exclusion', 'repeat', 'weight'] as const;

const PRODUCTION_KEYS = [
  'secrets',
  'dependencies',
  'browser',
  'sessions',
  'abuse',
  'startup',
  'gdpr',
  'errors',
  'usage',
  'traces',
] as const;

const ARCHITECTURE_RULES = [
  'ruleComment',
  'ruleLiteral',
  'ruleBreakpoint',
  'ruleImport',
  'ruleCycle',
] as const;

export default function TechPage() {
  const { t } = useTranslation();

  usePageSeo({
    title: t('common.pageTitle', { segment: t('tech.seoTitle') }),
    description: t('tech.seoDescription'),
    imageAlt: t('tech.ogImageAlt'),
    canonical: `${SITE_URL}${ROUTES.tech}`,
    ogType: 'article',
  });

  const eyebrow = (id: TechSectionId) =>
    `${sectionNumber(id)} / ${t(`tech.nav.${id}` as TranslationKey)}`;

  const uiValues: Record<(typeof UI_KEYS)[number], string> = {
    stack: t('tech.ui.stackValue'),
    domains: t('tech.ui.domainsValue'),
    design: t('tech.ui.designValue', { components: TECH_METRICS.sharedComponents }),
    offline: t('tech.ui.offlineValue'),
    languages: t('tech.ui.languagesValue'),
    a11y: t('tech.ui.a11yValue', { views: TECH_METRICS.a11yViews }),
  };

  return (
    <PageLayout className={styles.tech}>
      <TechHero />

      <div className={styles.shell}>
        <TechRail />

        <div className={styles.content}>
          <TechSection
            id="architecture"
            eyebrow={eyebrow('architecture')}
            title={t('tech.architecture.title')}
            lead={t('tech.architecture.lead')}
          >
            <Figure caption={t('tech.architecture.caption')}>
              <ArchitectureDiagram />
            </Figure>
            <SpecList
              items={ARCHITECTURE_KEYS.map((key) => ({
                term: t(`tech.architecture.${key}` as TranslationKey),
                detail: t(`tech.architecture.${key}Value` as TranslationKey),
                emphasis: key === 'issues',
              }))}
            />
          </TechSection>

          <TechSection
            id="trajectory"
            eyebrow={eyebrow('trajectory')}
            title={t('tech.trajectory.title')}
            lead={t('tech.trajectory.lead', { commits: TECH_METRICS.commits })}
          >
            <ol className={styles.timeline}>
              {TRAJECTORY_STEPS.map((step) => (
                <li className={styles.timelineItem} key={step}>
                  <span className={styles.timelineWhen}>
                    {t(`tech.trajectory.${step}When` as TranslationKey)}
                  </span>
                  <span className={styles.timelineWhat}>
                    {t(`tech.trajectory.${step}What` as TranslationKey)}
                  </span>
                  <span className={styles.timelineDetail}>
                    {t(`tech.trajectory.${step}Detail` as TranslationKey)}
                  </span>
                </li>
              ))}
            </ol>
          </TechSection>

          <TechSection
            id="ui"
            eyebrow={eyebrow('ui')}
            title={t('tech.ui.title')}
            lead={t('tech.ui.lead', { features: TECH_METRICS.features })}
          >
            <SpecList
              items={UI_KEYS.map((key) => ({
                term: t(`tech.ui.${key}` as TranslationKey),
                detail: uiValues[key],
                emphasis: key === 'design',
              }))}
            />
            <Incident
              kicker={t('tech.incidentKicker')}
              title={t('tech.ui.incidentTitle')}
              steps={[
                { label: t('tech.symptom'), text: t('tech.ui.incidentSymptom') },
                { label: t('tech.cause'), text: t('tech.ui.incidentCause') },
                { label: t('tech.fix'), text: t('tech.ui.incidentFix') },
              ]}
            />
          </TechSection>

          <TechSection
            id="server"
            eyebrow={eyebrow('server')}
            title={t('tech.server.title')}
            lead={t('tech.server.lead')}
          >
            <Figure
              caption={t('tech.server.caption', {
                ports: TECH_METRICS.ports,
                repositories: TECH_METRICS.doubledRepositories,
              })}
            >
              <LayersDiagram />
            </Figure>
            <p className={shared.note}>
              <strong>{t('tech.server.noteLead')}</strong> {t('tech.server.note')}
            </p>
          </TechSection>

          <TechSection
            id="contract"
            eyebrow={eyebrow('contract')}
            title={t('tech.contract.title')}
            lead={t('tech.contract.lead')}
          >
            <Figure>
              <ContractDiagram />
            </Figure>
            <p className={shared.note}>{t('tech.contract.note')}</p>
          </TechSection>

          <TechSection id="data" eyebrow={eyebrow('data')} title={t('tech.data.title')}>
            <SpecList
              items={DATA_KEYS.map((key) => ({
                term: t(`tech.data.${key}` as TranslationKey),
                detail:
                  key === 'migrations'
                    ? t('tech.data.migrationsValue', { migrations: TECH_METRICS.migrations })
                    : t(`tech.data.${key}Value` as TranslationKey),
              }))}
            />
          </TechSection>

          <TechSection
            id="domain"
            eyebrow={eyebrow('domain')}
            title={t('tech.domain.title')}
            lead={t('tech.domain.lead')}
          >
            <figure>
              <figcaption className="visually-hidden">{t('tech.domain.codeLabel')}</figcaption>
              <pre className={styles.code} tabIndex={0}>
                <code>{TECH_WHEEL_SNIPPET}</code>
              </pre>
            </figure>
            <SpecList
              items={DOMAIN_KEYS.map((key) => ({
                term: t(`tech.domain.${key}` as TranslationKey),
                detail: t(`tech.domain.${key}Value` as TranslationKey),
                emphasis: key === 'weight',
              }))}
            />
          </TechSection>

          <TechSection
            id="tests"
            eyebrow={eyebrow('tests')}
            title={t('tech.tests.title', { tests: TECH_METRICS.testFiles })}
          >
            <Figure
              caption={t('tech.tests.caption', {
                lines: TECH_METRICS.coverageLines,
                functions: TECH_METRICS.coverageFunctions,
                branches: TECH_METRICS.coverageBranches,
              })}
            >
              <TestPyramidDiagram />
            </Figure>
            <p className={shared.note}>
              <strong>{t('tech.tests.noteLead')}</strong>{' '}
              {t('tech.tests.note', { lines: TECH_METRICS.architectureScriptLines })}
            </p>
            <ul className={shared.tags}>
              {ARCHITECTURE_RULES.map((rule) => (
                <li className={shared.tag} key={rule}>
                  {t(`tech.tests.${rule}` as TranslationKey)}
                </li>
              ))}
            </ul>
          </TechSection>

          <TechSection
            id="ci"
            eyebrow={eyebrow('ci')}
            title={t('tech.ci.title', { jobs: TECH_METRICS.ciJobs })}
            lead={t('tech.ci.lead')}
          >
            <Figure caption={t('tech.ci.caption')}>
              <CiGraphDiagram />
            </Figure>
            <Incident
              kicker={t('tech.incidentKicker')}
              title={t('tech.ci.incidentTitle')}
              steps={[
                { label: t('tech.symptom'), text: t('tech.ci.incidentSymptom') },
                { label: t('tech.cause'), text: t('tech.ci.incidentCause') },
                { label: t('tech.fix'), text: t('tech.ci.incidentFix') },
              ]}
            />
            <p className={shared.note}>{t('tech.ci.note')}</p>
          </TechSection>

          <TechSection
            id="production"
            eyebrow={eyebrow('production')}
            title={t('tech.production.title')}
          >
            <SpecList
              items={PRODUCTION_KEYS.map((key) => ({
                term: t(`tech.production.${key}` as TranslationKey),
                detail: t(`tech.production.${key}Value` as TranslationKey),
                emphasis: key === 'startup',
              }))}
            />
          </TechSection>

          <TechSection
            id="method"
            eyebrow={eyebrow('method')}
            title={t('tech.method.title')}
            lead={t('tech.method.lead')}
          >
            <Figure caption={t('tech.method.featureCaption')}>
              <FeatureFlowDiagram />
            </Figure>
            <Figure caption={t('tech.method.bugCaption')}>
              <BugFlowDiagram />
            </Figure>
            <Figure>
              <ControlPyramidDiagram />
            </Figure>
            <div className={styles.minis}>
              {METHOD_CARDS.map((card) => (
                <div className={styles.mini} key={card}>
                  <p className={styles.miniKicker}>
                    {t(`tech.method.${card}Kicker` as TranslationKey)}
                  </p>
                  <h3 className={styles.miniTitle}>
                    {t(`tech.method.${card}Title` as TranslationKey)}
                  </h3>
                  <p className={styles.miniText}>
                    {card === 'arbitration'
                      ? t('tech.method.arbitrationText', { jobs: TECH_METRICS.ciJobs })
                      : t(`tech.method.${card}Text` as TranslationKey)}
                  </p>
                </div>
              ))}
            </div>
          </TechSection>

          <TechSection
            id="decisions"
            eyebrow={eyebrow('decisions')}
            title={t('tech.decisions.title')}
          >
            <div className={styles.tableWrap} tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t('tech.decisions.columnChoice')}</th>
                    <th scope="col">{t('tech.decisions.columnWhy')}</th>
                    <th scope="col">{t('tech.decisions.columnCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {DECISIONS.map((decision) => (
                    <tr key={decision}>
                      <th scope="row">{t(`tech.decisions.${decision}Choice` as TranslationKey)}</th>
                      <td>{t(`tech.decisions.${decision}Why` as TranslationKey)}</td>
                      <td className={styles.cost}>
                        {t(`tech.decisions.${decision}Cost` as TranslationKey)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TechSection>

          <TechSection
            id="debt"
            eyebrow={eyebrow('debt')}
            title={t('tech.debt.title')}
            lead={t('tech.debt.lead')}
          >
            <ul className={styles.debt}>
              {DEBT_ITEMS.map((item) => (
                <li className={styles.debtItem} key={item}>
                  <span className={styles.debtWhat}>
                    {t(`tech.debt.${item}What` as TranslationKey)}
                  </span>
                  <span className={styles.debtWhy}>
                    {t(`tech.debt.${item}Why` as TranslationKey)}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.signature}>
              <p className={styles.signatureText}>
                <span className={styles.signatureName}>{t('tech.debt.signature')}</span>{' '}
                {t('tech.debt.signatureText')}
              </p>
            </div>
          </TechSection>
        </div>
      </div>
    </PageLayout>
  );
}
