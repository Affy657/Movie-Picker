import { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Link2, Share2, UserPlus } from 'lucide-react';
import QrCodeButton from '@/shared/components/QrCodeButton';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { useTranslation } from '@/shared/i18n';
import styles from './EventShareMenu.module.css';

const COPIED_RESET_MS = 2000;

type EventShareMenuProps = {
  url: string;
  title: string;
  eventTime: string;
  eventDate: string;
  onInviteFriends?: () => void;
};

export default function EventShareMenu({
  url,
  title,
  eventTime,
  eventDate,
  onInviteFriends,
}: Readonly<EventShareMenuProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | undefined>(undefined);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

  const shareLabel = copied ? t('events.share.copiedButton') : t('events.share.shareButton');

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          url,
          text: t('events.share.shareText', { title, time: eventTime, date: eventDate }),
        });
        close();
        return;
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') return;
      }
    }
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = globalThis.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {copied ? t('events.share.copiedButton') : ''}
      </p>
      <button
        ref={triggerRef}
        type="button"
        className={clsx('btn', styles.trigger)}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <UserPlus size={16} aria-hidden />
        <span className={styles.triggerLabel}>{t('events.share.menuTrigger')}</span>
        <ChevronDown
          className={styles.chevron}
          data-open={open || undefined}
          size={14}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          className={styles.dropdown}
          tabIndex={-1}
          aria-label={t('events.share.menuLabel')}
          style={fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined}
        >
          {onInviteFriends ? (
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                close();
                onInviteFriends();
              }}
            >
              <UserPlus className={styles.icon} size={15} aria-hidden />
              <span className={styles.itemLabel}>{t('events.share.inviteFriends')}</span>
            </button>
          ) : null}

          <button type="button" className={styles.item} onClick={() => void handleShare()}>
            {typeof navigator.share === 'function' ? (
              <Share2 className={styles.icon} size={15} aria-hidden />
            ) : (
              <Link2 className={styles.icon} size={15} aria-hidden />
            )}
            <span className={styles.itemLabel}>{shareLabel}</span>
          </button>

          <QrCodeButton
            url={url}
            dialogTitle={t('events.share.qrTitle')}
            hint={t('events.share.qrHint')}
            showLabel={t('events.share.showQr')}
            closeLabel={t('events.share.closeQr')}
            className={styles.item}
            withLabel
          />
        </div>
      ) : null}
    </div>
  );
}
