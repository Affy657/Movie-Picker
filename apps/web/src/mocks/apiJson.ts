import { HttpResponse } from 'msw';
import type { components } from '@/shared/api/generated/openapiSchema';

export type ApiSchemas = components['schemas'];

type ApiSchemaName = keyof ApiSchemas;

export type ApiPayloadName = ApiSchemaName | `${ApiSchemaName}[]`;

export type ApiPayload<Name extends ApiPayloadName> =
  Name extends `${infer Item extends ApiSchemaName}[]`
    ? ApiSchemas[Item][]
    : Name extends ApiSchemaName
      ? ApiSchemas[Name]
      : never;

export function apiJson<Name extends ApiPayloadName = never>(
  payload: NoInfer<ApiPayload<Name>>,
  init?: ResponseInit
) {
  return HttpResponse.json(payload, init);
}

export function apiErrorJson(
  status: number,
  reason: string,
  params?: ApiSchemas['ApiErrorResponse']['params']
) {
  return apiJson<'ApiErrorResponse'>({ error: reason, code: status, reason, params }, { status });
}
