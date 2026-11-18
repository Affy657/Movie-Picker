import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation } from '@/shared/i18n';
import styles from './InfoBubble.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import LinkButton from './LinkButton';
import { fixedPopoverStyle, useFixedPopover } from '@/shared/hooks/useFixedPopover';
import { INFO_PANEL_MAX_WIDTH_PX } from './menuGeometry';

type InfoBubbleProps = {
  label: string;
  children: ReactNode;
};

export default function InfoBubble({ label, children }: Readonly<InfoBubbleProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useClickOutside(wrapperRef, () => setOpen(false), open, { returnFocusTo: triggerRef });

  const closeFromPanel = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const position = useFixedPopover(open, triggerRef, panelRef, {
    maxWidth: INFO_PANEL_MAX_WIDTH_PX,
  });

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
          data-placement={position?.placement}
          style={fixedPopoverStyle(position)}
        >
          <span className={styles.panelTitle}>{label}</span>
          {children}
          <LinkButton size="sm" className={styles.close} onClick={closeFromPanel}>
            {t('common.close')}
          </LinkButton>
        </span>
      )}
    </span>
  );
}
