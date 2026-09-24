import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEventTemplate,
  deleteEventTemplate,
  fetchEventTemplates,
  updateEventTemplate,
} from '@/features/events/api/eventTemplatesApi';
import {
  isSameTemplateConfig,
  templateToDraft,
  type TemplateConfigDraft,
} from '@/features/events/lib/eventTemplateDraft';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';
import type { EventTemplateData, SaveEventTemplateBody } from '@/features/events/types';

type Options = {
  draft: TemplateConfigDraft;
  onError: (message: string | null) => void;
  onApply: (template: EventTemplateData) => void;
};

type TemplateUpdate = { id: string; body: SaveEventTemplateBody };

function putTemplate({ id, body }: TemplateUpdate) {
  return updateEventTemplate(id, body);
}

export function useEventTemplates(enabled: boolean, { draft, onError, onApply }: Options) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [appliedId, setAppliedId] = useState<string | null>(null);
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
    setAppliedId(template.id);
    invalidate();
  };

  const createMutation = useMutation({
    mutationFn: (body: SaveEventTemplateBody) => createEventTemplate(body),
    onSuccess: succeed,
    onError: fail,
  });

  const updateMutation = useMutation({
    mutationFn: putTemplate,
    onSuccess: succeed,
    onError: fail,
  });

  const renameMutation = useMutation({
    mutationFn: putTemplate,
    onSuccess: (template) => {
      onError(null);
      setLastSaved((current) => (current?.id === template.id ? template : current));
      invalidate();
    },
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
  const appliedTemplate = templates.find((template) => template.id === appliedId) ?? null;
  const matchingTemplate =
    appliedTemplate !== null && isSameTemplateConfig(draft, templateToDraft(appliedTemplate))
      ? appliedTemplate
      : null;

  return {
    templates,
    appliedTemplate,
    matchingTemplate,
    lastSaved,
    isBusy:
      createMutation.isPending ||
      updateMutation.isPending ||
      renameMutation.isPending ||
      deleteMutation.isPending,
    apply: (template: EventTemplateData) => {
      setAppliedId(template.id);
      onApply(template);
    },
    saveAs: (name: string) => createMutation.mutate({ ...draft, name }),
    updateApplied: (template: EventTemplateData) =>
      updateMutation.mutate({ id: template.id, body: { ...draft, name: template.name } }),
    rename: (template: EventTemplateData, name: string) =>
      renameMutation.mutate({ id: template.id, body: { ...templateToDraft(template), name } }),
    remove: (template: EventTemplateData) => deleteMutation.mutate(template.id),
    forget: useCallback(() => setAppliedId(null), []),
  };
}
