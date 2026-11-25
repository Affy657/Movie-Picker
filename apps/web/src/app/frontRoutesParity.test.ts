import { describe, expect, it } from 'vitest';
import frontRoutesSource from '../../../api-dotnet/MoviePicker.Api/Application/FrontRoutes.cs?raw';
import { SENSITIVE_QUERY_PARAMETERS } from '@/shared/utils/sensitiveUrl';
import { ENTRY_ORIGIN_QUERY_PARAM } from '@/shared/analytics/entryOrigin';
import {
  OAUTH_ERROR_QUERY_PARAM,
  OAUTH_LINKED_QUERY_PARAM,
  OAUTH_OUTCOME_QUERY_PARAM,
  OAUTH_PROVIDER_QUERY_PARAM,
} from '@/features/auth/oauthQueryParams';
import { RATE_QUERY_PARAM, ROUTES, withReturnTo } from './routes';

const declaredByTheApi = Object.fromEntries(
  Array.from(
    frontRoutesSource.matchAll(/public const string (\w+) = "([^"]*)";/g),
    ([, name, value]) => [name, value]
  )
);

function firstQueryKeyOf(path: string): string | undefined {
  return [...new URL(path, 'https://movie-picker.test').searchParams.keys()][0];
}

const routesOfTheWebApp = {
  Home: ROUTES.home,
  Login: ROUTES.login,
  Reset: ROUTES.resetPassword,
  OAuthCallback: ROUTES.oauthCallback,
  AccountIntegrations: ROUTES.accountIntegrations,
  Notifications: ROUTES.notifications,
  HowItWorks: ROUTES.howItWorks,
  ShowcaseTrending: ROUTES.showcaseTrending,
  ShowcaseNowPlaying: ROUTES.showcaseNowPlaying,
  ShowcaseMostProposed: ROUTES.showcaseMostProposed,
  MovieCollections: ROUTES.movieCollections,
  Tech: ROUTES.tech,
  Donate: ROUTES.donate,
  EventDetailPattern: ROUTES.eventDetailPattern,
  NightRecapPattern: ROUTES.nightRecapPattern,
  ProfilePattern: ROUTES.profilePattern,
  MoviePagePattern: ROUTES.moviePagePattern,
  ShowPagePattern: ROUTES.showPagePattern,
  Groups: ROUTES.groups,
  GroupPattern: ROUTES.groupPattern,
  GroupJoinPattern: ROUTES.groupJoinPattern,
  ListJoinPattern: ROUTES.joinListPattern,
  CreateEvent: ROUTES.createEvent,
  Register: ROUTES.register,
  ForgotPassword: ROUTES.forgotPassword,
  Account: ROUTES.account,
  AccountProfile: ROUTES.accountProfile,
  AccountPreferences: ROUTES.accountPreferences,
  AccountNotifications: ROUTES.accountNotifications,
  AccountSecurity: ROUTES.accountSecurity,
  MyEvents: ROUTES.myEvents,
  Watchlist: ROUTES.watchlist,
  Lists: ROUTES.lists,
  WatchedMovies: ROUTES.watchedMovies,
  MyProposals: ROUTES.myProposals,
  MyWinningProposals: ROUTES.myWinningProposals,
  NightMovies: ROUTES.nightMovies,
  LegalNotice: ROUTES.legalNotice,
  PrivacyPolicy: ROUTES.privacyPolicy,
  ReleaseNotes: ROUTES.releaseNotes,
  MovieSearch: ROUTES.movieSearch,
  ListPattern: ROUTES.listPattern,
  SavedListPattern: ROUTES.savedListPattern,
  ShowcaseRecommendationsPattern: ROUTES.showcaseRecommendationsPattern,
  ShowcaseProviderPattern: ROUTES.showcaseProviderPattern,
  ShowcaseThemePattern: ROUTES.showcaseThemePattern,
  MovieCollectionPattern: ROUTES.movieCollectionPattern,
  ProfileMoviesPattern: ROUTES.profileMoviesPattern,
  ProfileProposalsPattern: ROUTES.profileProposalsPattern,
  ProfileWinningProposalsPattern: ROUTES.profileWinningProposalsPattern,
  ProfileWatchlistPattern: ROUTES.profileWatchlistPattern,
  ProfileListsPattern: ROUTES.profileListsPattern,
  PublicListPattern: ROUTES.publicListPattern,
  RateQueryParam: RATE_QUERY_PARAM,
  ReturnToQueryParam: firstQueryKeyOf(withReturnTo(ROUTES.login, ROUTES.eventDetail('soiree'))),
  ResetTokenQueryParam: 'token',
  EntryOriginQueryParam: ENTRY_ORIGIN_QUERY_PARAM,
  OAuthErrorQueryParam: OAUTH_ERROR_QUERY_PARAM,
  OAuthLinkedQueryParam: OAUTH_LINKED_QUERY_PARAM,
  OAuthProviderQueryParam: OAUTH_PROVIDER_QUERY_PARAM,
  OAuthOutcomeQueryParam: OAUTH_OUTCOME_QUERY_PARAM,
};

describe('front routes built by the API', () => {
  it('reads the paths and query parameters declared by FrontRoutes.cs', () => {
    expect(Object.keys(declaredByTheApi)).toContain('EventDetailPattern');
  });

  it('declares only routes of the web app, each with its current value', () => {
    expect(declaredByTheApi).toEqual(routesOfTheWebApp);
  });

  it('fills a pattern the way the web app builds the same page', () => {
    const fill = (pattern: string, value: string) =>
      pattern.slice(0, pattern.lastIndexOf(':')) + value;
    expect(fill(ROUTES.eventDetailPattern, 'soiree')).toBe(ROUTES.eventDetail('soiree'));
    expect(fill(ROUTES.nightRecapPattern, 'recap')).toBe(ROUTES.nightRecap('recap'));
    expect(fill(ROUTES.profilePattern, 'lea')).toBe(ROUTES.profile('lea'));
    expect(fill(ROUTES.groupPattern, 'g1')).toBe(ROUTES.group('g1'));
    expect(fill(ROUTES.moviePagePattern, '27205')).toBe(ROUTES.moviePage({ tmdbId: 27205 }));
    expect(fill(ROUTES.showPagePattern, '1399')).toBe(
      ROUTES.moviePage({ tmdbId: 1399, mediaType: 'tv' })
    );
    expect(`${ROUTES.eventDetail('soiree')}?${RATE_QUERY_PARAM}`).toBe(
      ROUTES.eventDetailRating('soiree')
    );
  });

  it('carries the reset token in a query parameter redacted from logs', () => {
    expect(SENSITIVE_QUERY_PARAMETERS).toContain(declaredByTheApi.ResetTokenQueryParam);
  });
});
