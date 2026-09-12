import clsx from 'clsx';
import { useTablistKeyboard } from '@/shared/hooks/useTablistKeyboard';
import { useTranslation } from '@/shared/i18n';
import styles from '@/features/events/pages/MyEventsPage.module.css';

export type MyEventsTab = 'active' | 'history';

const TABS: readonly MyEventsTab[] = ['active', 'history'];

interface MyEventsTabsProps {
  tab: MyEventsTab;
  onChange: (tab: MyEventsTab) => void;
  totalActive: number;
  totalFinished: number;
}

export default function MyEventsTabs({
  tab,
  onChange,
  totalActive,
  totalFinished,
}: Readonly<MyEventsTabsProps>) {
  const { t } = useTranslation();
  const tablist = useTablistKeyboard(TABS, tab, onChange);

  return (
    <div
      className={styles.tabs}
      role="tablist"
      tabIndex={-1}
      aria-label={t('events.myEvents.title')}
      onKeyDown={tablist.onKeyDown}
    >
      <button
        ref={tablist.registerTab('active')}
        type="button"
        role="tab"
        id="myevents-tab-active"
        aria-selected={tab === 'active'}
        aria-controls="myevents-panel-active"
        tabIndex={tablist.tabIndexFor('active')}
        className={clsx(styles.tab, tab === 'active' && styles.tabActive)}
        onClick={() => onChange('active')}
      >
        {t('events.myEvents.activesTab')}
        <span className={styles.tabCount}>{totalActive}</span>
      </button>
      <button
        ref={tablist.registerTab('history')}
        type="button"
        role="tab"
        id="myevents-tab-history"
        aria-selected={tab === 'history'}
        aria-controls="myevents-panel-history"
        tabIndex={tablist.tabIndexFor('history')}
        className={clsx(styles.tab, tab === 'history' && styles.tabActive)}
        onClick={() => onChange('history')}
      >
        {t('events.myEvents.historySection')}
        <span className={styles.tabCount}>{totalFinished}</span>
      </button>
    </div>
  );
}
