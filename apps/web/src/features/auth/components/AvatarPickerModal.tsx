import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { BOTTTS_IDS, EMOJI_IDS, avatarUrl } from '@/shared/utils/avatar';
import { useDialogOpen } from '@/shared/hooks/useDialogOpen';
import styles from './AvatarPickerModal.module.css';

type Category = 'bottts' | 'emoji';

type Props = {
  open: boolean;
  currentAvatarId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export default function AvatarPickerModal({
  open,
  currentAvatarId,
  onSelect,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reactId = useId();
  const titleId = `avatar-modal-title-${reactId}`;

  const [category, setCategory] = useState<Category>(() =>
    EMOJI_IDS.includes(currentAvatarId as never) ? 'emoji' : 'bottts'
  );
  const ids = category === 'bottts' ? BOTTTS_IDS : EMOJI_IDS;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useDialogOpen(dialogRef, open);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      if (open) onCloseRef.current();
    };
    const handleBackdrop = (e: MouseEvent) => {
      if (e.target === dlg) onCloseRef.current();
    };
    dlg.addEventListener('close', handleClose);
    dlg.addEventListener('click', handleBackdrop);
    return () => {
      dlg.removeEventListener('close', handleClose);
      dlg.removeEventListener('click', handleBackdrop);
    };
  }, [open]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('auth.account.avatarLabel')}
        </h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={category === 'bottts'}
          className={clsx(styles.tab, category === 'bottts' && styles.tabActive)}
          onClick={() => setCategory('bottts')}
        >
          🤖 Robots
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={category === 'emoji'}
          className={clsx(styles.tab, category === 'emoji' && styles.tabActive)}
          onClick={() => setCategory('emoji')}
        >
          😄 Emoji
        </button>
      </div>

      <div role="radiogroup" aria-label={t('auth.account.avatarLabel')} className={styles.grid}>
        {ids.map((id) => {
          const selected = id === currentAvatarId;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t('auth.account.avatarOptionAriaLabel', { name: id })}
              className={clsx(styles.option, selected && styles.optionSelected)}
              onClick={() => onSelect(id)}
            >
              <img
                src={avatarUrl(id)}
                alt=""
                aria-hidden="true"
                width={52}
                height={52}
                loading="lazy"
                decoding="async"
                className={styles.img}
              />
              {selected && <Check size={14} className={styles.check} aria-hidden />}
            </button>
          );
        })}
      </div>
    </dialog>
  );
}
