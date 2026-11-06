import { fetchApi, SLOW_REQUEST_TIMEOUT_MS } from '@/shared/api/client';

export type IdeaSuggestionCategory = 'idea' | 'bug' | 'improvement';

export interface IdeaSuggestionAttachmentBody {
  fileName: string;
  contentType: string;
  base64Content: string;
}

export interface CreateIdeaSuggestionBody {
  category: IdeaSuggestionCategory;
  title: string;
  description: string;
  pagePath?: string;
  appVersion?: string;
  attachments?: IdeaSuggestionAttachmentBody[];
}

export async function createIdeaSuggestion(body: CreateIdeaSuggestionBody): Promise<void> {
  await fetchApi('/idea-suggestions', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: SLOW_REQUEST_TIMEOUT_MS,
  });
}
