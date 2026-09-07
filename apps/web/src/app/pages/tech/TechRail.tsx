import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import styles from './techPage.module.css';

export const TECH_SECTIONS = [
  'architecture',
  'trajectory',
  'ui',
  'server',
  'contract',
  'data',
  'domain',
  'tests',
  'ci',
  'production',
  'method',
  'decisions',
  'debt',
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

  return (
    <nav className={styles.rail} aria-label={t('tech.railTitle')}>
      <p className={styles.railTitle}>{t('tech.railTitle')}</p>
      <ol className={styles.railList}>
        {TECH_SECTIONS.map((id) => (
          <li key={id}>
            <a
              className={clsx(styles.railLink, id === visible && styles.railLinkVisible)}
              href={`#${id}`}
              aria-current={id === visible ? 'location' : undefined}
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
