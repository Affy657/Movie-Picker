export const ACCOUNT_DELETED_STATE = { accountDeleted: true } as const;

export function arrivesFromDeletion(state: unknown): boolean {
  return (
    state !== null &&
    typeof state === 'object' &&
    (state as Record<string, unknown>).accountDeleted === true
  );
}
