/** Aligné sur `UserProfileResponse` (API .NET). */
export type UiThemePreference = 'system' | 'light' | 'dark';

export interface UserProfile {
  userId: string;
  displayName: string;
  emailMasked: string;
  uiTheme: UiThemePreference;
}

/** Aligné sur `MyEventSummaryDto.Lifecycle` (API) : upcoming | live | finished */
export type MyEventLifecycle = 'upcoming' | 'live' | 'finished';

export interface MyEventSummary {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  isCreator: boolean;
  isParticipant: boolean;
  /** Présent sur API à jour ; normaliser côté UI si absent. */
  lifecycle?: MyEventLifecycle | string;
}

export interface MyEventsListResponse {
  events: MyEventSummary[];
}
