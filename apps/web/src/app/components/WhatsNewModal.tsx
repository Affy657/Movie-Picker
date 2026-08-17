import { useId } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import type { WhatsNewCategory, WhatsNewRelease } from '@/shared/whatsNew';
import styles from './WhatsNewModal.module.css';

type Props = {
  open: boolean;
  release: WhatsNewRelease;
  onClose: () => void;
};

const CATEGORY_ORDER: readonly WhatsNewCategory[] = ['new', 'improved', 'fixed'];

const CATEGORY_TITLE_KEY: Record<
  WhatsNewCategory,
  'whatsNew.categories.new' | 'whatsNew.categories.improved' | 'whatsNew.categories.fixed'
> = {
  new: 'whatsNew.categories.new',
  improved: 'whatsNew.categories.improved',
  fixed: 'whatsNew.categories.fixed',
};

export default function WhatsNewModal({ open, release, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const dialogRef = useModalDialog(open, onClose);
  const reactId = useId();
  const titleId = `whats-new-modal-title-${reactId}`;

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('whatsNew.title', { version: release.version })}
      </h2>

      {CATEGORY_ORDER.map((category) => {
        const entries = release.entries.filter((entry) => entry.category === category);
        if (entries.length === 0) return null;
        return (
          <section key={category} className={styles.category}>
            <h3 className={styles.categoryTitle}>{t(CATEGORY_TITLE_KEY[category])}</h3>
            <ul className={styles.entryList}>
              {entries.map((entry) => (
                <li key={entry.textKey} className={styles.entry}>
                  {t(entry.textKey)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('whatsNew.close')}
        </button>
      </div>
    </dialog>
  );
}
