import { Tabs } from '@/shared/components/Tabs';
import { useTranslation } from '@/shared/i18n';
import styles from '@/features/events/pages/MyEventsPage.module.css';

export type MyEventsTab = 'active' | 'history';

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

  return (
    <Tabs
      idBase="myevents"
      variant="pill"
      className={styles.tabs}
      ariaLabel={t('events.myEvents.title')}
      active={tab}
      onChange={onChange}
      tabs={[
        { key: 'active', label: t('events.myEvents.activesTab'), badge: totalActive },
        { key: 'history', label: t('events.myEvents.historySection'), badge: totalFinished },
      ]}
    />
  );
}
