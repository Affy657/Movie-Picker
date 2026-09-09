import {
  Accessibility,
  Activity,
  Boxes,
  Braces,
  CalendarClock,
  Container,
  Database,
  FileJson,
  Fingerprint,
  FlaskConical,
  Filter,
  FolderTree,
  Gauge,
  GitCommitVertical,
  GitCompare,
  GitPullRequest,
  ImageDown,
  KeyRound,
  Languages,
  Layers,
  ListChecks,
  Lock,
  MonitorSmartphone,
  Network,
  PackageSearch,
  Palette,
  PlugZap,
  Power,
  RefreshCw,
  Route,
  Scale,
  ServerCog,
  ShieldCheck,
  SplitSquareHorizontal,
  Timer,
  Undo2,
  UserCheck,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import TechHero from './tech/TechHero';
import TechRail, { sectionNumber, type TechSectionId } from './tech/TechRail';
import { FactGrid, Figure, TechHint, TechSection, type FactItem } from './tech/TechBlocks';
import TechTimeline, { PLANNED_MILESTONES, SHIPPED_MILESTONES } from './tech/TechTimeline';
import {
  ArchitectureDiagram,
  AssistantToolingDiagram,
  BugFlowDiagram,
  CiGraphDiagram,
  ContractDiagram,
  DataModelDiagram,
  FeatureFlowDiagram,
  FrontGraphDiagram,
  InfraDiagram,
  LayersDiagram,
  LetterboxdFlowDiagram,
  ProductFlowDiagram,
  RequestPathDiagram,
  TestPyramidDiagram,
  UnitOfWorkDiagram,
} from './tech/TechDiagrams';
import {
  AwsLogo,
  DotNetLogo,
  GitHubLogo,
  GoogleCloudLogo,
  GoogleLogo,
  KofiLogo,
  LetterboxdLogo,
  MongoLogo,
  PostHogLogo,
  ReactLogo,
  ResendLogo,
  SentryLogo,
  SonarLogo,
  TmdbLogo,
  WebPushLogo,
} from './tech/TechLogos';
import { TECH_METRICS } from './tech/generated/techMetrics';
import shared from './tech/techShared.module.css';
import styles from './tech/techPage.module.css';

type FactIconComponent = ComponentType<{ size?: number }>;

const METHOD_CARDS = [
  { key: 'reliability', Icon: ListChecks },
  { key: 'memory', Icon: Boxes },
  { key: 'control', Icon: UserCheck },
  { key: 'arbitration', Icon: GitCompare },
] as const;

const ARCHITECTURE_STRUCTURE = [
  { key: 'boundary', Icon: Route },
  { key: 'stateless', Icon: Boxes },
  { key: 'deploys', Icon: GitCompare },
] as const;

const ARCHITECTURE_SERVICES = [
  { key: 'tmdb', Logo: TmdbLogo },
  { key: 'letterboxd', Logo: LetterboxdLogo },
  { key: 'oauth', Logo: GoogleLogo },
  { key: 'push', Logo: WebPushLogo },
  { key: 'email', Logo: ResendLogo },
  { key: 'kofi', Logo: KofiLogo },
  { key: 'scheduler', Logo: GoogleCloudLogo },
  { key: 'issues', Logo: GitHubLogo },
] as const;

const UI_KEYS = [
  { key: 'design', Icon: Palette },
  { key: 'data', Icon: RefreshCw },
  { key: 'loading', Icon: Zap },
  { key: 'offline', Icon: WifiOff },
  { key: 'languages', Icon: Languages },
  { key: 'a11y', Icon: Accessibility },
] as const;

const DATA_KEYS = [
  { key: 'uniqueness', Icon: Fingerprint },
  { key: 'atomicity', Icon: GitCommitVertical },
  { key: 'expiry', Icon: Timer },
  { key: 'migrations', Icon: CalendarClock },
  { key: 'isolation', Icon: SplitSquareHorizontal },
  { key: 'posters', Icon: ImageDown },
] as const;

const SECURITY_KEYS = [
  { key: 'passwords', Icon: Lock },
  { key: 'dependencies', Icon: PackageSearch },
  { key: 'browser', Icon: ShieldCheck },
  { key: 'sessions', Icon: Fingerprint },
  { key: 'abuse', Icon: Gauge },
  { key: 'startup', Icon: Power },
  { key: 'gdpr', Icon: Scale },
  { key: 'traces', Icon: Route },
] as const;

const SERVER_KEYS = [
  { key: 'rules', Icon: ShieldCheck },
  { key: 'versioning', Icon: GitCompare },
  { key: 'health', Icon: Activity },
] as const;

const CI_KEYS = [
  { key: 'trigger', Icon: GitPullRequest },
  { key: 'scope', Icon: Filter },
  { key: 'secrets', Icon: KeyRound },
  { key: 'image', Icon: Container },
  { key: 'guard', Icon: ShieldCheck },
  { key: 'caches', Icon: Layers },
] as const;

const OTHER_PIPELINES = ['rollback', 'registry', 'securityScan'] as const;

const CONTRACT_KEYS = [
  { key: 'export', Icon: FileJson },
  { key: 'types', Icon: Braces },
  { key: 'drift', Icon: GitCompare },
] as const;

const TEST_FAMILIES = [
  { key: 'unit', Icon: Boxes, value: TECH_METRICS.unitTestCases },
  { key: 'integration', Icon: Database, value: TECH_METRICS.integrationTestCases },
  { key: 'e2e', Icon: MonitorSmartphone, value: TECH_METRICS.e2eTestCases },
] as const;

const CHOICE_KEYS = [
  { key: 'runtime', Icon: DotNetLogo },
  { key: 'database', Icon: MongoLogo },
  { key: 'persistence', Icon: FileJson },
  { key: 'auth', Icon: Fingerprint },
  { key: 'front', Icon: ReactLogo },
  { key: 'styling', Icon: Palette },
  { key: 'hosting', Icon: GoogleCloudLogo },
  { key: 'split', Icon: AwsLogo },
  { key: 'mono', Icon: FolderTree },
] as const;

const FEATURE_KEYS = [
  { key: 'trigger', Icon: Timer },
  { key: 'read', Icon: LetterboxdLogo },
  { key: 'match', Icon: TmdbLogo },
  { key: 'align', Icon: GitCommitVertical },
  { key: 'human', Icon: UserCheck },
  { key: 'tested', Icon: FlaskConical },
] as const;

const INFRA_KEYS = [
  { key: 'smoke', Icon: Activity },
  { key: 'image', Icon: Container },
  { key: 'secrets', Icon: KeyRound },
  { key: 'rollback', Icon: Undo2 },
  { key: 'scheduler', Icon: CalendarClock },
  { key: 'origins', Icon: ShieldCheck },
] as const;

const OPEN_TECH_WORK = [
  'terraform',
  'staging',
  'oidc',
  'leastPrivilege',
  'consolidate',
  'sharedCache',
  'prerender',
] as const;

const QUALITY_BLOCKING_KEYS = [
  { key: 'coverage', Icon: FlaskConical },
  { key: 'lighthouse', Icon: Gauge },
  { key: 'axe', Icon: Accessibility },
  { key: 'sonar', Icon: SonarLogo },
] as const;

const QUALITY_OBSERVED_KEYS = [
  { key: 'sentry', Icon: SentryLogo },
  { key: 'posthog', Icon: PostHogLogo },
] as const;

const TEST_PRACTICE_KEYS = [
  { key: 'first', Icon: ListChecks },
  { key: 'doubles', Icon: SplitSquareHorizontal },
  { key: 'harness', Icon: ServerCog },
  { key: 'replica', Icon: Database },
  { key: 'stubs', Icon: PlugZap },
  { key: 'network', Icon: Network },
] as const;

const ARCHITECTURE_RULES = [
  'ruleComment',
  'ruleLiteral',
  'ruleBreakpoint',
  'ruleImport',
  'ruleCycle',
] as const;

export default function TechPage() {
  const { t, locale } = useTranslation();
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR').format(value);

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
    keys: readonly { key: string; Icon: FactIconComponent }[],
    values: Record<string, string> = {},
    hints: Record<string, string> = {}
  ): FactItem[] =>
    keys.map(({ key, Icon }) => ({
      key,
      icon: <Icon size={16} />,
      term: t(`tech.${group}.${key}` as TranslationKey),
      detail: values[key] ?? t(`tech.${group}.${key}Value` as TranslationKey),
      hint: hints[key] ?? t(`tech.${group}.${key}Hint` as TranslationKey),
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
              heading={t('tech.architecture.structureHeading')}
              items={iconFacts('architecture', ARCHITECTURE_STRUCTURE, {
                boundary: t('tech.architecture.boundaryValue', {
                  endpoints: TECH_METRICS.endpoints,
                }),
              })}
            />
            <p className={shared.groupHeading}>{t('tech.architecture.servicesHeading')}</p>
            <p className={shared.note}>{t('tech.architecture.servicesNote')}</p>
            <FactGrid
              items={ARCHITECTURE_SERVICES.map(({ key, Logo }) => ({
                key,
                icon: <Logo size={18} />,
                term: t(`tech.architecture.${key}` as TranslationKey),
                detail: t(`tech.architecture.${key}Value` as TranslationKey),
                hint: t(`tech.architecture.${key}Hint` as TranslationKey),
              }))}
            />
          </TechSection>

          <TechSection
            id="choices"
            eyebrow={eyebrow('choices')}
            title={t('tech.choices.title')}
            lead={t('tech.choices.lead')}
          >
            <FactGrid
              items={iconFacts('choices', CHOICE_KEYS).map((fact) => ({
                ...fact,
                trade: {
                  label: t('tech.choices.tradeLabel'),
                  text: t(`tech.choices.${fact.key}Trade` as TranslationKey),
                },
              }))}
            />
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
                loading: t('tech.ui.loadingValue', { routes: TECH_METRICS.lazyRoutes }),
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
            <p className={shared.groupHeading}>{t('tech.server.requestHeading')}</p>
            <Figure caption={t('tech.server.requestNote', { useCases: TECH_METRICS.useCases })}>
              <RequestPathDiagram />
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
            <FactGrid items={iconFacts('contract', CONTRACT_KEYS)} />
            <p className={shared.note}>
              {t('tech.contract.note', {
                checked: TECH_METRICS.contractCheckedTypes,
                total: TECH_METRICS.contractResponses,
              })}
            </p>
          </TechSection>

          <TechSection
            id="data"
            eyebrow={eyebrow('data')}
            title={t('tech.data.title')}
            lead={t('tech.data.lead')}
          >
            <Figure caption={t('tech.data.modelCaption')}>
              <DataModelDiagram />
            </Figure>
            <Figure caption={t('tech.data.caption')}>
              <UnitOfWorkDiagram />
            </Figure>
            <FactGrid
              items={iconFacts('data', DATA_KEYS, {
                uniqueness: t('tech.data.uniquenessValue', {
                  unique: TECH_METRICS.uniqueIndexes,
                }),
                expiry: t('tech.data.expiryValue', { ttl: TECH_METRICS.ttlIndexes }),
                migrations: t('tech.data.migrationsValue', {
                  migrations: TECH_METRICS.migrations,
                }),
                posters: t('tech.data.postersValue', {
                  days: TECH_METRICS.posterCacheTtlDays,
                }),
              })}
            />
          </TechSection>

          <TechSection
            id="feature"
            eyebrow={eyebrow('feature')}
            title={t('tech.feature.title')}
            lead={t('tech.feature.lead')}
          >
            <Figure caption={t('tech.feature.caption')}>
              <LetterboxdFlowDiagram />
            </Figure>
            <FactGrid items={iconFacts('feature', FEATURE_KEYS)} />
          </TechSection>

          <TechSection
            id="tests"
            eyebrow={eyebrow('tests')}
            title={t('tech.tests.title', { tests: formatNumber(TECH_METRICS.testCases) })}
            lead={t('tech.tests.lead')}
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
            <FactGrid
              items={TEST_FAMILIES.map(({ key, Icon, value }) => ({
                key,
                icon: <Icon size={16} />,
                term: t(`tech.tests.${key}` as TranslationKey),
                detail: t(`tech.tests.${key}Value` as TranslationKey, {
                  count: formatNumber(value),
                }),
                hint: t(`tech.tests.${key}Hint` as TranslationKey),
              }))}
            />
            <FactGrid
              heading={t('tech.tests.howHeading')}
              items={iconFacts('tests', TEST_PRACTICE_KEYS, {
                doubles: t('tech.tests.doublesValue', {
                  repositories: TECH_METRICS.doubledRepositories,
                }),
                network: t('tech.tests.networkValue', {
                  files: TECH_METRICS.mswTestFiles,
                }),
              })}
            />
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
            <FactGrid heading={t('tech.ci.pipelineHeading')} items={iconFacts('ci', CI_KEYS)} />
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
            id="infra"
            eyebrow={eyebrow('infra')}
            title={t('tech.infra.title')}
            lead={t('tech.infra.lead')}
          >
            <Figure caption={t('tech.infra.caption')}>
              <InfraDiagram />
            </Figure>
            <FactGrid
              items={iconFacts('infra', INFRA_KEYS, {
                secrets: t('tech.infra.secretsValue', { secrets: TECH_METRICS.deploySecrets }),
              })}
            />
          </TechSection>

          <TechSection
            id="quality"
            eyebrow={eyebrow('quality')}
            title={t('tech.quality.title')}
            lead={t('tech.quality.lead')}
          >
            <FactGrid
              heading={t('tech.quality.blockingHeading')}
              items={iconFacts(
                'quality',
                QUALITY_BLOCKING_KEYS,
                {
                  coverage: t('tech.quality.coverageValue', {
                    lines: TECH_METRICS.coverageLines,
                    functions: TECH_METRICS.coverageFunctions,
                    branches: TECH_METRICS.coverageBranches,
                  }),
                  lighthouse: t('tech.quality.lighthouseValue', {
                    pages: TECH_METRICS.lighthousePages,
                    perf: TECH_METRICS.lighthousePerformance,
                    a11y: TECH_METRICS.lighthouseAccessibility,
                    bp: TECH_METRICS.lighthouseBestPractices,
                    seo: TECH_METRICS.lighthouseSeo,
                  }),
                  axe: t('tech.quality.axeValue', { views: TECH_METRICS.a11yViews }),
                },
                {
                  lighthouse: t('tech.quality.lighthouseHint', {
                    watchlist: TECH_METRICS.lighthouseWatchlistPerformance,
                  }),
                }
              )}
            />
            <p className={shared.note}>
              <strong>{t('tech.quality.noteLead')}</strong>{' '}
              {t('tech.quality.note', { lines: TECH_METRICS.architectureScriptLines })}
            </p>
            <ul className={shared.tags}>
              {ARCHITECTURE_RULES.map((rule) => (
                <li key={rule}>
                  <TechHint label={t(`tech.quality.${rule}Hint` as TranslationKey)}>
                    <span className={shared.tag}>
                      {t(`tech.quality.${rule}` as TranslationKey)}
                    </span>
                  </TechHint>
                </li>
              ))}
            </ul>
            <FactGrid
              heading={t('tech.quality.informativeHeading')}
              items={iconFacts('quality', QUALITY_OBSERVED_KEYS)}
            />
          </TechSection>

          <TechSection
            id="production"
            eyebrow={eyebrow('production')}
            title={t('tech.production.title')}
            lead={t('tech.production.lead')}
          >
            <FactGrid
              items={iconFacts('production', SECURITY_KEYS, {
                abuse: t('tech.production.abuseValue', {
                  policies: TECH_METRICS.rateLimitPolicies,
                }),
              })}
            />
          </TechSection>

          <TechSection
            id="method"
            eyebrow={eyebrow('method')}
            title={t('tech.method.title')}
            lead={t('tech.method.lead')}
          >
            <Figure caption={t('tech.method.productCaption')}>
              <ProductFlowDiagram />
            </Figure>
            <Figure caption={t('tech.method.featureCaption')}>
              <FeatureFlowDiagram />
            </Figure>
            <Figure caption={t('tech.method.toolingCaption')}>
              <AssistantToolingDiagram />
            </Figure>
            <p className={shared.note}>
              <strong>{t('tech.method.mcpNoteLead')}</strong>{' '}
              {t('tech.method.mcpNote', { tools: TECH_METRICS.assistantTools })}
            </p>
            <Figure caption={t('tech.method.bugCaption')}>
              <BugFlowDiagram />
            </Figure>
            <FactGrid
              items={METHOD_CARDS.map(({ key, Icon }) => ({
                key,
                icon: <Icon size={16} />,
                term: t(`tech.method.${key}Title` as TranslationKey),
                detail:
                  key === 'arbitration'
                    ? t('tech.method.arbitrationText', { jobs: TECH_METRICS.ciJobs })
                    : t(`tech.method.${key}Text` as TranslationKey),
                hint: t(`tech.method.${key}Hint` as TranslationKey),
              }))}
            />
          </TechSection>

          <TechSection
            id="trajectory"
            eyebrow={eyebrow('trajectory')}
            title={t('tech.trajectory.title', {
              months: TECH_METRICS.monthsActive,
              shipped: SHIPPED_MILESTONES,
            })}
            lead={t('tech.trajectory.lead', {
              commits: TECH_METRICS.commits,
              planned: PLANNED_MILESTONES,
            })}
          >
            <TechTimeline />
            <p className={shared.groupHeading}>{t('tech.trajectory.techHeading')}</p>
            <p className={shared.note}>{t('tech.trajectory.techLead')}</p>
            <ul className={shared.tags}>
              {OPEN_TECH_WORK.map((item) => (
                <li key={item}>
                  <TechHint label={t(`tech.trajectory.${item}Hint` as TranslationKey)}>
                    <span className={shared.tag}>
                      {t(`tech.trajectory.${item}` as TranslationKey)}
                    </span>
                  </TechHint>
                </li>
              ))}
            </ul>
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
