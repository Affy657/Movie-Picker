import { parseTheme } from '@/features/events/components/ThemeField';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  DEFAULT_VOTE_LIMIT,
  MAX_EVENT_PARTICIPANTS,
  MAX_EVENT_TEMPLATE_NAME_LENGTH,
  MAX_PROPOSALS_PER_PARTICIPANT,
  MAX_WINNERS_PER_EVENT,
  DEFAULT_EVENT_CONFIG,
  type EventConfigData,
  type EventConfigPatchPayload,
  type EventTemplateData,
  type WheelMode,
} from '@/features/events/types';

export interface TemplateConfigDraft {
  theme: string | null;
  maxProposalsPerParticipant: number | null;
  maxParticipants: number | null;
  maxVotesPerParticipant: number | null;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
  winnerCount: number;
}

export type ApplicableConfig = Pick<
  EventConfigData,
  | 'theme'
  | 'maxProposalsPerParticipant'
  | 'maxParticipants'
  | 'maxVotesPerParticipant'
  | 'wheelMode'
  | 'richSharePreview'
  | 'allowSeries'
  | 'winnerCount'
>;

export interface TemplateFormFields {
  themeEmoji: string;
  themeText: string;
  proposalLimitEnabled: boolean;
  maxProposals: string;
  participantLimitEnabled: boolean;
  maxParticipants: string;
  voteLimitEnabled: boolean;
  maxVotes: string;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
  winnerCount: string;
}

function parseLimit(raw: string): number | null {
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function isBelowCap(value: number | null | undefined, cap: number): value is number {
  return value != null && value > 0 && value < cap;
}

function parseCappedLimit(
  enabled: boolean,
  raw: string,
  cap: number,
  fallback: number
): number | null {
  if (!enabled) return null;
  const value = parseLimit(raw) ?? fallback;
  return value >= cap ? null : value;
}

export function limitFieldOnEnable(value: string, cap: number, fallback: number): string {
  return isBelowCap(parseLimit(value), cap) ? value : String(fallback);
}

function parseWinnerCount(raw: string): number {
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 1 || value > MAX_WINNERS_PER_EVENT)
    return DEFAULT_EVENT_CONFIG.winnerCount;
  return value;
}

export function buildTemplateDraft(fields: TemplateFormFields): TemplateConfigDraft {
  const theme = [fields.themeEmoji.trim(), fields.themeText.trim()].filter(Boolean).join(' ');
  return {
    theme: theme.length > 0 ? theme : null,
    maxProposalsPerParticipant: parseCappedLimit(
      fields.proposalLimitEnabled,
      fields.maxProposals,
      MAX_PROPOSALS_PER_PARTICIPANT,
      DEFAULT_PROPOSAL_LIMIT
    ),
    maxParticipants: parseCappedLimit(
      fields.participantLimitEnabled,
      fields.maxParticipants,
      MAX_EVENT_PARTICIPANTS,
      DEFAULT_PARTICIPANT_LIMIT
    ),
    maxVotesPerParticipant: fields.voteLimitEnabled
      ? (parseLimit(fields.maxVotes) ?? DEFAULT_VOTE_LIMIT)
      : null,
    wheelMode: fields.wheelMode,
    richSharePreview: fields.richSharePreview,
    allowSeries: fields.allowSeries,
    winnerCount: parseWinnerCount(fields.winnerCount),
  };
}

export function configToFields(config: ApplicableConfig): TemplateFormFields {
  const theme = parseTheme(config.theme);
  return {
    themeEmoji: theme.emoji,
    themeText: theme.text,
    proposalLimitEnabled: isBelowCap(
      config.maxProposalsPerParticipant,
      MAX_PROPOSALS_PER_PARTICIPANT
    ),
    maxProposals: String(config.maxProposalsPerParticipant ?? MAX_PROPOSALS_PER_PARTICIPANT),
    participantLimitEnabled: isBelowCap(config.maxParticipants, MAX_EVENT_PARTICIPANTS),
    maxParticipants: String(config.maxParticipants ?? MAX_EVENT_PARTICIPANTS),
    voteLimitEnabled: config.maxVotesPerParticipant != null,
    maxVotes: String(config.maxVotesPerParticipant ?? DEFAULT_VOTE_LIMIT),
    wheelMode: config.wheelMode,
    richSharePreview: config.richSharePreview ?? true,
    allowSeries: config.allowSeries ?? false,
    winnerCount: String(config.winnerCount),
  };
}

export function defaultTemplateFields(): TemplateFormFields {
  return {
    ...configToFields(DEFAULT_EVENT_CONFIG),
    maxProposals: String(DEFAULT_PROPOSAL_LIMIT),
    maxParticipants: String(DEFAULT_PARTICIPANT_LIMIT),
  };
}

export function isDefaultTemplateDraft(draft: TemplateConfigDraft): boolean {
  return isSameTemplateConfig(draft, buildTemplateDraft(defaultTemplateFields()));
}

export function draftToConfigPatch(draft: TemplateConfigDraft): EventConfigPatchPayload {
  return {
    theme: draft.theme ?? '',
    maxProposalsPerParticipant: draft.maxProposalsPerParticipant ?? 0,
    maxParticipants: draft.maxParticipants ?? 0,
    maxVotesPerParticipant: draft.maxVotesPerParticipant ?? 0,
    wheelMode: draft.wheelMode,
    richSharePreview: draft.richSharePreview,
    allowSeries: draft.allowSeries,
    winnerCount: draft.winnerCount,
  };
}

export function templateToDraft(template: EventTemplateData): TemplateConfigDraft {
  return {
    theme: template.theme,
    maxProposalsPerParticipant: template.maxProposalsPerParticipant,
    maxParticipants: template.maxParticipants,
    maxVotesPerParticipant: template.maxVotesPerParticipant ?? null,
    wheelMode: template.wheelMode,
    richSharePreview: template.richSharePreview,
    allowSeries: template.allowSeries,
    winnerCount: template.winnerCount,
  };
}

function isSameLimit(a: number | null, b: number | null, cap: number): boolean {
  return (a ?? cap) === (b ?? cap);
}

export function isSameTemplateConfig(a: TemplateConfigDraft, b: TemplateConfigDraft): boolean {
  return (
    a.theme === b.theme &&
    isSameLimit(
      a.maxProposalsPerParticipant,
      b.maxProposalsPerParticipant,
      MAX_PROPOSALS_PER_PARTICIPANT
    ) &&
    isSameLimit(a.maxParticipants, b.maxParticipants, MAX_EVENT_PARTICIPANTS) &&
    a.maxVotesPerParticipant === b.maxVotesPerParticipant &&
    a.wheelMode === b.wheelMode &&
    a.richSharePreview === b.richSharePreview &&
    a.allowSeries === b.allowSeries &&
    a.winnerCount === b.winnerCount
  );
}

export function suggestTemplateName(theme: string | null, taken: string[]): string {
  const takenLower = new Set(taken.map((name) => name.trim().toLowerCase()));
  const fromTheme = (theme ?? '').trim().slice(0, MAX_EVENT_TEMPLATE_NAME_LENGTH);
  if (fromTheme.length > 0 && !takenLower.has(fromTheme.toLowerCase())) return fromTheme;

  let index = 1;
  while (takenLower.has(`template ${index}`)) index += 1;
  return `Template ${index}`;
}
