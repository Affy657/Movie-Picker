import { useEffect, useId, useRef } from 'react';
import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { AVATAR_IDS, avatarUrl } from '@/shared/utils/avatar';
import styles from './AvatarPickerModal.module.css';

type Props = {
  open: boolean;
  currentAvatarId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export default function AvatarPickerModal({ open, currentAvatarId, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reactId = useId();
  const titleId = `avatar-modal-title-${reactId}`;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

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
      <p className={styles.hint}>{t('auth.account.avatarHint')}</p>
      <div role="radiogroup" aria-label={t('auth.account.avatarLabel')} className={styles.grid}>
        {AVATAR_IDS.map((id) => {
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
