export interface ShowcaseListArrival {
  collectionName?: string;
  seedTitle?: string;
}

function nonEmptyText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function readShowcaseListArrival(state: unknown): ShowcaseListArrival {
  if (typeof state !== 'object' || state === null) return {};
  const { collectionName, seedTitle } = state as Record<string, unknown>;
  return { collectionName: nonEmptyText(collectionName), seedTitle: nonEmptyText(seedTitle) };
}
