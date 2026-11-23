import {
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
} from '@/shared/utils/safeStorage';
import {
  defaultTemplateFields,
  type TemplateFormFields,
} from '@/features/events/lib/eventTemplateDraft';
import type { WheelMode } from '@/features/events/types';

export const CREATE_EVENT_DRAFT_KEY = 'mp.create-event-draft';

export type CreateEventDraftSnapshot = {
  typedTitle: string | null;
  date: string;
  time: string;
  fields: TemplateFormFields;
  groupId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const WHEEL_MODES: ReadonlySet<unknown> = new Set<WheelMode>(['strictRandom', 'weightedByVotes']);

function pick<K extends keyof TemplateFormFields>(
  raw: Record<string, unknown>,
  fallback: TemplateFormFields,
  key: K
): TemplateFormFields[K] {
  const value = raw[key];
  return typeof value === typeof fallback[key] ? (value as TemplateFormFields[K]) : fallback[key];
}

function readFields(raw: unknown): TemplateFormFields {
  const fields = defaultTemplateFields();
  if (!isRecord(raw)) return fields;
  return {
    themeEmoji: pick(raw, fields, 'themeEmoji'),
    themeText: pick(raw, fields, 'themeText'),
    proposalLimitEnabled: pick(raw, fields, 'proposalLimitEnabled'),
    maxProposals: pick(raw, fields, 'maxProposals'),
    participantLimitEnabled: pick(raw, fields, 'participantLimitEnabled'),
    maxParticipants: pick(raw, fields, 'maxParticipants'),
    voteLimitEnabled: pick(raw, fields, 'voteLimitEnabled'),
    maxVotes: pick(raw, fields, 'maxVotes'),
    wheelMode: WHEEL_MODES.has(raw.wheelMode) ? (raw.wheelMode as WheelMode) : fields.wheelMode,
    richSharePreview: pick(raw, fields, 'richSharePreview'),
    allowSeries: pick(raw, fields, 'allowSeries'),
    winnerCount: pick(raw, fields, 'winnerCount'),
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readCreateEventDraft(): CreateEventDraftSnapshot | null {
  const stored = safeSessionStorageGet(CREATE_EVENT_DRAFT_KEY);
  if (!stored) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.date !== 'string' || typeof parsed.time !== 'string') {
    return null;
  }
  return {
    typedTitle: stringOrNull(parsed.typedTitle),
    date: parsed.date,
    time: parsed.time,
    fields: readFields(parsed.fields),
    groupId: stringOrNull(parsed.groupId),
  };
}

export function saveCreateEventDraft(draft: CreateEventDraftSnapshot): void {
  safeSessionStorageSet(CREATE_EVENT_DRAFT_KEY, JSON.stringify(draft));
}

export function forgetCreateEventDraft(): void {
  safeSessionStorageRemove(CREATE_EVENT_DRAFT_KEY);
}
