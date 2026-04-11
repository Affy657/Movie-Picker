/** Clés stables alignées sur `ReactionCatalog` (API .NET). */
export const REACTION_CATALOG_IDS = [
  'already_seen',
  'want_to_watch',
  'not_interested',
  'masterpiece',
  'meh',
] as const;

export type ReactionCatalogId = (typeof REACTION_CATALOG_IDS)[number];

export const REACTION_LABELS: Record<ReactionCatalogId, string> = {
  already_seen: 'Déjà vu',
  want_to_watch: 'Envie de voir',
  not_interested: 'Pas intéressé',
  masterpiece: 'Chef-d’œuvre',
  meh: 'Bof',
};

/** Pastilles courtes côté liste (accessibilité : libellé complet en title). */
export const REACTION_EMOJI: Record<ReactionCatalogId, string> = {
  already_seen: '👁',
  want_to_watch: '✨',
  not_interested: '🚫',
  masterpiece: '🏆',
  meh: '😐',
};
