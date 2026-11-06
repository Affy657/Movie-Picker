import type { paths } from '@/shared/api/generated/openapiSchema';

type VersionedRoute<Path> = Path extends `/api/v1/${infer Route}` ? Route : never;

type ContractRoute = VersionedRoute<keyof paths>;

type SegmentValue<Segment extends string> = Segment extends `{${string}}`
  ? string | number
  : Segment;

type RouteSegments<Route extends string> = Route extends `${infer Head}/${infer Tail}`
  ? [SegmentValue<Head>, ...RouteSegments<Tail>]
  : [SegmentValue<Route>];

type WithFilledParameters<Route extends string> =
  Route extends `${infer Head}{${string}}${infer Tail}`
    ? `${Head}${string}${WithFilledParameters<Tail>}`
    : Route;

export type ApiRouteSegments = RouteSegments<ContractRoute>;

export type ApiRoute = `/${WithFilledParameters<ContractRoute>}`;

export type ApiRequestPath = ApiRoute | `${ApiRoute}?${string}`;
