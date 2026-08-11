import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation } from '@/shared/i18n';
import styles from './InfoBubble.module.css';

const PANEL_MAX_WIDTH = 320;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;

type InfoBubbleProps = {
  label: string;
  children: ReactNode;
};

export default function InfoBubble({ label, children }: Readonly<InfoBubbleProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const available = globalThis.innerWidth - VIEWPORT_MARGIN * 2;
    const width = Math.min(PANEL_MAX_WIDTH, available);
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      globalThis.innerWidth - width - VIEWPORT_MARGIN
    );

    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + TRIGGER_GAP;
    const overflowsBottom = panelHeight > 0 && below + panelHeight > globalThis.innerHeight;
    const top = overflowsBottom
      ? Math.max(VIEWPORT_MARGIN, rect.top - TRIGGER_GAP - panelHeight)
      : below;

    setPosition({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onViewportChange = () => place();
    globalThis.addEventListener('resize', onViewportChange);
    globalThis.addEventListener('scroll', onViewportChange, true);
    return () => {
      globalThis.removeEventListener('resize', onViewportChange);
      globalThis.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, place]);

  return (
    <span className={styles.wrapper} ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Info size={15} aria-hidden focusable="false" />
      </button>
      {open && (
        <span
          ref={panelRef}
          id={panelId}
          className={styles.panel}
          role="note"
          style={
            position === null
              ? { visibility: 'hidden' }
              : { top: position.top, left: position.left, width: position.width }
          }
        >
          <span className={styles.panelTitle}>{label}</span>
          {children}
          <button type="button" className={styles.close} onClick={() => setOpen(false)}>
            {t('common.close')}
          </button>
        </span>
      )}
    </span>
  );
}
