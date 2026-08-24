import { useId } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { ChevronRight, Sparkles, Wand2, Wrench } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import {
  whatsNewLinkPath,
  type WhatsNewAction,
  type WhatsNewCategory,
  type WhatsNewEntry,
  type WhatsNewRelease,
} from '@/shared/whatsNew';
import styles from './WhatsNewModal.module.css';

type Props = {
  open: boolean;
  release: WhatsNewRelease;
  profileHandle?: string | null;
  onClose: () => void;
  onAction?: (action: WhatsNewAction) => void;
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

function EntryChevron() {
  return (
    <span className={styles.entryChevron}>
      <ChevronRight width={16} height={16} aria-hidden="true" focusable="false" />
    </span>
  );
}

export default function WhatsNewModal({
  open,
  release,
  profileHandle = null,
  onClose,
  onAction,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const dialogRef = useModalDialog(open, onClose);
  const reactId = useId();
  const titleId = `whats-new-modal-title-${reactId}`;

  const renderEntryContent = (entry: WhatsNewEntry) => (
    <span className={styles.entryText}>
      <span className={styles.entryTitle}>{t(entry.titleKey)}</span>
      <span className={styles.entryDescription}>{t(entry.descriptionKey)}</span>
    </span>
  );

  const renderEntryBody = (entry: WhatsNewEntry) => {
    const to = whatsNewLinkPath(entry.link, profileHandle);
    const action = entry.action;
    if (action && onAction) {
      return (
        <button
          type="button"
          className={clsx(styles.entryInner, styles.entryLink, styles.entryButton)}
          onClick={() => {
            onClose();
            onAction(action);
          }}
        >
          {renderEntryContent(entry)}
          <EntryChevron />
        </button>
      );
    }
    if (to) {
      return (
        <Link to={to} className={clsx(styles.entryInner, styles.entryLink)} onClick={onClose}>
          {renderEntryContent(entry)}
          <EntryChevron />
        </Link>
      );
    }
    return <div className={styles.entryInner}>{renderEntryContent(entry)}</div>;
  };

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
                  <li key={entry.titleKey} className={styles.entry}>
                    {renderEntryBody(entry)}
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
