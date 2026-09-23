import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation } from '@/shared/i18n';
import styles from './InfoBubble.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import LinkButton from './LinkButton';
import {
  INFO_PANEL_MAX_WIDTH_PX,
  MENU_ANCHOR_GAP_PX,
  MENU_VIEWPORT_MARGIN_PX,
} from './menuGeometry';

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
    const available = globalThis.innerWidth - MENU_VIEWPORT_MARGIN_PX * 2;
    const width = Math.min(INFO_PANEL_MAX_WIDTH_PX, available);
    const left = Math.min(
      Math.max(rect.left, MENU_VIEWPORT_MARGIN_PX),
      globalThis.innerWidth - width - MENU_VIEWPORT_MARGIN_PX
    );

    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + MENU_ANCHOR_GAP_PX;
    const overflowsBottom = panelHeight > 0 && below + panelHeight > globalThis.innerHeight;
    const top = overflowsBottom
      ? Math.max(MENU_VIEWPORT_MARGIN_PX, rect.top - MENU_ANCHOR_GAP_PX - panelHeight)
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
        <Info size={ICON_SIZE.md} aria-hidden focusable="false" />
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
          <LinkButton size="sm" className={styles.close} onClick={() => setOpen(false)}>
            {t('common.close')}
          </LinkButton>
        </span>
      )}
    </span>
  );
}
