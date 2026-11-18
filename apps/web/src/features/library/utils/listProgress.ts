import type { Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';

const ALL = 100;
const ALMOST_ALL = 99;

export function watchedPercent(watched: number, total: number): number | null {
  if (total <= 0) return null;
  if (watched >= total) return ALL;
  return Math.min(ALMOST_ALL, Math.round((watched / total) * ALL));
}

function formatPercent(watched: number, total: number, locale: LocaleCode): string {
  const percent = watchedPercent(watched, total) ?? 0;
  return new Intl.NumberFormat(locale, { style: 'percent' }).format(percent / ALL);
}

export function listProgressLabel(
  watched: number,
  total: number,
  t: Translate,
  locale: LocaleCode
): string {
  return t('lists.progress.percent', { percent: formatPercent(watched, total, locale) });
}

export function listProgressDetail(
  watched: number,
  total: number,
  t: Translate,
  locale: LocaleCode
): string {
  const percent = formatPercent(watched, total, locale);
  if (watched === 1) return t('lists.progress.detailOne', { total, percent });
  return t('lists.progress.detail', { watched, total, percent });
}

interface ProgressOfList {
  itemCount: number;
  watchedCount?: number | null;
}

function shareOf(list: ProgressOfList): number {
  return list.itemCount > 0 ? (list.watchedCount ?? 0) / list.itemCount : -1;
}

export function compareListProgress(a: ProgressOfList, b: ProgressOfList): number {
  return shareOf(a) - shareOf(b);
}
