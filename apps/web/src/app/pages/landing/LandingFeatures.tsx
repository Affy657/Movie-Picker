import clsx from 'clsx';
import { Bell, Bookmark, CalendarDays, Palette, Search, Smartphone } from 'lucide-react';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import { useTranslation } from '@/shared/i18n';
import DemoPoster from './DemoPoster';
import { LANDING_ANCHORS } from './anchors';
import demo from './landingDemo.module.css';
import shared from './landingShared.module.css';
import styles from './LandingFeatures.module.css';

export default function LandingFeatures() {
  const { t } = useTranslation();

  return (
    <section
      className={clsx(shared.section, styles.section)}
      id={LANDING_ANCHORS.features}
      aria-labelledby="landing-features"
    >
      <div className={shared.container}>
        <div className={clsx(shared.head, shared.reveal)}>
          <p className={shared.eyebrow}>{t('landing.features.eyebrow')}</p>
          <h2 className={shared.h2} id="landing-features">
            {t('landing.features.title')}
          </h2>
          <p className={shared.lead}>{t('landing.features.lead')}</p>
        </div>

        <div className={styles.bento}>
          <Card
            as="article"
            padding="none"
            elevation="sm"
            className={clsx(styles.tile, styles.tileWide, shared.reveal)}
          >
            <span className={styles.icon} aria-hidden="true">
              <Bookmark size={18} />
            </span>
            <h3 className={shared.h3}>{t('landing.features.watchlist.title')}</h3>
            <p className={styles.text}>{t('landing.features.watchlist.text')}</p>
            <div className={styles.demo} aria-hidden="true">
              <div className={demo.listRow}>
                <DemoPoster tone={5} label="Drive My Car" />
                <span className={demo.listTitle}>Drive My Car</span>
                <span className={demo.listSource}>Letterboxd</span>
              </div>
              <div className={demo.listRow}>
                <DemoPoster tone={6} label="Le Grand Bain" />
                <span className={demo.listTitle}>Le Grand Bain</span>
                <Chip size="sm">{t('landing.features.watchlist.addedHere')}</Chip>
              </div>
            </div>
          </Card>

          <Card
            as="article"
            padding="none"
            elevation="sm"
            className={clsx(styles.tile, styles.tileWide, shared.reveal)}
          >
            <span className={styles.icon} aria-hidden="true">
              <Search size={18} />
            </span>
            <h3 className={shared.h3}>{t('landing.features.details.title')}</h3>
            <p className={styles.text}>{t('landing.features.details.text')}</p>
            <div className={styles.demo} aria-hidden="true">
              <div className={demo.searchBar}>
                <Search size={15} />
                {t('landing.features.details.query')}
                <span className={demo.caret} />
              </div>
              <div className={demo.listRow}>
                <DemoPoster tone={3} label="Parasite" />
                <span>
                  <span className={demo.listTitle}>Parasite</span>
                  <span className={demo.listMeta}>2019 / 2h12 / 4,4</span>
                </span>
                <span className={demo.platforms}>
                  <span className={clsx(demo.platform, demo.platformNetflix)}>
                    <span>NF</span>
                  </span>
                  <span className={clsx(demo.platform, demo.platformPrime)}>
                    <span>PV</span>
                  </span>
                  <span className={clsx(demo.platform, demo.platformMore)}>
                    <span>{t('landing.features.details.morePlatforms')}</span>
                  </span>
                </span>
              </div>
            </div>
          </Card>

          <Card
            as="article"
            padding="none"
            elevation="sm"
            className={clsx(styles.tile, shared.reveal)}
          >
            <span className={styles.icon} aria-hidden="true">
              <Bell size={18} />
            </span>
            <h3 className={shared.h3}>{t('landing.features.notifications.title')}</h3>
            <p className={styles.text}>{t('landing.features.notifications.text')}</p>
            <div className={styles.demo} aria-hidden="true">
              <p className={demo.notifLine}>
                <span className={demo.notifDot} />
                <span>
                  {t('landing.features.notifications.demo')} <strong>Whiplash</strong>
                </span>
              </p>
            </div>
          </Card>

          <Card
            as="article"
            padding="none"
            elevation="sm"
            className={clsx(styles.tile, shared.reveal)}
          >
            <span className={styles.icon} aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <h3 className={shared.h3}>{t('landing.features.calendar.title')}</h3>
            <p className={styles.text}>{t('landing.features.calendar.text')}</p>
            <div className={styles.demo} aria-hidden="true">
              <p className={demo.notifLine}>
                <span className={demo.notifDot} />
                <span className={demo.mono}>{t('landing.features.calendar.demo')}</span>
              </p>
            </div>
          </Card>

          <Card
            as="article"
            padding="none"
            elevation="sm"
            className={clsx(styles.tile, shared.reveal)}
          >
            <span className={styles.icon} aria-hidden="true">
              <Smartphone size={18} />
            </span>
            <h3 className={shared.h3}>{t('landing.features.pwa.title')}</h3>
            <p className={styles.text}>{t('landing.features.pwa.text')}</p>
            <div className={styles.demo} aria-hidden="true">
              <p className={demo.notifLine}>
                <span className={demo.notifDot} />
                <span>{t('landing.features.pwa.demo')}</span>
              </p>
            </div>
          </Card>

          <Card
            as="article"
            padding="none"
            elevation="sm"
            className={clsx(styles.tile, shared.reveal)}
          >
            <span className={styles.icon} aria-hidden="true">
              <Palette size={18} />
            </span>
            <h3 className={shared.h3}>{t('landing.features.theme.title')}</h3>
            <p className={styles.text}>{t('landing.features.theme.text')}</p>
            <div className={styles.demo} aria-hidden="true">
              <div className={demo.swatches}>
                <span className={clsx(demo.swatch, demo.swatchBlue, demo.swatchActive)} />
                <span className={clsx(demo.swatch, demo.swatchGreen)} />
                <span className={clsx(demo.swatch, demo.swatchPurple)} />
                <span className={clsx(demo.swatch, demo.swatchPink)} />
                <span className={clsx(demo.swatch, demo.swatchOrange)} />
                <span className={clsx(demo.swatch, demo.swatchCyan)} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
