import { fetchApi } from '@/shared/api/client';

export type IdeaSuggestionCategory = 'idea' | 'bug' | 'improvement';

export interface CreateIdeaSuggestionBody {
  category: IdeaSuggestionCategory;
  title: string;
  description: string;
  pagePath?: string;
  appVersion?: string;
}

export async function createIdeaSuggestion(body: CreateIdeaSuggestionBody): Promise<void> {
  await fetchApi('/idea-suggestions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
