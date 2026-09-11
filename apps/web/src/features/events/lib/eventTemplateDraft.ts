import {
  MAX_EVENT_PARTICIPANTS,
  MAX_EVENT_TEMPLATE_NAME_LENGTH,
  MAX_PROPOSALS_PER_PARTICIPANT,
  MAX_WINNERS_PER_EVENT,
  DEFAULT_EVENT_CONFIG,
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

export interface TemplateFormFields {
  themeEmoji: string;
  themeText: string;
  maxProposals: string;
  maxParticipants: string;
  maxVotes: string;
  wheelMode: WheelMode;
  richSharePreview: boolean;
  allowSeries: boolean;
  winnerCount: string;
}

function parseLimit(raw: string): number | null {
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
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
    maxProposalsPerParticipant: parseLimit(fields.maxProposals),
    maxParticipants: parseLimit(fields.maxParticipants),
    maxVotesPerParticipant: parseLimit(fields.maxVotes),
    wheelMode: fields.wheelMode,
    richSharePreview: fields.richSharePreview,
    allowSeries: fields.allowSeries,
    winnerCount: parseWinnerCount(fields.winnerCount),
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
