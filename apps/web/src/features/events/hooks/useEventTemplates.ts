import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEventTemplate,
  deleteEventTemplate,
  fetchEventTemplates,
  updateEventTemplate,
} from '@/features/events/api/eventTemplatesApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { EventTemplateData, SaveEventTemplateBody } from '@/features/events/types';

type Options = {
  onError: (message: string | null) => void;
  onSaved?: (template: EventTemplateData) => void;
};

export function useEventTemplates(enabled: boolean, { onError, onSaved }: Options) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lastSaved, setLastSaved] = useState<EventTemplateData | null>(null);

  const templatesQuery = useQuery({
    queryKey: queryKeys.eventTemplates.list,
    queryFn: fetchEventTemplates,
    enabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.eventTemplates.list });

  const fail = (error: unknown) => {
    setLastSaved(null);
    onError(getErrorMessage(error, t('events.settings.templates.error')));
  };

  const succeed = (template: EventTemplateData) => {
    onError(null);
    setLastSaved(template);
    onSaved?.(template);
    invalidate();
  };

  const createMutation = useMutation({
    mutationFn: (body: SaveEventTemplateBody) => createEventTemplate(body),
    onSuccess: succeed,
    onError: fail,
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; body: SaveEventTemplateBody }) =>
      updateEventTemplate(variables.id, variables.body),
    onSuccess: succeed,
    onError: fail,
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteEventTemplate(templateId),
    onSuccess: (_result, templateId) => {
      onError(null);
      setLastSaved((current) => (current?.id === templateId ? null : current));
      invalidate();
    },
    onError: fail,
  });

  const templates: EventTemplateData[] = templatesQuery.data ?? [];

  return {
    templates,
    lastSaved,
    isBusy: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    saveTemplate: (body: SaveEventTemplateBody) => createMutation.mutate(body),
    updateTemplate: (id: string, body: SaveEventTemplateBody) =>
      updateMutation.mutate({ id, body }),
    removeTemplate: (id: string) => deleteMutation.mutate(id),
  };
}
