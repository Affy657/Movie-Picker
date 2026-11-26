import { Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import {
  Bookmark,
  CalendarPlus,
  Clapperboard,
  Eye,
  Film,
  Inbox,
  Trophy,
  Users,
} from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/app/appQueryClient';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { LocaleProvider } from '@/shared/i18n';
import { AuthProvider } from '@/features/auth/contexts/AuthContext';
import UserThemeSync from '@/app/components/UserThemeSync';
import LocaleQuerySync from '@/app/components/LocaleQuerySync';
import AnalyticsSync from '@/app/components/AnalyticsSync';
import PushSubscriptionSync from '@/app/components/PushSubscriptionSync';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import AppShell from '@/app/components/AppShell';
import SessionGate from '@/app/components/SessionGate';
import ScrollToTop from '@/app/components/ScrollToTop';
import PageFallback from '@/app/components/PageFallback';
import { ROUTES } from '@/app/routes';
import { routeLazy } from '@/app/routeChunks';
import { useHomeShowcasePrefetch } from '@/features/movies/homeShowcasePrefetch';
import { usePublicProfilePrefetch } from '@/features/profile/publicProfilePrefetch';
import { useMoviePagePrefetch } from '@/app/pages/movie/moviePagePrefetch';
import { ICON_SIZE } from '@/shared/components/iconSize';

const HomePage = routeLazy('home');
const ShowcaseListPage = routeLazy('showcaseList');
const MovieCollectionsPage = routeLazy('movieCollections');
const CatalogListPage = routeLazy('catalogList');
const LandingPage = routeLazy('landing');
const CreateEvent = routeLazy('createEvent');
const EventDetail = routeLazy('eventDetail');
const NightRecapPage = routeLazy('nightRecap');
const LoginPage = routeLazy('login');
const RegisterPage = routeLazy('register');
const ForgotPasswordPage = routeLazy('forgotPassword');
const ResetPasswordPage = routeLazy('resetPassword');
const VerifyEmailPage = routeLazy('verifyEmail');
const OAuthCallbackPage = routeLazy('oauthCallback');
const AccountPage = routeLazy('account');
const LegalNoticePage = routeLazy('legalNotice');
const PrivacyPolicyPage = routeLazy('privacyPolicy');
const DonatePage = routeLazy('donate');
const TechPage = routeLazy('tech');
const ReleaseNotesPage = routeLazy('releaseNotes');
const MyEventsPage = routeLazy('myEvents');
const WatchlistPage = routeLazy('watchlist');
const MyListsPage = routeLazy('lists');
const MovieListPage = routeLazy('movieList');
const SavedListPage = routeLazy('savedList');
const JoinListPage = routeLazy('joinList');
const MyGroupsPage = routeLazy('groups');
const GroupPage = routeLazy('group');
const JoinGroupPage = routeLazy('joinGroup');
const MemberListsPage = routeLazy('memberLists');
const PublicListPage = routeLazy('publicList');
const WatchedMoviesPage = routeLazy('watchedMovies');
const MyProposalsPage = routeLazy('myProposals');
const NightMoviesPage = routeLazy('nightMovies');
const NotificationsPage = routeLazy('notifications');
const ProfilePage = routeLazy('profile');
const ProfileMoviesPage = routeLazy('profileMovies');
const ProfileProposalsPage = routeLazy('profileProposals');
const ProfileWatchlistPage = routeLazy('profileWatchlist');
const NotFoundPage = routeLazy('notFound');
const MoviePage = routeLazy('moviePage');

function GroupRoute({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionGate
      icon={<Users aria-hidden size={ICON_SIZE['3xl']} />}
      headingKey="groups.title"
      titleKey="groups.signedOutTitle"
      messageKey="groups.signedOutMessage"
    >
      {children}
    </SessionGate>
  );
}

function ListRoute({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionGate
      icon={<Bookmark aria-hidden size={ICON_SIZE['3xl']} />}
      headingKey="lists.title"
      titleKey="lists.signedOutTitle"
      messageKey="lists.signedOutMessage"
    >
      {children}
    </SessionGate>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.howItWorks} element={<LandingPage />} />
        <Route path={ROUTES.movieSearch} element={<ShowcaseListPage variant="search" />} />
        <Route path={ROUTES.movieCollections} element={<MovieCollectionsPage />} />
        <Route path={ROUTES.showcaseTrending} element={<ShowcaseListPage variant="trending" />} />
        <Route
          path={ROUTES.showcaseNowPlaying}
          element={<ShowcaseListPage variant="now-playing" />}
        />
        <Route
          path={ROUTES.showcaseMostProposed}
          element={<ShowcaseListPage variant="most-proposed" />}
        />
        <Route
          path={ROUTES.showcaseProviderPattern}
          element={<ShowcaseListPage variant="provider" />}
        />
        <Route
          path={ROUTES.showcaseRecommendationsPattern}
          element={<ShowcaseListPage variant="recommendations" />}
        />
        <Route path={ROUTES.showcaseThemePattern} element={<CatalogListPage variant="theme" />} />
        <Route
          path={ROUTES.movieCollectionPattern}
          element={<CatalogListPage variant="collection" />}
        />
        <Route path={ROUTES.moviePagePattern} element={<MoviePage mediaType="movie" />} />
        <Route path={ROUTES.showPagePattern} element={<MoviePage mediaType="tv" />} />
        <Route
          path={ROUTES.createEvent}
          element={
            <SessionGate
              icon={<CalendarPlus size={ICON_SIZE['3xl']} aria-hidden />}
              headingKey="nav.createEvent"
              headingHidden
              titleKey="events.create.signedOutTitle"
              messageKey="events.create.signedOutMessage"
              back={{ to: ROUTES.myEvents, labelKey: 'nav.myEvents' }}
            >
              <CreateEvent />
            </SessionGate>
          }
        />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
        <Route path={ROUTES.oauthCallback} element={<OAuthCallbackPage />} />
        <Route path={ROUTES.legalNotice} element={<LegalNoticePage />} />
        <Route path={ROUTES.privacyPolicy} element={<PrivacyPolicyPage />} />
        <Route path={ROUTES.donate} element={<DonatePage />} />
        <Route path={ROUTES.tech} element={<TechPage />} />
        <Route path={ROUTES.releaseNotes} element={<ReleaseNotesPage />} />
        <Route path={`${ROUTES.account}/*`} element={<AccountPage />} />
        <Route
          path={ROUTES.myEvents}
          element={
            <SessionGate
              icon={<CalendarPlus size={ICON_SIZE['3xl']} aria-hidden />}
              headingKey="events.myEvents.title"
              titleKey="events.myEvents.signedOutTitle"
              messageKey="events.myEvents.signedOutMessage"
            >
              <MyEventsPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.watchlist}
          element={
            <SessionGate
              icon={<Bookmark aria-hidden size={ICON_SIZE['3xl']} />}
              headingKey="watchlist.title"
              titleKey="watchlist.signedOutTitle"
              messageKey="watchlist.signedOutMessage"
            >
              <WatchlistPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.lists}
          element={
            <ListRoute>
              <MyListsPage />
            </ListRoute>
          }
        />
        <Route
          path={ROUTES.watchedMovies}
          element={
            <SessionGate
              icon={<Eye aria-hidden size={ICON_SIZE['3xl']} />}
              headingKey="watched.title"
              titleKey="lists.signedOutTitle"
              messageKey="lists.signedOutMessage"
            >
              <WatchedMoviesPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.myProposals}
          element={
            <SessionGate
              icon={<Film aria-hidden size={ICON_SIZE['3xl']} />}
              headingKey="myProposals.proposals.title"
              titleKey="lists.signedOutTitle"
              messageKey="lists.signedOutMessage"
            >
              <MyProposalsPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.myWinningProposals}
          element={
            <SessionGate
              icon={<Trophy aria-hidden size={ICON_SIZE['3xl']} />}
              headingKey="myProposals.winning.title"
              titleKey="lists.signedOutTitle"
              messageKey="lists.signedOutMessage"
            >
              <MyProposalsPage winningOnly />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.nightMovies}
          element={
            <SessionGate
              icon={<Clapperboard aria-hidden size={ICON_SIZE['3xl']} />}
              headingKey="nightMovies.title"
              titleKey="lists.signedOutTitle"
              messageKey="lists.signedOutMessage"
            >
              <NightMoviesPage />
            </SessionGate>
          }
        />
        <Route
          path={ROUTES.listPattern}
          element={
            <ListRoute>
              <MovieListPage />
            </ListRoute>
          }
        />
        <Route
          path={ROUTES.savedListPattern}
          element={
            <ListRoute>
              <SavedListPage />
            </ListRoute>
          }
        />
        <Route path={ROUTES.joinListPattern} element={<JoinListPage />} />
        <Route
          path={ROUTES.groups}
          element={
            <GroupRoute>
              <MyGroupsPage />
            </GroupRoute>
          }
        />
        <Route
          path={ROUTES.groupPattern}
          element={
            <GroupRoute>
              <GroupPage />
            </GroupRoute>
          }
        />
        <Route path={ROUTES.groupJoinPattern} element={<JoinGroupPage />} />
        <Route
          path={ROUTES.notifications}
          element={
            <SessionGate
              icon={<Inbox size={ICON_SIZE['3xl']} aria-hidden />}
              headingKey="notifications.inboxTitle"
              titleKey="notifications.signedOutTitle"
              messageKey="notifications.signedOutMessage"
            >
              <NotificationsPage />
            </SessionGate>
          }
        />
        <Route path={ROUTES.eventDetailPattern} element={<EventDetail />} />
        <Route path={ROUTES.nightRecapPattern} element={<NightRecapPage />} />
        <Route path={ROUTES.profileMoviesPattern} element={<ProfileMoviesPage />} />
        <Route path={ROUTES.profileProposalsPattern} element={<ProfileProposalsPage />} />
        <Route
          path={ROUTES.profileWinningProposalsPattern}
          element={<ProfileProposalsPage winningOnly />}
        />
        <Route path={ROUTES.profileWatchlistPattern} element={<ProfileWatchlistPage />} />
        <Route path={ROUTES.profileListsPattern} element={<MemberListsPage />} />
        <Route path={ROUTES.publicListPattern} element={<PublicListPage />} />
        <Route path={ROUTES.profilePattern} element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function AppRoutesWithErrorBoundary() {
  useHomeShowcasePrefetch();
  usePublicProfilePrefetch();
  useMoviePagePrefetch();
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <ConsentProvider>
            <AuthProvider>
              <UserThemeSync />
              <LocaleQuerySync />
              <AnalyticsSync />
              <PushSubscriptionSync />
              {children}
            </AuthProvider>
          </ConsentProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutesWithErrorBoundary />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
