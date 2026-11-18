import { fetchApi, SLOW_REQUEST_TIMEOUT_MS } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type IdeaSuggestionCategory = ApiSchemas['IdeaSuggestionCategory'];

export type CreateIdeaSuggestionBody = ApiSchemas['CreateIdeaSuggestionRequest'];

export async function createIdeaSuggestion(body: CreateIdeaSuggestionBody): Promise<void> {
  await fetchApi('/idea-suggestions', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: SLOW_REQUEST_TIMEOUT_MS,
  });
}
