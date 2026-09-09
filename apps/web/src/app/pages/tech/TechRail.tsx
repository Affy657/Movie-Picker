import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import styles from './techPage.module.css';

export const TECH_SECTIONS = [
  'architecture',
  'choices',
  'contract',
  'ui',
  'server',
  'data',
  'feature',
  'tests',
  'quality',
  'ci',
  'infra',
  'production',
  'method',
  'trajectory',
] as const;

export type TechSectionId = (typeof TECH_SECTIONS)[number];

export function sectionNumber(id: TechSectionId) {
  return String(TECH_SECTIONS.indexOf(id) + 1).padStart(2, '0');
}

function useVisibleSection() {
  const [visible, setVisible] = useState<TechSectionId>(TECH_SECTIONS[0]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.25;
      let reached: TechSectionId = TECH_SECTIONS[0];
      for (const id of TECH_SECTIONS) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= readingLine) reached = id;
      }
      setVisible(reached);
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return visible;
}

export default function TechRail() {
  const { t } = useTranslation();
  const visible = useVisibleSection();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  return (
    <nav className={styles.rail} aria-label={t('tech.railTitle')} data-expanded={expanded}>
      <p className={styles.railTitle}>{t('tech.railTitle')}</p>
      <button
        type="button"
        className={styles.railToggle}
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((previous) => !previous)}
      >
        <span className={styles.railToggleLabel}>{t('tech.railTitle')}</span>
        <span className={styles.railCurrent}>
          <span className={styles.railProgress}>
            {sectionNumber(visible)} / {TECH_SECTIONS.length}
          </span>
          <span className={styles.railCurrentName}>
            {t(`tech.nav.${visible}` as TranslationKey)}
          </span>
        </span>
        <ChevronDown className={styles.railChevron} size={16} aria-hidden focusable="false" />
      </button>
      <ol className={styles.railList} id={listId}>
        {TECH_SECTIONS.map((id) => (
          <li key={id}>
            <a
              className={clsx(styles.railLink, id === visible && styles.railLinkVisible)}
              href={`#${id}`}
              aria-current={id === visible ? 'location' : undefined}
              onClick={() => setExpanded(false)}
            >
              <span className={styles.railNum}>{sectionNumber(id)}</span>
              <span>{t(`tech.nav.${id}` as TranslationKey)}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
