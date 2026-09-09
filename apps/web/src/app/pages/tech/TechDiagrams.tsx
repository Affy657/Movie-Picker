import {
  Container,
  FlaskConical,
  Gauge,
  Globe,
  KeyRound,
  MousePointerClick,
  PackageSearch,
  Ruler,
  Workflow,
} from 'lucide-react';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { TECH_METRICS } from './generated/techMetrics';
import {
  AnthropicLogo,
  AwsLogo,
  ClaudeLogo,
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
  TypeScriptLogo,
  ViteLogo,
  WebPushLogo,
} from './TechLogos';
import styles from './techShared.module.css';

const SURFACE = 'var(--surface-sunken)';
const SURFACE_PLAIN = 'var(--color-surface)';
const BORDER = 'var(--color-border)';
const TEXT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const META = 'var(--color-meta)';
const PRIMARY = 'var(--color-primary)';
const PRIMARY_SOFT = 'var(--color-primary-soft)';
const DANGER = 'var(--color-error)';
const DANGER_SOFT = 'color-mix(in srgb, var(--color-error) 10%, transparent)';
const SUCCESS = 'var(--color-success)';
const SUCCESS_SOFT = 'color-mix(in srgb, var(--color-success) 14%, transparent)';
const WARN = 'var(--color-badge-upcoming-text)';
const WARN_SOFT = 'var(--color-badge-upcoming-bg)';

function ArrowMarker({ id, fill }: Readonly<{ id: string; fill: string }>) {
  return (
    <marker id={id} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
      <path d="M0,0 L9,4.5 L0,9 z" fill={fill} />
    </marker>
  );
}

const EXTERNAL_SERVICES = [
  { key: 'tmdb', name: 'TMDB', Logo: TmdbLogo },
  { key: 'letterboxd', name: 'Letterboxd', Logo: LetterboxdLogo },
  { key: 'google', name: 'OAuth Google', Logo: GoogleLogo },
  { key: 'github', name: 'OAuth GitHub', Logo: GitHubLogo },
  { key: 'push', name: 'Web Push VAPID', Logo: WebPushLogo },
  { key: 'resend', name: 'Resend', Logo: ResendLogo },
  { key: 'issues', name: 'GitHub Issues', Logo: GitHubLogo },
] as const;

const EXTERNAL_SERVICES_FIRST_COLUMN = 4;

const INBOUND_CALLERS = [
  { key: 'kofi', name: 'Ko-fi', Logo: KofiLogo },
  { key: 'scheduler', name: 'Cloud Scheduler', Logo: GoogleCloudLogo },
] as const;

export function ArchitectureDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 380" role="img" aria-labelledby="tech-arch-title">
      <title id="tech-arch-title">{t('tech.diagram.architectureTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-arch" fill={META} />
      </defs>

      <rect x="8" y="40" width="182" height="118" rx="12" fill={SURFACE} stroke={BORDER} />
      <ReactLogo x={66} y={54} size={18} />
      <TypeScriptLogo x={90} y={54} size={18} />
      <ViteLogo x={114} y={54} size={18} />
      <text x="99" y="96" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.browser')}
      </text>
      <text x="99" y="116" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.browserPwa')}
      </text>
      <text x="99" y="132" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.browserWorker')}
      </text>

      <line
        x1="194"
        y1="80"
        x2="244"
        y2="80"
        stroke={META}
        strokeWidth="1.5"
        markerEnd="url(#tech-arrow-arch)"
      />
      <text x="219" y="70" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.assets')}
      </text>

      <line
        x1="194"
        y1="132"
        x2="246"
        y2="248"
        stroke={PRIMARY}
        strokeWidth="2"
        markerEnd="url(#tech-arrow-arch)"
      />
      <text x="200" y="196" className={styles.svgSub} fill={PRIMARY}>
        /api/v1
      </text>

      <rect x="250" y="40" width="210" height="118" rx="12" fill={SURFACE} stroke={BORDER} />
      <AwsLogo x={345} y={54} size={20} />
      <text x="355" y="96" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.cdn')}
      </text>
      <text x="355" y="116" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.cdnBundle')}
      </text>
      <text x="355" y="132" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.cdnFallback')}
      </text>

      <rect x="250" y="230" width="210" height="118" rx="12" fill={SURFACE} stroke={BORDER} />
      <DotNetLogo x={331} y={244} size={20} />
      <GoogleCloudLogo x={359} y={244} size={20} />
      <text x="355" y="286" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.api')}
      </text>
      <text x="355" y="306" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.apiHost')}
      </text>
      <text x="355" y="322" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.apiEndpoints', { endpoints: String(TECH_METRICS.endpoints) })}
      </text>

      <line
        x1="464"
        y1="289"
        x2="514"
        y2="289"
        stroke={META}
        strokeWidth="1.5"
        markerEnd="url(#tech-arrow-arch)"
      />

      <rect x="520" y="230" width="352" height="118" rx="12" fill={SURFACE} stroke={BORDER} />
      <MongoLogo x={686} y={244} size={20} />
      <text x="696" y="286" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.database')}
      </text>
      <text x="696" y="306" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.databaseReplica')}
      </text>
      <text x="696" y="322" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.databaseTransactions')}
      </text>

      <line
        x1="400"
        y1="226"
        x2="596"
        y2="172"
        stroke={META}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd="url(#tech-arrow-arch)"
      />
      <text x="486" y="182" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.outboundCalls')}
      </text>

      <rect
        x="520"
        y="24"
        width="352"
        height="142"
        rx="12"
        fill="none"
        stroke={BORDER}
        strokeDasharray="4 3"
      />
      <text x="696" y="52" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.externalServices')}
      </text>
      {EXTERNAL_SERVICES.map((service, index) => {
        const firstColumn = index < EXTERNAL_SERVICES_FIRST_COLUMN;
        const rowY = 82 + (firstColumn ? index : index - EXTERNAL_SERVICES_FIRST_COLUMN) * 22;
        const logoX = firstColumn ? 540 : 706;
        return (
          <g key={service.key}>
            <service.Logo x={logoX} y={rowY - 12} size={16} />
            <text x={logoX + 24} y={rowY} className={styles.svgLabel} fill={MUTED}>
              {service.name}
            </text>
          </g>
        );
      })}

      <rect
        x="8"
        y="230"
        width="182"
        height="118"
        rx="12"
        fill="none"
        stroke={BORDER}
        strokeDasharray="4 3"
      />
      <text x="99" y="258" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.inboundCalls')}
      </text>
      {INBOUND_CALLERS.map((caller, index) => {
        const rowY = 292 + index * 28;
        return (
          <g key={caller.key}>
            <caller.Logo x={26} y={rowY - 12} size={16} />
            <text x="50" y={rowY} className={styles.svgLabel} fill={MUTED}>
              {caller.name}
            </text>
          </g>
        );
      })}
      <line
        x1="194"
        y1="289"
        x2="244"
        y2="289"
        stroke={META}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd="url(#tech-arrow-arch)"
      />
    </svg>
  );
}

export function LayersDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 340" role="img" aria-labelledby="tech-layers-title">
      <title id="tech-layers-title">{t('tech.diagram.layersTitle')}</title>

      <rect x="20" y="20" width="560" height="300" rx="16" fill={SURFACE} stroke={BORDER} />
      <text x="44" y="48" className={styles.svgLabel} fill={META}>
        {t('tech.diagram.controllers')}
      </text>
      <text x="44" y="68" className={styles.svgSub} fill={META}>
        {t('tech.diagram.controllersSub', { controllers: String(TECH_METRICS.controllers) })}
      </text>

      <rect x="70" y="84" width="460" height="212" rx="14" fill={SURFACE_PLAIN} stroke={BORDER} />
      <text x="94" y="112" className={styles.svgLabel} fill={META}>
        {t('tech.diagram.infrastructure')}
      </text>
      <text x="94" y="132" className={styles.svgSub} fill={META}>
        {t('tech.diagram.infrastructureSub')}
      </text>

      <rect x="122" y="148" width="356" height="124" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="146" y="176" className={styles.svgLabel} fill={META}>
        {t('tech.diagram.application')}
      </text>
      <text x="146" y="196" className={styles.svgSub} fill={META}>
        {t('tech.diagram.applicationSub', {
          useCases: String(TECH_METRICS.useCases),
          ports: String(TECH_METRICS.ports),
        })}
      </text>

      <rect
        x="176"
        y="210"
        width="250"
        height="50"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <text x="301" y="232" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.domainLayer')}
      </text>
      <text x="301" y="250" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.domainLayerSub')}
      </text>

      <path d="M 640 60 L 640 280" stroke={PRIMARY} strokeWidth="2" fill="none" />
      <path d="M 640 280 L 634 268 L 646 268 z" fill={PRIMARY} />
      <text x="662" y="130" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.inwardLine1')}
      </text>
      <text x="662" y="150" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.inwardLine2')}
      </text>
      <text x="662" y="170" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.inwardLine3')}
      </text>
      <DotNetLogo x={662} y={236} size={18} />
      <MongoLogo x={690} y={236} size={18} />
      <text x="662" y="204" className={styles.svgSub} fill={META}>
        {t('tech.diagram.inwardNote1')}
      </text>
      <text x="662" y="220" className={styles.svgSub} fill={META}>
        {t('tech.diagram.inwardNote2')}
      </text>
    </svg>
  );
}

export function ContractDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 220" role="img" aria-labelledby="tech-contract-title">
      <title id="tech-contract-title">{t('tech.diagram.contractTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-contract" fill={META} />
      </defs>

      <rect x="10" y="46" width="170" height="72" rx="12" fill={SURFACE} stroke={BORDER} />
      <DotNetLogo x={86} y={58} size={18} />
      <text x="95" y="92" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.contractApi')}
      </text>
      <text x="95" y="108" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.contractApiSub')}
      </text>

      <line
        x1="182"
        y1="82"
        x2="228"
        y2="82"
        stroke={META}
        strokeWidth="1.5"
        markerEnd="url(#tech-arrow-contract)"
      />

      <rect x="234" y="46" width="180" height="72" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="324" y="78" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.contractFile')}
      </text>
      <text x="324" y="96" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.contractFileSub')}
      </text>

      <line
        x1="416"
        y1="82"
        x2="462"
        y2="82"
        stroke={META}
        strokeWidth="1.5"
        markerEnd="url(#tech-arrow-contract)"
      />

      <rect x="468" y="46" width="180" height="72" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="558" y="78" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.contractTypes')}
      </text>
      <text x="558" y="96" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.contractTypesSub')}
      </text>

      <line
        x1="650"
        y1="82"
        x2="696"
        y2="82"
        stroke={PRIMARY}
        strokeWidth="2"
        markerEnd="url(#tech-arrow-contract)"
      />

      <rect
        x="702"
        y="34"
        width="168"
        height="96"
        rx="12"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <text x="786" y="66" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.contractTest')}
      </text>
      <text x="786" y="86" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.contractTestSub1')}
      </text>
      <text x="786" y="102" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.contractTestSub2')}
      </text>

      <line
        x1="786"
        y1="130"
        x2="786"
        y2="166"
        stroke={DANGER}
        strokeWidth="2"
        markerEnd="url(#tech-arrow-contract)"
      />
      <rect x="640" y="170" width="230" height="38" rx="10" fill={DANGER_SOFT} stroke={DANGER} />
      <text x="755" y="194" textAnchor="middle" className={styles.svgLabel} fill={DANGER}>
        {t('tech.diagram.contractFail')}
      </text>

      <rect
        x="10"
        y="170"
        width="480"
        height="38"
        rx="10"
        fill={SURFACE}
        stroke={BORDER}
        strokeDasharray="4 3"
      />
      <text x="30" y="194" className={styles.svgSub} fill={META}>
        {t('tech.diagram.contractDrift')}
      </text>
    </svg>
  );
}

export function TestPyramidDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 215" role="img" aria-labelledby="tech-testpyramid-title">
      <title id="tech-testpyramid-title">{t('tech.diagram.testsPyramidTitle')}</title>

      <rect x="340" y="16" width="200" height="50" rx="8" fill={PRIMARY_SOFT} stroke={PRIMARY} />
      <text x="440" y="47" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.testsE2e', {
          count: String(TECH_METRICS.e2eTestCases),
          files: String(TECH_METRICS.e2eScenarios),
        })}
      </text>
      <text x="740" y="47" className={styles.svgSub} fill={META}>
        {t('tech.diagram.testsE2eLabel')}
      </text>

      <rect x="270" y="76" width="340" height="50" rx="8" fill={SURFACE} stroke={BORDER} />
      <text x="440" y="107" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.testsIntegration', {
          count: String(TECH_METRICS.integrationTestCases),
        })}
      </text>
      <text x="740" y="107" className={styles.svgSub} fill={META}>
        {t('tech.diagram.testsIntegrationLabel')}
      </text>

      <rect x="170" y="136" width="540" height="50" rx="8" fill={SURFACE} stroke={BORDER} />
      <text x="440" y="167" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.testsUnit', {
          total: new Intl.NumberFormat('fr-FR').format(TECH_METRICS.unitTestCases),
          web: new Intl.NumberFormat('fr-FR').format(TECH_METRICS.webTestCases),
          api: new Intl.NumberFormat('fr-FR').format(TECH_METRICS.apiUnitTestCases),
        })}
      </text>
      <text x="740" y="167" className={styles.svgSub} fill={META}>
        {t('tech.diagram.testsUnitLabel')}
      </text>
    </svg>
  );
}

const CI_LEFT_JOBS = [
  { key: 'ciGitleaks', Logo: KeyRound },
  { key: 'ciLintWorkflows', Logo: Workflow },
  { key: 'ciLint', Logo: Ruler },
  { key: 'ciAudit', Logo: PackageSearch },
  { key: 'ciTest', Logo: FlaskConical },
  { key: 'ciTestMongo', Logo: MongoLogo },
  { key: 'ciLighthouse', Logo: Gauge },
  { key: 'ciE2e', Logo: MousePointerClick },
  { key: 'ciE2eMongo', Logo: MongoLogo },
] as const;

const ciJobCenter = (index: number) => 31 + index * 42;
const CI_TO_IMAGE = [0, 1, 2, 3, 5];

export function CiGraphDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 400" role="img" aria-labelledby="tech-ci-title">
      <title id="tech-ci-title">{t('tech.diagram.ciTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-ci" fill={BORDER} />
      </defs>

      <rect x="10" y="176" width="112" height="46" rx="10" fill={SURFACE} stroke={BORDER} />
      <GitHubLogo x={22} y={191} size={16} />
      <text x="46" y="204" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciChanges')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        {CI_LEFT_JOBS.map((job, index) => (
          <path
            key={job.key}
            d={`M 124 ${182 + index * 4} C 160 ${182 + index * 4}, 160 ${ciJobCenter(index)}, 196 ${ciJobCenter(index)}`}
          />
        ))}
      </g>

      {CI_LEFT_JOBS.map((job, index) => (
        <g key={job.key}>
          <rect
            x="200"
            y={14 + index * 42}
            width="150"
            height="34"
            rx="9"
            fill={SURFACE}
            stroke={BORDER}
          />
          <job.Logo x={208} y={23 + index * 42} size={16} color={META} />
          <text x="230" y={36 + index * 42} className={styles.svgLabel} fill={MUTED}>
            {t(`tech.diagram.${job.key}` as 'tech.diagram.ciGitleaks')}
          </text>
        </g>
      ))}

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        {CI_TO_IMAGE.map((index, rank) => (
          <path
            key={index}
            d={`M 352 ${ciJobCenter(index)} C 400 ${ciJobCenter(index)}, 400 ${68 + rank * 8}, 442 ${68 + rank * 8}`}
          />
        ))}
        <path d="M 352 199 C 400 199, 400 141, 442 141" />
      </g>

      <rect x="446" y="60" width="112" height="46" rx="10" fill={SURFACE} stroke={BORDER} />
      <Container x={460} y={75} size={16} color={META} />
      <text x="484" y="88" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciDocker')}
      </text>

      <rect x="446" y="118" width="112" height="46" rx="10" fill={SURFACE} stroke={BORDER} />
      <SonarLogo x={460} y={133} size={16} />
      <text x="484" y="146" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciSonar')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        <path d="M 560 83 C 596 83, 596 118, 632 118" />
        <path d="M 560 141 C 596 141, 596 126, 632 126" />
        <path d="M 560 152 C 596 152, 596 258, 632 258" />
        <path d="M 352 283 C 500 283, 500 266, 632 266" />
        <path d="M 352 325 C 500 325, 500 138, 632 138" />
        <path d="M 352 325 C 500 325, 500 274, 632 274" />
        <path d="M 352 367 C 500 367, 500 146, 632 146" />
        <path d="M 352 367 C 500 367, 500 282, 632 282" />
      </g>

      <rect
        x="636"
        y="110"
        width="130"
        height="44"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <GoogleCloudLogo x={650} y={124} size={16} />
      <text x="674" y="137" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciDeployApi')}
      </text>

      <rect
        x="636"
        y="250"
        width="130"
        height="44"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <AwsLogo x={650} y={264} size={16} />
      <text x="674" y="277" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciDeployFront')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        <path d="M 768 132 C 788 132, 788 190, 800 190" />
        <path d="M 768 272 C 788 272, 788 216, 800 216" />
      </g>
      <rect x="804" y="180" width="68" height="46" rx="10" fill={SUCCESS_SOFT} stroke={SUCCESS} />
      <text x="838" y="202" textAnchor="middle" className={styles.svgSub} fill={SUCCESS}>
        {t('tech.diagram.ciGuard1')}
      </text>
      <text x="838" y="216" textAnchor="middle" className={styles.svgSub} fill={SUCCESS}>
        {t('tech.diagram.ciGuard2')}
      </text>
    </svg>
  );
}

const MCP_TOOLS = [
  { key: 'github', name: 'GitHub', reads: 'tech.diagram.mcpGithub', Logo: GitHubLogo },
  { key: 'gcp', name: 'Google Cloud', reads: 'tech.diagram.mcpGcp', Logo: GoogleCloudLogo },
  { key: 'aws', name: 'AWS', reads: 'tech.diagram.mcpAws', Logo: AwsLogo },
  { key: 'sonar', name: 'SonarCloud', reads: 'tech.diagram.mcpSonar', Logo: SonarLogo },
  { key: 'sentry', name: 'Sentry', reads: 'tech.diagram.mcpSentry', Logo: SentryLogo },
  { key: 'posthog', name: 'PostHog', reads: 'tech.diagram.mcpPosthog', Logo: PostHogLogo },
  { key: 'mongo', name: 'MongoDB', reads: 'tech.diagram.mcpMongo', Logo: MongoLogo },
  { key: 'resend', name: 'Resend', reads: 'tech.diagram.mcpResend', Logo: ResendLogo },
].map((tool, index) => ({ ...tool, column: 8 + index * 109 })) as readonly {
  key: string;
  name: string;
  reads: TranslationKey;
  Logo: (props: { x: number; y: number; size: number }) => React.ReactElement;
  column: number;
}[];

const SKILLS = [
  { key: 'critique', command: '/design:design-critique', when: 'tech.diagram.skillCritiqueWhen' },
  {
    key: 'strategy',
    command: '/engineering:testing-strategy',
    when: 'tech.diagram.skillStrategyWhen',
  },
  { key: 'verify', command: '/verify', when: 'tech.diagram.skillVerifyWhen' },
  { key: 'review', command: '/engineering:code-review', when: 'tech.diagram.skillReviewWhen' },
  { key: 'debt', command: '/engineering:tech-debt', when: 'tech.diagram.skillDebtWhen' },
].map((skill, index) => ({
  ...skill,
  column: 10 + (index % 3) * 290,
  row: Math.floor(index / 3),
})) as readonly {
  key: string;
  command: string;
  when: TranslationKey;
  column: number;
  row: number;
}[];

const BOX_W = 160;
const BOX_H = 44;

function FlowBox({
  x,
  y,
  label,
  sub,
  tone = 'plain',
  width = BOX_W,
}: Readonly<{
  x: number;
  y: number;
  label: string;
  sub?: string;
  tone?: 'plain' | 'gate' | 'tdd' | 'done';
  width?: number;
}>) {
  const fill = { plain: SURFACE, gate: WARN_SOFT, tdd: SURFACE, done: SUCCESS_SOFT }[tone];
  const stroke = { plain: BORDER, gate: WARN, tdd: PRIMARY, done: SUCCESS }[tone];
  const subFill = { plain: META, gate: WARN, tdd: PRIMARY, done: SUCCESS }[tone];
  const labelFill = tone === 'done' ? SUCCESS : TEXT;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={BOX_H}
        rx="10"
        fill={fill}
        stroke={stroke}
        strokeWidth={tone === 'plain' ? 1 : 1.5}
      />
      <text
        x={x + width / 2}
        y={sub ? y + 21 : y + 27}
        textAnchor="middle"
        className={styles.svgLabel}
        fill={labelFill}
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + width / 2}
          y={y + 36}
          textAnchor="middle"
          className={styles.svgSub}
          fill={subFill}
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

const PRODUCT_STEPS = [
  { key: 'flowSignals', sub: 'flowSignalsSub', x: 44 },
  { key: 'flowBrainstorm', sub: 'flowBrainstormSub', x: 324 },
  { key: 'flowRoadmap', sub: 'flowRoadmapSub', x: 604 },
] as const;

export function ProductFlowDiagram() {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 880 218" role="img" aria-labelledby="tech-productflow-title">
      <title id="tech-productflow-title">{t('tech.diagram.productFlowTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-product-flow" fill={BORDER} />
      </defs>

      <text x="10" y="20" className={styles.svgSub} fill={META}>
        {t('tech.diagram.productFlowLabel')}
      </text>

      <g stroke={BORDER} strokeWidth="1.4" fill="none" markerEnd="url(#tech-arrow-product-flow)">
        <path d="M 284 56 L 318 56" />
        <path d="M 564 56 L 598 56" />
      </g>

      {PRODUCT_STEPS.map((step) => (
        <FlowBox
          key={step.key}
          x={step.x}
          y={34}
          width={240}
          label={t(`tech.diagram.${step.key}` as TranslationKey)}
          sub={t(`tech.diagram.${step.sub}` as TranslationKey)}
        />
      ))}

      <g stroke={PRIMARY} strokeWidth="1.2" strokeDasharray="4 3" fill="none">
        {PRODUCT_STEPS.map((step) => (
          <path key={step.key} d={`M ${step.x + 120} 78 C ${step.x + 120} 108, 440 108, 440 128`} />
        ))}
      </g>

      <rect
        x="240"
        y="128"
        width="400"
        height="48"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <AnthropicLogo x={258} y={142} size={20} />
      <text x="288" y="150" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.frontierModel')}
      </text>
      <text x="288" y="166" className={styles.svgSub} fill={META}>
        {t('tech.diagram.frontierModelSub')}
      </text>

      <text x="866" y="206" textAnchor="end" className={styles.svgSub} fill={META}>
        {t('tech.diagram.flowHandoff')}
      </text>
    </svg>
  );
}

const DEV_PHASES = [
  {
    key: 'phaseSpec',
    steps: [
      { key: 'devNeed', approved: false },
      { key: 'devScoping', approved: true },
      { key: 'devMockup', approved: true },
      { key: 'devPlan', approved: true },
    ],
  },
  {
    key: 'phaseBuild',
    steps: [
      { key: 'devTdd', approved: false },
      { key: 'devVerify', approved: false },
      { key: 'devLocalCheck', approved: true },
    ],
  },
  {
    key: 'phaseReview',
    steps: [
      { key: 'devReview', approved: false },
      { key: 'devFixes', approved: false },
      { key: 'devPrePush', approved: false },
    ],
  },
  {
    key: 'phaseShip',
    steps: [
      { key: 'devPush', approved: false },
      { key: 'devCi', approved: false },
      { key: 'devMerge', approved: false },
      { key: 'devDeploy', approved: false },
    ],
  },
] as const;

const PHASE_X = [10, 230, 450, 670] as const;
const PHASE_W = 200;

export function FeatureFlowDiagram() {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 880 306" role="img" aria-labelledby="tech-featureflow-title">
      <title id="tech-featureflow-title">{t('tech.diagram.featureFlowTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-feature" fill={BORDER} />
        <ArrowMarker id="tech-arrow-back" fill={PRIMARY} />
      </defs>

      <text x="10" y="20" className={styles.svgSub} fill={META}>
        {t('tech.diagram.featureFlowLabel')}
      </text>

      <g stroke={BORDER} strokeWidth="1.4" fill="none" markerEnd="url(#tech-arrow-feature)">
        {PHASE_X.slice(0, 3).map((x) => (
          <path key={x} d={`M ${x + PHASE_W} 100 L ${x + PHASE_W + 14} 100`} />
        ))}
      </g>

      {DEV_PHASES.map((phase, phaseIndex) => {
        const x = PHASE_X[phaseIndex] as number;
        return (
          <g key={phase.key}>
            <rect
              x={x}
              y="34"
              width={PHASE_W}
              height="132"
              rx="10"
              fill={SURFACE}
              stroke={BORDER}
            />
            <text x={x + 16} y="56" className={styles.svgSub} fill={PRIMARY}>
              {`0${phaseIndex + 1}`}
            </text>
            <text x={x + 40} y="56" className={styles.svgLabel} fill={TEXT}>
              {t(`tech.diagram.${phase.key}` as TranslationKey)}
            </text>
            <line x1={x + 16} y1="66" x2={x + PHASE_W - 16} y2="66" stroke={BORDER} />
            {phase.steps.map((step, stepIndex) => (
              <g key={step.key}>
                {step.approved ? (
                  <rect
                    x={x + 16}
                    y={82 + stepIndex * 22}
                    width="8"
                    height="8"
                    rx="2"
                    fill={WARN_SOFT}
                    stroke={WARN}
                  />
                ) : (
                  <circle cx={x + 20} cy={86 + stepIndex * 22} r="2" fill={META} />
                )}
                <text
                  x={x + 32}
                  y={90 + stepIndex * 22}
                  className={styles.svgSub}
                  fill={step.approved ? TEXT : MUTED}
                >
                  {t(`tech.diagram.${step.key}` as TranslationKey, {
                    jobs: TECH_METRICS.ciJobs,
                  })}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      <rect x="450" y="196" width="420" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="466" y="218" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.devSignals')}
      </text>
      <text x="466" y="232" className={styles.svgSub} fill={META}>
        {t('tech.diagram.devSignalsSub')}
      </text>

      <g stroke={BORDER} strokeWidth="1.4" fill="none" markerEnd="url(#tech-arrow-feature)">
        <path d="M 770 166 L 770 190" />
      </g>

      <g
        stroke={PRIMARY}
        strokeWidth="1.4"
        strokeDasharray="5 4"
        fill="none"
        markerEnd="url(#tech-arrow-back)"
      >
        <path d="M 450 218 L 24 218 L 24 174" />
      </g>
      <text x="14" y="240" className={styles.svgSub} fill={PRIMARY}>
        {t('tech.diagram.flowLoopProduct')}
      </text>

      <rect x="10" y="272" width="8" height="8" rx="2" fill={WARN_SOFT} stroke={WARN} />
      <text x="30" y="280" className={styles.svgSub} fill={WARN}>
        {t('tech.diagram.flowNoteDev')}
      </text>
    </svg>
  );
}

export function AssistantToolingDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 372" role="img" aria-labelledby="tech-tooling-title">
      <title id="tech-tooling-title">{t('tech.diagram.toolingTitle')}</title>

      <text x="10" y="20" className={styles.svgSub} fill={META}>
        {t('tech.diagram.skillsLabel')}
      </text>

      {SKILLS.map((skill) => {
        const y = 34 + skill.row * 62;
        return (
          <g key={skill.key}>
            <rect
              x={skill.column}
              y={y}
              width="280"
              height="52"
              rx="10"
              fill={SURFACE}
              stroke={BORDER}
            />
            <AnthropicLogo x={skill.column + 14} y={y + 10} size={16} />
            <text x={skill.column + 38} y={y + 23} className={styles.svgLabel} fill={TEXT}>
              {skill.command}
            </text>
            <text x={skill.column + 38} y={y + 40} className={styles.svgSub} fill={META}>
              {t(skill.when)}
            </text>
          </g>
        );
      })}

      <line x1="10" y1="184" x2="870" y2="184" stroke={BORDER} strokeDasharray="4 4" />
      <text x="10" y="208" className={styles.svgSub} fill={META}>
        {t('tech.diagram.mcpLabel')}
      </text>

      <rect
        x="374"
        y="222"
        width="132"
        height="42"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <ClaudeLogo x={386} y={233} size={20} />
      <text x="414" y="248" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.mcpAssistant')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" strokeDasharray="4 3" fill="none">
        {MCP_TOOLS.map((tool) => (
          <path
            key={tool.key}
            d={`M 440 264 C 440 278, ${tool.column + 49} 274, ${tool.column + 49} 284`}
          />
        ))}
      </g>

      {MCP_TOOLS.map((tool) => (
        <g key={tool.key}>
          <rect
            x={tool.column}
            y="284"
            width="98"
            height="62"
            rx="10"
            fill={SURFACE}
            stroke={BORDER}
          />
          <tool.Logo x={tool.column + 40} y={292} size={18} />
          <text
            x={tool.column + 49}
            y="326"
            textAnchor="middle"
            className={styles.svgLabel}
            fill={TEXT}
          >
            {tool.name}
          </text>
          <text
            x={tool.column + 49}
            y="341"
            textAnchor="middle"
            className={styles.svgSub}
            fill={META}
          >
            {t(tool.reads)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function BugFlowDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 150" role="img" aria-labelledby="tech-bugflow-title">
      <title id="tech-bugflow-title">{t('tech.diagram.bugFlowTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-bug" fill={BORDER} />
      </defs>
      <text x="10" y="24" className={styles.svgSub} fill={META}>
        {t('tech.diagram.bugFlowLabel')}
      </text>

      <g stroke={BORDER} strokeWidth="1.4" fill="none" markerEnd="url(#tech-arrow-bug)">
        <path d="M 172 84 L 204 84" />
        <path d="M 366 84 L 398 84" />
        <path d="M 542 84 L 574 84" />
        <path d="M 718 84 L 750 84" />
      </g>

      <rect x="10" y="62" width="162" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="91" y="89" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.bugReproduce')}
      </text>

      <rect
        x="204"
        y="62"
        width="162"
        height="44"
        rx="10"
        fill={DANGER_SOFT}
        stroke={DANGER}
        strokeWidth="1.5"
      />
      <text x="285" y="83" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.bugFailingTest')}
      </text>
      <text x="285" y="98" textAnchor="middle" className={styles.svgSub} fill={DANGER}>
        {t('tech.diagram.bugFailingTestSub')}
      </text>

      <rect x="398" y="62" width="144" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="470" y="89" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.bugFix')}
      </text>

      <rect
        x="574"
        y="62"
        width="144"
        height="44"
        rx="10"
        fill={SUCCESS_SOFT}
        stroke={SUCCESS}
        strokeWidth="1.5"
      />
      <text x="646" y="89" textAnchor="middle" className={styles.svgLabel} fill={SUCCESS}>
        {t('tech.diagram.bugGreen')}
      </text>

      <rect x="750" y="62" width="120" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="810" y="83" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.bugNote')}
      </text>
      <text x="810" y="98" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.bugNoteSub')}
      </text>
    </svg>
  );
}

const FRONT_DOMAINS = [
  'domainAuth',
  'domainEvents',
  'domainMovies',
  'domainWatchlist',
  'domainNotifications',
  'domainProfiles',
  'domainLetterboxd',
] as const;

const FRONT_STACK = [
  { name: `React ${TECH_METRICS.reactMajor}`, x: 66, width: 120, Logo: ReactLogo },
  { name: `TypeScript ${TECH_METRICS.typescriptMajor}`, x: 198, width: 146, Logo: TypeScriptLogo },
  { name: `Vite ${TECH_METRICS.viteMajor}`, x: 356, width: 110, Logo: ViteLogo },
  { name: `React Router ${TECH_METRICS.routerMajor}`, x: 478, width: 150, Logo: null },
  { name: `TanStack Query ${TECH_METRICS.queryMajor}`, x: 640, width: 158, Logo: null },
] as const;

export function FrontGraphDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 298" role="img" aria-labelledby="tech-frontgraph-title">
      <title id="tech-frontgraph-title">{t('tech.diagram.frontGraphTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-front" fill={BORDER} />
      </defs>
      <text x="10" y="20" className={styles.svgSub} fill={META}>
        {t('tech.diagram.frontGraphLabel')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-front)">
        {FRONT_DOMAINS.map((domain, index) => {
          const from = 66 + index * 125;
          const to = 240 + index * 68;
          return <path key={domain} d={`M ${from} 90 C ${from} 122, ${to} 118, ${to} 148`} />;
        })}
      </g>

      {FRONT_DOMAINS.map((domain, index) => (
        <g key={domain}>
          <rect
            x={10 + index * 125}
            y="46"
            width="112"
            height="44"
            rx="10"
            fill={SURFACE}
            stroke={BORDER}
          />
          <text
            x={66 + index * 125}
            y="73"
            textAnchor="middle"
            className={styles.svgLabel}
            fill={TEXT}
          >
            {t(`tech.diagram.${domain}` as 'tech.diagram.domainAuth')}
          </text>
        </g>
      ))}

      <rect
        x="190"
        y="154"
        width="500"
        height="56"
        rx="12"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <text x="440" y="180" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.sharedCore', { components: String(TECH_METRICS.sharedComponents) })}
      </text>
      <text x="440" y="198" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.sharedCoreSub')}
      </text>

      <text x="10" y="240" className={styles.svgSub} fill={META}>
        {t('tech.diagram.stackLabel')}
      </text>

      {FRONT_STACK.map((entry) => (
        <g key={entry.name}>
          <rect
            x={entry.x}
            y="250"
            width={entry.width}
            height="36"
            rx="8"
            fill={SURFACE}
            stroke={BORDER}
          />
          {entry.Logo ? <entry.Logo x={entry.x + 12} y={260} size={16} /> : null}
          <text
            x={entry.x + (entry.Logo ? 36 : 14)}
            y="273"
            className={styles.svgLabel}
            fill={TEXT}
          >
            {entry.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

const DELETED_COLLECTIONS = [
  'users',
  'events',
  'movies',
  'votes',
  'watchlists',
  'notifications',
  'follows',
  'sessions',
] as const;

export function UnitOfWorkDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 250" role="img" aria-labelledby="tech-unitofwork-title">
      <title id="tech-unitofwork-title">{t('tech.diagram.unitOfWorkTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-uow" fill={BORDER} />
        <ArrowMarker id="tech-arrow-uow-ok" fill={SUCCESS} />
        <ArrowMarker id="tech-arrow-uow-ko" fill={DANGER} />
      </defs>
      <text x="10" y="20" className={styles.svgSub} fill={META}>
        {t('tech.diagram.unitOfWorkLabel')}
      </text>

      <rect x="8" y="104" width="150" height="48" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="83" y="133" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        DELETE /auth/me
      </text>

      <line
        x1="160"
        y1="128"
        x2="184"
        y2="128"
        stroke={BORDER}
        strokeWidth="1.4"
        markerEnd="url(#tech-arrow-uow)"
      />

      <rect
        x="190"
        y="42"
        width="440"
        height="172"
        rx="14"
        fill="none"
        stroke={PRIMARY}
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <text x="410" y="68" textAnchor="middle" className={styles.svgLabel} fill={PRIMARY}>
        {t('tech.diagram.unitOfWorkEnvelope')}
      </text>

      {DELETED_COLLECTIONS.map((collection, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        return (
          <g key={collection}>
            <rect
              x={206 + column * 106}
              y={86 + row * 48}
              width="96"
              height="36"
              rx="8"
              fill={SURFACE}
              stroke={BORDER}
            />
            <text
              x={254 + column * 106}
              y={109 + row * 48}
              textAnchor="middle"
              className={styles.svgSub}
              fill={MUTED}
            >
              {collection}
            </text>
          </g>
        );
      })}

      <text x="410" y="200" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.unitOfWorkCollections')}
      </text>

      <g strokeWidth="1.6" fill="none">
        <path
          d="M 632 128 C 664 128, 664 100, 692 100"
          stroke={SUCCESS}
          markerEnd="url(#tech-arrow-uow-ok)"
        />
        <path
          d="M 632 128 C 664 128, 664 174, 692 174"
          stroke={DANGER}
          markerEnd="url(#tech-arrow-uow-ko)"
        />
      </g>

      <rect
        x="700"
        y="78"
        width="172"
        height="44"
        rx="10"
        fill={SUCCESS_SOFT}
        stroke={SUCCESS}
        strokeWidth="1.5"
      />
      <text x="786" y="99" textAnchor="middle" className={styles.svgLabel} fill={SUCCESS}>
        {t('tech.diagram.unitOfWorkCommit')}
      </text>
      <text x="786" y="113" textAnchor="middle" className={styles.svgSub} fill={SUCCESS}>
        {t('tech.diagram.unitOfWorkCommitSub')}
      </text>

      <rect
        x="700"
        y="152"
        width="172"
        height="44"
        rx="10"
        fill={DANGER_SOFT}
        stroke={DANGER}
        strokeWidth="1.5"
      />
      <text x="786" y="173" textAnchor="middle" className={styles.svgLabel} fill={DANGER}>
        {t('tech.diagram.unitOfWorkRollback')}
      </text>
      <text x="786" y="187" textAnchor="middle" className={styles.svgSub} fill={DANGER}>
        {t('tech.diagram.unitOfWorkRollbackSub')}
      </text>

      <MongoLogo x={10} y={226} size={16} />
      <text x="34" y="238" className={styles.svgSub} fill={META}>
        {t('tech.diagram.unitOfWorkNote')}
      </text>
    </svg>
  );
}

const LETTERBOXD_MAX_ROWS = 300;

const CORE_COLLECTIONS = [
  { key: 'Users', x: 16, y: 148, w: 186, h: 104, fields: 3, hub: true },
  { key: 'Watchlist', x: 246, y: 24, w: 178, h: 76, fields: 2, hub: false },
  { key: 'Follows', x: 246, y: 118, w: 178, h: 76, fields: 2, hub: false },
  { key: 'Notifications', x: 246, y: 212, w: 178, h: 76, fields: 2, hub: false },
  { key: 'Participants', x: 246, y: 306, w: 178, h: 76, fields: 2, hub: false },
  { key: 'Events', x: 468, y: 24, w: 178, h: 76, fields: 2, hub: true },
  { key: 'Movies', x: 468, y: 148, w: 178, h: 76, fields: 2, hub: false },
  { key: 'Votes', x: 690, y: 148, w: 174, h: 76, fields: 2, hub: false },
  { key: 'SeenMarks', x: 690, y: 306, w: 174, h: 76, fields: 2, hub: false },
] as const;

const COLLECTION_FIELD_LINES = [1, 2, 3] as const;

export function DataModelDiagram() {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 880 410" role="img" aria-labelledby="tech-datamodel-title">
      <title id="tech-datamodel-title">{t('tech.diagram.dataModelTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-datamodel" fill={BORDER} />
      </defs>

      <g stroke={BORDER} strokeWidth="1.3" fill="none" markerEnd="url(#tech-arrow-datamodel)">
        <path d="M 202 172 C 224 172, 222 62, 240 62" />
        <path d="M 202 186 C 224 186, 222 156, 240 156" />
        <path d="M 202 214 C 224 214, 222 250, 240 250" />
        <path d="M 202 228 C 224 228, 222 344, 240 344" />
        <path d="M 557 100 L 557 142" />
        <path d="M 646 186 L 684 186" />
        <path d="M 512 224 C 512 280, 520 344, 684 344" />
        <path d="M 468 62 C 446 62, 448 344, 430 344" />
      </g>

      {CORE_COLLECTIONS.map((collection) => (
        <g key={collection.key}>
          <rect
            x={collection.x}
            y={collection.y}
            width={collection.w}
            height={collection.h}
            rx="10"
            fill={collection.hub ? PRIMARY_SOFT : SURFACE}
            stroke={collection.hub ? PRIMARY : BORDER}
          />
          <text x={collection.x + 14} y={collection.y + 22} className={styles.svgLabel} fill={TEXT}>
            {t(`tech.diagram.collection${collection.key}` as TranslationKey)}
          </text>
          <line
            x1={collection.x + 14}
            y1={collection.y + 32}
            x2={collection.x + collection.w - 14}
            y2={collection.y + 32}
            stroke={BORDER}
          />
          {COLLECTION_FIELD_LINES.filter((line) => line <= collection.fields).map((line) => (
            <text
              key={line}
              x={collection.x + 14}
              y={collection.y + 48 + (line - 1) * 15}
              className={styles.svgSub}
              fill={line === 1 ? TEXT : META}
            >
              {t(`tech.diagram.collection${collection.key}Field${line}` as TranslationKey)}
            </text>
          ))}
        </g>
      ))}

      <MongoLogo x={10} y={378} size={16} />
      <text x="34" y="390" className={styles.svgSub} fill={META}>
        {t('tech.diagram.dataModelNote', {
          collections: TECH_METRICS.mongoCollections,
          indexes: TECH_METRICS.mongoIndexes,
          ttl: TECH_METRICS.ttlIndexes,
        })}
      </text>
    </svg>
  );
}

const LETTERBOXD_LANES = [
  { key: 'browser', y: 44, Logo: ReactLogo },
  { key: 'api', y: 132, Logo: DotNetLogo },
  { key: 'outside', y: 220, Logo: LetterboxdLogo },
  { key: 'store', y: 308, Logo: MongoLogo },
] as const;

const LETTERBOXD_STEPS = [
  { key: 'Open', y: 44, x: 198, w: 152, warn: false },
  { key: 'Guard', y: 132, x: 198, w: 152, warn: false },
  { key: 'Scrape', y: 220, x: 364, w: 152, warn: false },
  { key: 'Match', y: 132, x: 364, w: 152, warn: false },
  { key: 'Diff', y: 308, x: 530, w: 152, warn: false },
  { key: 'Write', y: 308, x: 696, w: 152, warn: false },
  { key: 'Ambiguous', y: 44, x: 696, w: 152, warn: true },
] as const;

export function LetterboxdFlowDiagram() {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 880 392" role="img" aria-labelledby="tech-letterboxd-title">
      <title id="tech-letterboxd-title">{t('tech.diagram.letterboxdTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-lbx" fill={META} />
      </defs>

      {LETTERBOXD_LANES.map((lane) => (
        <g key={lane.key}>
          <rect
            x="10"
            y={lane.y - 24}
            width="854"
            height="70"
            rx="10"
            fill={SURFACE}
            stroke={BORDER}
            strokeDasharray="3 3"
          />
          <lane.Logo x={22} y={lane.y - 14} size={16} />
          <text x="46" y={lane.y - 1} className={styles.svgSub} fill={META}>
            {t(`tech.diagram.lbxLane${lane.key}` as TranslationKey)}
          </text>
        </g>
      ))}

      <g stroke={META} strokeWidth="1.3" fill="none" markerEnd="url(#tech-arrow-lbx)">
        <path d="M 274 68 L 274 122" />
        <path d="M 350 150 L 358 150" />
        <path d="M 424 168 L 424 210" />
        <path d="M 456 210 L 456 172" />
        <path d="M 516 150 C 546 150, 538 326, 524 326" />
        <path d="M 682 326 L 690 326" />
        <path d="M 772 298 L 772 76" />
      </g>

      {LETTERBOXD_STEPS.map((step) => (
        <g key={step.key}>
          <rect
            x={step.x}
            y={step.y - 16}
            width={step.w}
            height="52"
            rx="8"
            fill={SURFACE_PLAIN}
            stroke={step.warn ? WARN : BORDER}
            strokeWidth={step.warn ? 1.5 : 1}
          />
          <text
            x={step.x + step.w / 2}
            y={step.y + 3}
            textAnchor="middle"
            className={styles.svgLabel}
            fill={step.warn ? WARN : TEXT}
          >
            {t(`tech.diagram.lbx${step.key}` as TranslationKey)}
          </text>
          <text
            x={step.x + step.w / 2}
            y={step.y + 20}
            textAnchor="middle"
            className={styles.svgSub}
            fill={META}
          >
            {t(`tech.diagram.lbx${step.key}Sub` as TranslationKey, { rows: LETTERBOXD_MAX_ROWS })}
          </text>
        </g>
      ))}

      <text x="10" y="384" className={styles.svgSub} fill={PRIMARY}>
        {t('tech.diagram.lbxNote')}
      </text>
    </svg>
  );
}

const INFRA_NODES = [
  { key: 'Dns', x: 16, y: 34, w: 172, h: 74, Logo: Globe, hot: false },
  { key: 'Cdn', x: 16, y: 136, w: 172, h: 74, Logo: AwsLogo, hot: false },
  { key: 'Bucket', x: 16, y: 238, w: 172, h: 74, Logo: AwsLogo, hot: false },
  { key: 'Secrets', x: 360, y: 34, w: 200, h: 74, Logo: GoogleCloudLogo, hot: false },
  { key: 'Run', x: 360, y: 136, w: 200, h: 74, Logo: GoogleCloudLogo, hot: true },
  { key: 'Registry', x: 360, y: 238, w: 200, h: 74, Logo: GoogleCloudLogo, hot: false },
  { key: 'Scheduler', x: 604, y: 34, w: 180, h: 74, Logo: GoogleCloudLogo, hot: false },
  { key: 'Atlas', x: 604, y: 136, w: 180, h: 74, Logo: MongoLogo, hot: false },
  { key: 'Sentry', x: 604, y: 238, w: 180, h: 74, Logo: SentryLogo, hot: false },
] as const;

export function InfraDiagram() {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 880 396" role="img" aria-labelledby="tech-infra-title">
      <title id="tech-infra-title">{t('tech.diagram.infraTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-infra" fill={META} />
      </defs>

      <rect
        x="8"
        y="118"
        width="196"
        height="212"
        rx="12"
        fill="none"
        stroke={BORDER}
        strokeDasharray="4 4"
      />
      <text x="16" y="326" className={styles.svgSub} fill={META}>
        {t('tech.diagram.infraZoneAws')}
      </text>

      <rect
        x="352"
        y="16"
        width="216"
        height="314"
        rx="12"
        fill="none"
        stroke={BORDER}
        strokeDasharray="4 4"
      />
      <text x="360" y="326" className={styles.svgSub} fill={META}>
        {t('tech.diagram.infraZoneGcp')}
      </text>

      <g stroke={META} strokeWidth="1.3" fill="none" markerEnd="url(#tech-arrow-infra)">
        <path d="M 102 108 L 102 130" />
        <path d="M 102 238 L 102 216" />
        <path d="M 188 173 L 354 173" />
        <path d="M 460 238 L 460 216" />
        <path d="M 460 108 L 460 130" />
        <path d="M 604 71 C 582 71, 582 156, 560 156" />
        <path d="M 560 173 L 598 173" />
        <path d="M 560 190 C 586 190, 578 275, 598 275" />
      </g>

      {INFRA_NODES.map((node) => (
        <g key={node.key}>
          <rect
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            rx="10"
            fill={node.hot ? PRIMARY_SOFT : SURFACE}
            stroke={node.hot ? PRIMARY : BORDER}
          />
          <node.Logo x={node.x + 12} y={node.y + 11} size={16} color={META} />
          <text x={node.x + 36} y={node.y + 23} className={styles.svgLabel} fill={TEXT}>
            {t(`tech.diagram.infra${node.key}` as TranslationKey)}
          </text>
          <text x={node.x + 12} y={node.y + 46} className={styles.svgSub} fill={META}>
            {t(`tech.diagram.infra${node.key}Sub` as TranslationKey)}
          </text>
          <text x={node.x + 12} y={node.y + 62} className={styles.svgSub} fill={META}>
            {t(`tech.diagram.infra${node.key}Detail` as TranslationKey)}
          </text>
        </g>
      ))}

      <text x="10" y="360" className={styles.svgSub} fill={WARN}>
        {t('tech.diagram.infraGap')}
      </text>
      <text x="10" y="380" className={styles.svgSub} fill={META}>
        {t('tech.diagram.infraNote')}
      </text>
    </svg>
  );
}

const REQUEST_STAGE_POINTS = [1, 2, 3] as const;

const REQUEST_STAGES = [
  { key: 'Middleware', x: 16, w: 156, layer: 'Edge', core: false },
  { key: 'Controller', x: 190, w: 156, layer: 'Controllers', core: false },
  { key: 'Handler', x: 364, w: 156, layer: 'Application', core: false },
  { key: 'Domain', x: 538, w: 156, layer: 'Domain', core: true },
  { key: 'Repository', x: 712, w: 152, layer: 'Infrastructure', core: false },
] as const;

export function RequestPathDiagram() {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 880 268" role="img" aria-labelledby="tech-requestpath-title">
      <title id="tech-requestpath-title">{t('tech.diagram.requestPathTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-request" fill={META} />
      </defs>

      <text x="10" y="20" className={styles.svgSub} fill={META}>
        {t('tech.diagram.requestPathLabel')}
      </text>

      <g stroke={META} strokeWidth="1.3" fill="none" markerEnd="url(#tech-arrow-request)">
        {REQUEST_STAGES.slice(0, 4).map((stage) => (
          <path key={stage.key} d={`M ${stage.x + stage.w} 92 L ${stage.x + stage.w + 12} 92`} />
        ))}
      </g>

      {REQUEST_STAGES.map((stage) => (
        <g key={stage.key}>
          <rect
            x={stage.x}
            y="30"
            width={stage.w}
            height="120"
            rx="10"
            fill={stage.core ? PRIMARY_SOFT : SURFACE}
            stroke={stage.core ? PRIMARY : BORDER}
          />
          <text x={stage.x + 12} y="50" className={styles.svgSub} fill={PRIMARY}>
            {t(`tech.diagram.requestLayer${stage.layer}` as TranslationKey)}
          </text>
          <text x={stage.x + 12} y="72" className={styles.svgLabel} fill={TEXT}>
            {t(`tech.diagram.request${stage.key}` as TranslationKey)}
          </text>
          <line x1={stage.x + 12} y1="82" x2={stage.x + stage.w - 12} y2="82" stroke={BORDER} />
          {REQUEST_STAGE_POINTS.map((line) => (
            <text
              key={line}
              x={stage.x + 12}
              y={100 + (line - 1) * 15}
              className={styles.svgSub}
              fill={META}
            >
              {t(`tech.diagram.request${stage.key}${line}` as TranslationKey)}
            </text>
          ))}
        </g>
      ))}

      <rect
        x="364"
        y="182"
        width="500"
        height="46"
        rx="10"
        fill={SURFACE}
        stroke={BORDER}
        strokeDasharray="4 4"
      />
      <text x="380" y="203" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.requestPorts')}
      </text>
      <text x="380" y="219" className={styles.svgSub} fill={META}>
        {t('tech.diagram.requestPortsSub', {
          ports: TECH_METRICS.ports,
          useCases: TECH_METRICS.useCases,
        })}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" strokeDasharray="4 3" fill="none">
        <path d="M 442 150 L 442 178" />
        <path d="M 616 150 L 616 178" />
        <path d="M 788 150 L 788 178" />
      </g>

      <text x="10" y="252" className={styles.svgSub} fill={META}>
        {t('tech.diagram.requestPathNote')}
      </text>
    </svg>
  );
}
