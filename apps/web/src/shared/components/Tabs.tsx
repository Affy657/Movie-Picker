import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTablistKeyboard } from '@/shared/hooks/useTablistKeyboard';
import styles from './Tabs.module.css';

export interface TabDef<T extends string> {
  key: T;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

function tabButtonId(idBase: string, key: string): string {
  return `${idBase}-tab-${key}`;
}

function tabPanelId(idBase: string, key: string): string {
  return `${idBase}-panel-${key}`;
}

interface TabsProps<T extends string> {
  idBase: string;
  tabs: ReadonlyArray<TabDef<T>>;
  active: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({
  idBase,
  tabs,
  active,
  onChange,
  ariaLabel,
  className,
}: Readonly<TabsProps<T>>) {
  const keys = tabs.map((tab) => tab.key);
  const { onKeyDown, registerTab, tabIndexFor } = useTablistKeyboard(keys, active, onChange);

  return (
    <div
      className={clsx(styles.list, className)}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={registerTab(tab.key)}
            type="button"
            role="tab"
            id={tabButtonId(idBase, tab.key)}
            aria-selected={isActive}
            aria-controls={tabPanelId(idBase, tab.key)}
            tabIndex={tabIndexFor(tab.key)}
            className={clsx(styles.tab, isActive && styles.tabActive)}
            onClick={() => onChange(tab.key)}
          >
            {tab.icon}
            <span className={styles.tabLabel}>{tab.label}</span>
            {tab.badge != null && <span className={styles.tabBadge}>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps<T extends string> {
  idBase: string;
  tabKey: T;
  active: boolean;
  className?: string;
  children: ReactNode;
}

export function TabPanel<T extends string>({
  idBase,
  tabKey,
  active,
  className,
  children,
}: Readonly<TabPanelProps<T>>) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={tabPanelId(idBase, tabKey)}
      aria-labelledby={tabButtonId(idBase, tabKey)}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
