import type { Translate } from '@/shared/i18n';

export interface ListEmptyTexts {
  title: string;
  message: string;
}

export function listPageLabels(name: string, empty: ListEmptyTexts, t: Translate) {
  return {
    listAria: t('lists.page.listAria', { name }),
    loading: t('lists.page.loading'),
    loadError: t('lists.page.loadError'),
    searchLabel: t('lists.page.searchLabel'),
    searchPlaceholder: t('lists.page.searchPlaceholder', { name }),
    searchPlaceholderShort: t('lists.page.searchPlaceholderShort'),
    emptyTitle: empty.title,
    emptyMessage: empty.message,
  };
}
