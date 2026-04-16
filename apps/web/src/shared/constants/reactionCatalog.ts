import type { LucideIcon } from 'lucide-react';
import { Ban, Eye, Meh, Sparkles, Trophy } from 'lucide-react';

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

/** Icônes associées à chaque réaction (libellé complet en title). */
export const REACTION_ICONS: Record<ReactionCatalogId, LucideIcon> = {
  already_seen: Eye,
  want_to_watch: Sparkles,
  not_interested: Ban,
  masterpiece: Trophy,
  meh: Meh,
};
