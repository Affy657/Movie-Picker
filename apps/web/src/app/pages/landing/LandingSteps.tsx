import { lazy, Suspense } from 'react';
import clsx from 'clsx';
import Card from '@/shared/components/Card';
import { useTranslation } from '@/shared/i18n';
import DemoPoster from './DemoPoster';
import { DEMO_QR_URL } from './demoContent';
import { LANDING_ANCHORS } from './anchors';
import demo from './landingDemo.module.css';
import shared from './landingShared.module.css';
import styles from './LandingSteps.module.css';

const QrCode = lazy(() => import('@/shared/components/QrCode'));

export default function LandingSteps() {
  const { t } = useTranslation();

  return (
    <section
      className={clsx(shared.section, styles.section, shared.tint)}
      id={LANDING_ANCHORS.steps}
      aria-labelledby="landing-steps"
    >
      <div className={shared.container}>
        <div className={clsx(shared.head, shared.headCenter, shared.reveal)}>
          <p className={shared.eyebrow}>{t('landing.steps.eyebrow')}</p>
          <h2 className={shared.h2} id="landing-steps">
            {t('landing.steps.title')}
          </h2>
          <p className={clsx(shared.lead, shared.center)}>{t('landing.steps.subtitle')}</p>
        </div>

        <ol className={styles.steps}>
          <li>
            <Card
              as="div"
              padding="none"
              elevation="sm"
              className={clsx(styles.step, shared.reveal)}
            >
              <p className={styles.num}>01</p>
              <h3 className={styles.title}>{t('landing.steps.create.title')}</h3>
              <p className={styles.text}>{t('landing.steps.create.text')}</p>
              <div className={styles.demo} aria-hidden="true">
                <div className={demo.field}>
                  <span className={demo.fieldLabel}>{t('landing.steps.create.fieldTitle')}</span>
                  <span className={clsx(demo.fieldInput, demo.fieldInputFocus)}>
                    {t('landing.demo.eventTitle')}
                    <span className={demo.caret} />
                  </span>
                </div>
                <div className={demo.field}>
                  <span className={demo.fieldLabel}>{t('landing.steps.create.fieldWhen')}</span>
                  <span className={clsx(demo.fieldInput, demo.mono)}>
                    {t('landing.steps.create.whenValue')}
                  </span>
                </div>
              </div>
            </Card>
          </li>

          <li>
            <Card
              as="div"
              padding="none"
              elevation="sm"
              className={clsx(styles.step, shared.reveal)}
            >
              <p className={styles.num}>02</p>
              <h3 className={styles.title}>{t('landing.steps.share.title')}</h3>
              <p className={styles.text}>{t('landing.steps.share.text')}</p>
              <div className={styles.demo}>
                <span className={demo.qr} aria-hidden="true">
                  <Suspense fallback={null}>
                    <QrCode value={DEMO_QR_URL} title={t('landing.steps.share.qrTitle')} />
                  </Suspense>
                </span>
                <div className={demo.shareLine} aria-hidden="true">
                  <span className={demo.shareUrl}>{t('landing.demo.url')}</span>
                </div>
              </div>
            </Card>
          </li>

          <li>
            <Card
              as="div"
              padding="none"
              elevation="sm"
              className={clsx(styles.step, shared.reveal)}
            >
              <p className={styles.num}>03</p>
              <h3 className={styles.title}>{t('landing.steps.vote.title')}</h3>
              <p className={styles.text}>{t('landing.steps.vote.text')}</p>
              <div className={styles.demo} aria-hidden="true">
                <div className={demo.listRow}>
                  <DemoPoster tone={3} label="Parasite" />
                  <span className={demo.listTitle}>Parasite</span>
                  <span className={demo.votes}>
                    <span className={clsx(demo.vote, demo.voteUp)}>
                      <span>▲ 4</span>
                    </span>
                  </span>
                </div>
                <div className={demo.listRow}>
                  <DemoPoster tone={4} label="Blade Runner" />
                  <span className={demo.listTitle}>Blade Runner</span>
                  <span className={demo.votes}>
                    <span className={demo.vote}>
                      <span>{t('landing.steps.vote.alreadySeen')}</span>
                    </span>
                  </span>
                </div>
              </div>
            </Card>
          </li>

          <li>
            <Card
              as="div"
              padding="none"
              elevation="sm"
              className={clsx(styles.step, shared.reveal)}
            >
              <p className={styles.num}>04</p>
              <h3 className={styles.title}>{t('landing.steps.wheel.title')}</h3>
              <p className={styles.text}>{t('landing.steps.wheel.text')}</p>
              <div className={styles.demo} aria-hidden="true">
                <span className={demo.wheelMini} />
                <p className={demo.stepLegend}>{t('landing.steps.wheel.legend')}</p>
              </div>
            </Card>
          </li>
        </ol>
      </div>
    </section>
  );
}
