import { useId } from 'react';
import { Sparkles, Wand2, Wrench } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import type { WhatsNewCategory, WhatsNewRelease } from '@/shared/whatsNew';
import styles from './WhatsNewModal.module.css';

type Props = {
  open: boolean;
  release: WhatsNewRelease;
  onClose: () => void;
};

type CategoryIcon = ComponentType<SVGProps<SVGSVGElement>>;

const CATEGORY_ORDER: readonly WhatsNewCategory[] = ['new', 'improved', 'fixed'];

const CATEGORY_TITLE_KEY: Record<
  WhatsNewCategory,
  'whatsNew.categories.new' | 'whatsNew.categories.improved' | 'whatsNew.categories.fixed'
> = {
  new: 'whatsNew.categories.new',
  improved: 'whatsNew.categories.improved',
  fixed: 'whatsNew.categories.fixed',
};

const CATEGORY_ICON: Record<WhatsNewCategory, CategoryIcon> = {
  new: Sparkles,
  improved: Wand2,
  fixed: Wrench,
};

export default function WhatsNewModal({ open, release, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const dialogRef = useModalDialog(open, onClose);
  const reactId = useId();
  const titleId = `whats-new-modal-title-${reactId}`;

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.accent} aria-hidden="true" />

      <div className={styles.body}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {t('whatsNew.title')}
          </h2>
        </div>

        {CATEGORY_ORDER.map((category) => {
          const entries = release.entries.filter((entry) => entry.category === category);
          if (entries.length === 0) return null;
          const Icon = CATEGORY_ICON[category];
          return (
            <section key={category} className={styles.category} data-category={category}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>
                  <Icon width={14} height={14} aria-hidden="true" focusable="false" />
                </span>
                <h3 className={styles.categoryTitle}>{t(CATEGORY_TITLE_KEY[category])}</h3>
              </div>
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
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('whatsNew.close')}
        </button>
      </div>
    </dialog>
  );
}
