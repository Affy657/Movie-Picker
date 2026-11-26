interface Page<T> {
  items?: T[] | null;
  hasMore?: boolean;
}

export const READ_ALL_PAGES_MAX = 20;

export async function readAllPages<T>(
  fetchPage: (skip: number) => Promise<Page<T> | null | undefined>
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < READ_ALL_PAGES_MAX; page++) {
    const response = await fetchPage(items.length);
    const pageItems = Array.isArray(response?.items) ? response.items : [];
    items.push(...pageItems);
    if (response?.hasMore !== true || pageItems.length === 0) break;
  }
  return items;
}
