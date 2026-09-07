import { useTranslation } from '@/shared/i18n';
import { TECH_METRICS } from './generated/techMetrics';
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

export function ArchitectureDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 430" role="img" aria-labelledby="tech-arch-title">
      <title id="tech-arch-title">{t('tech.diagram.architectureTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-arch" fill={META} />
      </defs>

      <rect x="8" y="150" width="150" height="96" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="83" y="188" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.browser')}
      </text>
      <text x="83" y="208" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.browserPwa')}
      </text>
      <text x="83" y="224" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.browserWorker')}
      </text>

      <line
        x1="160"
        y1="176"
        x2="252"
        y2="112"
        stroke={META}
        strokeWidth="1.5"
        markerEnd="url(#tech-arrow-arch)"
      />
      <text x="196" y="132" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.assets')}
      </text>

      <line
        x1="160"
        y1="220"
        x2="252"
        y2="268"
        stroke={PRIMARY}
        strokeWidth="2"
        markerEnd="url(#tech-arrow-arch)"
      />
      <text x="200" y="264" textAnchor="middle" className={styles.svgSub} fill={PRIMARY}>
        /api/v1
      </text>

      <rect x="258" y="60" width="196" height="90" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="356" y="94" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.cdn')}
      </text>
      <text x="356" y="114" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.cdnBundle')}
      </text>
      <text x="356" y="130" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.cdnFallback')}
      </text>

      <rect
        x="258"
        y="230"
        width="196"
        height="100"
        rx="12"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <text x="356" y="266" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.api')}
      </text>
      <text x="356" y="286" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.apiHost')}
      </text>
      <text x="356" y="302" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.apiEndpoints', { endpoints: String(TECH_METRICS.endpoints) })}
      </text>

      <line
        x1="454"
        y1="280"
        x2="530"
        y2="280"
        stroke={META}
        strokeWidth="1.5"
        markerEnd="url(#tech-arrow-arch)"
      />

      <rect x="538" y="230" width="170" height="100" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="623" y="266" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.database')}
      </text>
      <text x="623" y="286" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.databaseReplica')}
      </text>
      <text x="623" y="302" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.databaseTransactions')}
      </text>

      <line
        x1="454"
        y1="244"
        x2="700"
        y2="140"
        stroke={META}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd="url(#tech-arrow-arch)"
      />

      <rect
        x="706"
        y="34"
        width="166"
        height="204"
        rx="12"
        fill="none"
        stroke={BORDER}
        strokeDasharray="4 3"
      />
      <text x="789" y="56" textAnchor="middle" className={styles.svgSub} fill={META}>
        {t('tech.diagram.externalServices')}
      </text>
      {[
        'TMDB',
        'Letterboxd',
        'OAuth Google',
        'OAuth GitHub',
        'Web Push VAPID',
        'GitHub Issues',
        'Ko-fi',
      ].map((name, index) => (
        <text
          key={name}
          x="789"
          y={82 + index * 22}
          textAnchor="middle"
          className={styles.svgLabel}
          fill={MUTED}
        >
          {name}
        </text>
      ))}

      <line
        x1="356"
        y1="330"
        x2="356"
        y2="368"
        stroke={META}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd="url(#tech-arrow-arch)"
      />
      <line
        x1="83"
        y1="246"
        x2="83"
        y2="368"
        stroke={META}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd="url(#tech-arrow-arch)"
      />

      <rect x="8" y="374" width="700" height="48" rx="12" fill={SURFACE} stroke={BORDER} />
      <text x="30" y="404" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.observability')}
      </text>
      <text x="180" y="404" className={styles.svgLabel} fill={MUTED}>
        {t('tech.diagram.observabilityErrors')}
      </text>
      <text x="360" y="404" className={styles.svgLabel} fill={MUTED}>
        {t('tech.diagram.observabilityUsage')}
      </text>
      <text x="590" y="404" className={styles.svgLabel} fill={MUTED}>
        {t('tech.diagram.observabilityLogs')}
      </text>
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

      <rect x="122" y="148" width="356" height="124" rx="12" fill={PRIMARY_SOFT} stroke={PRIMARY} />
      <text x="146" y="176" className={styles.svgLabel} fill={PRIMARY}>
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
        fill={SURFACE_PLAIN}
        stroke={TEXT}
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
      <text x="95" y="78" textAnchor="middle" className={styles.svgTitle} fill={TEXT}>
        {t('tech.diagram.contractApi')}
      </text>
      <text x="95" y="96" textAnchor="middle" className={styles.svgSub} fill={META}>
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
        {t('tech.diagram.testsE2e', { count: String(TECH_METRICS.e2eScenarios) })}
      </text>
      <text x="740" y="47" className={styles.svgSub} fill={META}>
        {t('tech.diagram.testsE2eLabel')}
      </text>

      <rect x="270" y="76" width="340" height="50" rx="8" fill={SURFACE} stroke={BORDER} />
      <text x="440" y="107" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.testsIntegration')}
      </text>
      <text x="740" y="107" className={styles.svgSub} fill={META}>
        {t('tech.diagram.testsIntegrationLabel')}
      </text>

      <rect x="170" y="136" width="540" height="50" rx="8" fill={SURFACE} stroke={BORDER} />
      <text x="440" y="167" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.testsUnit', {
          total: String(TECH_METRICS.testFiles),
          web: String(TECH_METRICS.webTestFiles),
          api: String(TECH_METRICS.apiTestFiles),
        })}
      </text>
      <text x="740" y="167" className={styles.svgSub} fill={META}>
        {t('tech.diagram.testsUnitLabel')}
      </text>
    </svg>
  );
}

const CI_LEFT_JOBS = [
  'ciGitleaks',
  'ciLint',
  'ciAudit',
  'ciTest',
  'ciTestMongo',
  'ciLighthouse',
  'ciE2e',
] as const;

export function CiGraphDiagram() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 880 330" role="img" aria-labelledby="tech-ci-title">
      <title id="tech-ci-title">{t('tech.diagram.ciTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-ci" fill={BORDER} />
      </defs>

      <rect x="10" y="140" width="112" height="46" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="66" y="168" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciChanges')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        {CI_LEFT_JOBS.map((job, index) => (
          <path
            key={job}
            d={`M 124 ${156 + index * 2.5} C 160 ${156 + index * 2.5}, 160 ${30 + index * 44}, 196 ${30 + index * 44}`}
          />
        ))}
      </g>

      {CI_LEFT_JOBS.map((job, index) => (
        <g key={job}>
          <rect
            x="200"
            y={12 + index * 44}
            width="150"
            height="36"
            rx="9"
            fill={SURFACE}
            stroke={BORDER}
          />
          <text x="216" y={35 + index * 44} className={styles.svgLabel} fill={MUTED}>
            {t(`tech.diagram.${job}` as 'tech.diagram.ciGitleaks')}
          </text>
        </g>
      ))}

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        <path d="M 352 30 C 400 30, 400 150, 442 150" />
        <path d="M 352 163 C 400 163, 400 158, 442 158" />
        <path d="M 352 296 C 400 296, 400 168, 442 168" />
      </g>

      <rect x="446" y="140" width="112" height="46" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="502" y="168" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciSonar')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        <path d="M 560 156 C 596 156, 596 108, 632 108" />
        <path d="M 560 170 C 596 170, 596 218, 632 218" />
      </g>

      <rect
        x="636"
        y="86"
        width="150"
        height="44"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <text x="711" y="113" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciDeployApi')}
      </text>

      <rect
        x="636"
        y="196"
        width="150"
        height="44"
        rx="10"
        fill={PRIMARY_SOFT}
        stroke={PRIMARY}
        strokeWidth="1.5"
      />
      <text x="711" y="223" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.ciDeployFront')}
      </text>

      <g stroke={BORDER} strokeWidth="1.2" fill="none" markerEnd="url(#tech-arrow-ci)">
        <path d="M 788 108 C 816 108, 816 150, 826 150" />
        <path d="M 788 218 C 816 218, 816 176, 826 176" />
      </g>
      <rect x="800" y="140" width="72" height="46" rx="10" fill={SUCCESS_SOFT} stroke={SUCCESS} />
      <text x="836" y="162" textAnchor="middle" className={styles.svgSub} fill={SUCCESS}>
        {t('tech.diagram.ciGuard1')}
      </text>
      <text x="836" y="176" textAnchor="middle" className={styles.svgSub} fill={SUCCESS}>
        {t('tech.diagram.ciGuard2')}
      </text>
    </svg>
  );
}

export function FeatureFlowDiagram() {
  const { t } = useTranslation();
  const stop = t('tech.diagram.flowStop');
  return (
    <svg viewBox="0 0 880 296" role="img" aria-labelledby="tech-featureflow-title">
      <title id="tech-featureflow-title">{t('tech.diagram.featureFlowTitle')}</title>
      <defs>
        <ArrowMarker id="tech-arrow-feature" fill={BORDER} />
      </defs>

      <text x="10" y="24" className={styles.svgSub} fill={META}>
        {t('tech.diagram.featureFlowLabel')}
      </text>

      <g stroke={BORDER} strokeWidth="1.4" fill="none" markerEnd="url(#tech-arrow-feature)">
        <path d="M 122 74 L 156 74" />
        <path d="M 268 74 L 302 74" />
        <path d="M 414 74 L 448 74" />
        <path d="M 560 74 L 594 74" />
        <path d="M 706 74 L 740 74" />
        <path d="M 812 100 C 812 130, 812 130, 780 130 L 100 130 C 68 130, 68 148, 68 166" />
        <path d="M 136 190 L 170 190" />
        <path d="M 282 190 L 316 190" />
        <path d="M 428 190 L 462 190" />
      </g>

      <rect x="10" y="52" width="112" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="66" y="79" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowRoadmap')}
      </text>

      <rect
        x="156"
        y="52"
        width="112"
        height="44"
        rx="10"
        fill={WARN_SOFT}
        stroke={WARN}
        strokeWidth="1.5"
      />
      <text x="212" y="73" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowScoping')}
      </text>
      <text x="212" y="88" textAnchor="middle" className={styles.svgSub} fill={WARN}>
        {stop}
      </text>

      <rect
        x="302"
        y="52"
        width="112"
        height="44"
        rx="10"
        fill={WARN_SOFT}
        stroke={WARN}
        strokeWidth="1.5"
      />
      <text x="358" y="73" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowMockup')}
      </text>
      <text x="358" y="88" textAnchor="middle" className={styles.svgSub} fill={WARN}>
        {stop}
      </text>

      <rect x="448" y="52" width="112" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="504" y="79" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowImplementation')}
      </text>

      <rect
        x="594"
        y="52"
        width="112"
        height="44"
        rx="10"
        fill={WARN_SOFT}
        stroke={WARN}
        strokeWidth="1.5"
      />
      <text x="650" y="73" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowManualTest')}
      </text>
      <text x="650" y="88" textAnchor="middle" className={styles.svgSub} fill={WARN}>
        {stop}
      </text>

      <rect x="740" y="52" width="112" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="796" y="79" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowReview')}
      </text>

      <rect x="10" y="168" width="126" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="73" y="195" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowLocalSuites')}
      </text>

      <rect x="170" y="168" width="112" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="226" y="195" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowPush')}
      </text>

      <rect x="316" y="168" width="112" height="44" rx="10" fill={SURFACE} stroke={BORDER} />
      <text x="372" y="195" textAnchor="middle" className={styles.svgLabel} fill={TEXT}>
        {t('tech.diagram.flowChecks', { jobs: String(TECH_METRICS.ciJobs) })}
      </text>

      <rect
        x="462"
        y="168"
        width="112"
        height="44"
        rx="10"
        fill={SUCCESS_SOFT}
        stroke={SUCCESS}
        strokeWidth="1.5"
      />
      <text x="518" y="195" textAnchor="middle" className={styles.svgLabel} fill={SUCCESS}>
        {t('tech.diagram.flowProduction')}
      </text>

      <rect
        x="10"
        y="238"
        width="20"
        height="14"
        rx="4"
        fill={WARN_SOFT}
        stroke={WARN}
        strokeWidth="1.5"
      />
      <text x="40" y="249" className={styles.svgSub} fill={WARN}>
        {t('tech.diagram.flowNote1')}
      </text>
      <text x="40" y="267" className={styles.svgSub} fill={WARN}>
        {t('tech.diagram.flowNote2')}
      </text>
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

export function ControlPyramidDiagram() {
  const { t } = useTranslation();
  const rows = [
    {
      label: t('tech.diagram.controlRules'),
      detail: t('tech.diagram.controlRulesDetail'),
      fill: SURFACE,
      stroke: BORDER,
    },
    {
      label: t('tech.diagram.controlAssisted'),
      detail: t('tech.diagram.controlAssistedDetail'),
      fill: PRIMARY_SOFT,
      stroke: PRIMARY,
    },
    {
      label: t('tech.diagram.controlGuards'),
      detail: t('tech.diagram.controlGuardsDetail', {
        tests: String(TECH_METRICS.testFiles),
        jobs: String(TECH_METRICS.ciJobs),
      }),
      fill: SUCCESS_SOFT,
      stroke: SUCCESS,
    },
    {
      label: t('tech.diagram.controlHuman'),
      detail: t('tech.diagram.controlHumanDetail'),
      fill: WARN_SOFT,
      stroke: WARN,
    },
  ];

  return (
    <svg viewBox="0 0 880 250" role="img" aria-labelledby="tech-controlpyramid-title">
      <title id="tech-controlpyramid-title">{t('tech.diagram.controlPyramidTitle')}</title>
      <text x="10" y="24" className={styles.svgSub} fill={META}>
        {t('tech.diagram.controlPyramidLabel')}
      </text>

      {rows.map((row, index) => (
        <g key={row.label}>
          <rect
            x="10"
            y={42 + index * 52}
            width="400"
            height="44"
            rx="10"
            fill={row.fill}
            stroke={row.stroke}
          />
          <text x="32" y={70 + index * 52} className={styles.svgLabel} fill={TEXT}>
            {row.label}
          </text>
          <text x="428" y={70 + index * 52} className={styles.svgSub} fill={META}>
            {row.detail}
          </text>
        </g>
      ))}
    </svg>
  );
}
