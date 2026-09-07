import {
  Accessibility,
  Bug,
  CalendarClock,
  ChartNoAxesColumn,
  Database,
  Fingerprint,
  Gauge,
  GitCommitVertical,
  ImageDown,
  KeyRound,
  Languages,
  PackageSearch,
  Palette,
  Power,
  Route,
  Scale,
  ShieldCheck,
  SplitSquareHorizontal,
  WifiOff,
  Zap,
} from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import TechHero from './tech/TechHero';
import TechRail, { sectionNumber, type TechSectionId } from './tech/TechRail';
import { FactGrid, Figure, TechHint, TechSection, type FactItem } from './tech/TechBlocks';
import TechTimeline from './tech/TechTimeline';
import {
  ArchitectureDiagram,
  BugFlowDiagram,
  CiGraphDiagram,
  ContractDiagram,
  ControlPyramidDiagram,
  FeatureFlowDiagram,
  FrontGraphDiagram,
  LayersDiagram,
  TestPyramidDiagram,
  UnitOfWorkDiagram,
} from './tech/TechDiagrams';
import {
  GitHubLogo,
  GoogleCloudLogo,
  KofiLogo,
  LetterboxdLogo,
  TmdbLogo,
  WebPushLogo,
} from './tech/TechLogos';
import { TECH_METRICS } from './tech/generated/techMetrics';
import shared from './tech/techShared.module.css';
import styles from './tech/techPage.module.css';

const METHOD_CARDS = ['reliability', 'memory', 'control', 'arbitration'] as const;

const ARCHITECTURE_SERVICES = [
  { key: 'tmdb', Logo: TmdbLogo },
  { key: 'letterboxd', Logo: LetterboxdLogo },
  { key: 'oauth', Logo: GoogleCloudLogo },
  { key: 'push', Logo: WebPushLogo },
  { key: 'kofi', Logo: KofiLogo },
  { key: 'issues', Logo: GitHubLogo },
] as const;

const UI_KEYS = [
  { key: 'design', Icon: Palette },
  { key: 'offline', Icon: WifiOff },
  { key: 'languages', Icon: Languages },
  { key: 'a11y', Icon: Accessibility },
] as const;

const DATA_KEYS = [
  { key: 'atomicity', Icon: GitCommitVertical },
  { key: 'migrations', Icon: CalendarClock },
  { key: 'isolation', Icon: SplitSquareHorizontal },
  { key: 'posters', Icon: ImageDown },
] as const;

const SECURITY_KEYS = [
  { key: 'secrets', Icon: KeyRound },
  { key: 'dependencies', Icon: PackageSearch },
  { key: 'browser', Icon: ShieldCheck },
  { key: 'sessions', Icon: Fingerprint },
  { key: 'abuse', Icon: Gauge },
  { key: 'startup', Icon: Power },
] as const;

const OBSERVABILITY_KEYS = [
  { key: 'gdpr', Icon: Scale },
  { key: 'errors', Icon: Bug },
  { key: 'usage', Icon: ChartNoAxesColumn },
  { key: 'traces', Icon: Route },
] as const;

const SERVER_KEYS = [
  { key: 'unitSuite', Icon: Zap },
  { key: 'integrationSuite', Icon: Database },
] as const;

const OTHER_PIPELINES = ['rollback', 'registry', 'securityScan'] as const;

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

  const iconFacts = (
    group: string,
    keys: readonly { key: string; Icon: typeof Bug }[],
    values: Record<string, string> = {}
  ): FactItem[] =>
    keys.map(({ key, Icon }) => ({
      key,
      icon: <Icon size={16} aria-hidden focusable="false" />,
      term: t(`tech.${group}.${key}` as TranslationKey),
      detail: values[key] ?? t(`tech.${group}.${key}Value` as TranslationKey),
      hint: t(`tech.${group}.${key}Hint` as TranslationKey),
    }));

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
            <FactGrid
              heading={t('tech.architecture.servicesHeading')}
              items={ARCHITECTURE_SERVICES.map(({ key, Logo }) => ({
                key,
                icon: <Logo size={18} />,
                term: t(`tech.architecture.${key}` as TranslationKey),
                detail: t(`tech.architecture.${key}Value` as TranslationKey),
                hint: t(`tech.architecture.${key}Hint` as TranslationKey),
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
            <TechTimeline />
          </TechSection>

          <TechSection
            id="ui"
            eyebrow={eyebrow('ui')}
            title={t('tech.ui.title')}
            lead={t('tech.ui.lead', { features: TECH_METRICS.features })}
          >
            <Figure caption={t('tech.diagram.frontGraphNote')}>
              <FrontGraphDiagram />
            </Figure>
            <FactGrid
              items={iconFacts('ui', UI_KEYS, {
                design: t('tech.ui.designValue', { components: TECH_METRICS.sharedComponents }),
                a11y: t('tech.ui.a11yValue', { views: TECH_METRICS.a11yViews }),
              })}
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
            <FactGrid
              heading={t('tech.server.noteLead')}
              items={iconFacts('server', SERVER_KEYS)}
            />
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
            <Figure caption={t('tech.data.caption')}>
              <UnitOfWorkDiagram />
            </Figure>
            <FactGrid
              items={iconFacts('data', DATA_KEYS, {
                migrations: t('tech.data.migrationsValue', {
                  migrations: TECH_METRICS.migrations,
                }),
              })}
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
                <li key={rule}>
                  <TechHint label={t(`tech.tests.${rule}Hint` as TranslationKey)}>
                    <span className={shared.tag}>{t(`tech.tests.${rule}` as TranslationKey)}</span>
                  </TechHint>
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
            <p className={shared.groupHeading}>{t('tech.ci.otherPipelines')}</p>
            <ul className={shared.tags}>
              {OTHER_PIPELINES.map((pipeline) => (
                <li key={pipeline}>
                  <TechHint label={t(`tech.ci.${pipeline}Hint` as TranslationKey)}>
                    <span className={shared.tag}>{t(`tech.ci.${pipeline}` as TranslationKey)}</span>
                  </TechHint>
                </li>
              ))}
            </ul>
          </TechSection>

          <TechSection
            id="production"
            eyebrow={eyebrow('production')}
            title={t('tech.production.title')}
          >
            <FactGrid
              heading={t('tech.production.securityHeading')}
              items={iconFacts('production', SECURITY_KEYS)}
            />
            <FactGrid
              heading={t('tech.production.observabilityHeading')}
              items={iconFacts('production', OBSERVABILITY_KEYS)}
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
            <p className={shared.note}>
              <strong>{t('tech.method.mcpNoteLead')}</strong> {t('tech.method.mcpNote')}
            </p>
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
                    <TechHint label={t(`tech.method.${card}Hint` as TranslationKey)}>
                      {t(`tech.method.${card}Kicker` as TranslationKey)}
                    </TechHint>
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

          <div className={styles.signature}>
            <p className={styles.signatureText}>
              <span className={styles.signatureName}>{t('tech.signature')}</span>{' '}
              {t('tech.signatureText')}
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
