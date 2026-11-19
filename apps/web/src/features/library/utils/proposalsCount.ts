import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export type ProposalsKind = 'proposals' | 'winning';

export function proposalsCountLabel(count: number, kind: ProposalsKind, t: Translate): string {
  return pluralizeCount(count, `myProposals.${kind}.countOne`, `myProposals.${kind}.count`, t, {
    count,
  });
}
