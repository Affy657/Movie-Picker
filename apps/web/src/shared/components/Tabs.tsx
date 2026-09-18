import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { useTablistKeyboard } from '@/shared/hooks/useTablistKeyboard';
import { useRailScroll } from '@/shared/hooks/useRailScroll';
import styles from './Tabs.module.css';

type ScrollFade = 'both' | 'start' | 'end' | undefined;

function scrollFade(canScrollBack: boolean, canScrollForward: boolean): ScrollFade {
  if (canScrollBack && canScrollForward) return 'both';
  if (canScrollBack) return 'start';
  if (canScrollForward) return 'end';
  return undefined;
}

export interface TabDef<T extends string> {
  key: T;
  label: string;
  icon?: ReactNode;
  iconOnly?: boolean;
  badge?: number;
  disabled?: boolean;
}

const LINE_SCROLL_PX = 16;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

function wheelDistance(event: WheelEvent, pageWidth: number): number {
  if (event.deltaMode === DOM_DELTA_LINE) return event.deltaY * LINE_SCROLL_PX;
  if (event.deltaMode === DOM_DELTA_PAGE) return event.deltaY * pageWidth;
  return event.deltaY;
}

function useWheelToHorizontal(listRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.deltaX !== 0) return;
      const maxScroll = list.scrollWidth - list.clientWidth;
      if (maxScroll <= 0) return;
      const atStart = event.deltaY < 0 && list.scrollLeft <= 0;
      const atEnd = event.deltaY > 0 && list.scrollLeft >= maxScroll;
      if (atStart || atEnd) return;
      event.preventDefault();
      list.scrollBy({ left: wheelDistance(event, list.clientWidth), behavior: 'instant' });
    };
    list.addEventListener('wheel', onWheel, { passive: false });
    return () => list.removeEventListener('wheel', onWheel);
  }, [listRef]);
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
  variant?: 'underline' | 'pill';
}

export function Tabs<T extends string>({
  idBase,
  tabs,
  active,
  onChange,
  ariaLabel,
  className,
  variant = 'underline',
}: Readonly<TabsProps<T>>) {
  const keys = tabs.filter((tab) => !tab.disabled).map((tab) => tab.key);
  const { onKeyDown, registerTab, tabIndexFor } = useTablistKeyboard(keys, active, onChange);
  const isPill = variant === 'pill';
  const listRef = useRef<HTMLDivElement>(null);
  const { canScrollBack, canScrollForward } = useRailScroll(listRef, tabs.length);
  useWheelToHorizontal(listRef);

  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector('[aria-selected="true"]');
    if (!list || !selected) return;
    const listBounds = list.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    const overflowStart = listBounds.left - selectedBounds.left;
    const overflowEnd = selectedBounds.right - listBounds.right;
    if (overflowStart <= 0 && overflowEnd <= 0) return;
    const delta = overflowStart > 0 ? -overflowStart : overflowEnd;
    list.scrollTo({ left: list.scrollLeft + delta, behavior: 'instant' });
  }, [active]);

  const fade = scrollFade(canScrollBack, canScrollForward);

  return (
    <div className={clsx(styles.listWrap, isPill && styles.pillWrap, className)}>
      <div
        ref={listRef}
        className={clsx(styles.list, isPill && styles.pillList)}
        role="tablist"
        tabIndex={-1}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        data-fade={fade}
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
              disabled={tab.disabled}
              aria-label={tab.iconOnly ? tab.label : undefined}
              className={clsx(
                styles.tab,
                isPill && styles.pillTab,
                isActive && (isPill ? styles.pillTabActive : styles.tabActive)
              )}
              onClick={() => onChange(tab.key)}
            >
              {tab.icon}
              {tab.iconOnly ? null : <span className={styles.tabLabel}>{tab.label}</span>}
              {tab.badge != null && <span className={styles.tabBadge}>{tab.badge}</span>}
            </button>
          );
        })}
      </div>
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
