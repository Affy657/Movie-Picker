using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application;

public static class FrontRoutes
{
    public const string Home = "/";
    public const string Login = "/login";
    public const string Reset = "/reset";
    public const string VerifyEmail = "/verify-email";
    public const string OAuthCallback = "/auth/callback";
    public const string AccountIntegrations = "/settings/integrations";
    public const string Notifications = "/notifications";
    public const string HowItWorks = "/decouvrir";
    public const string ShowcaseTrending = "/films/tendances";
    public const string ShowcaseNowPlaying = "/films/au-cinema";
    public const string ShowcaseMostProposed = "/films/les-plus-proposes";
    public const string MovieCollections = "/films/collections";
    public const string Tech = "/tech";
    public const string Donate = "/soutenir";
    public const string Groups = "/groupes";

    public const string EventDetailPattern = "/e/:slug";
    public const string NightRecapPattern = "/r/:slug";
    public const string ProfilePattern = "/u/:handle";
    public const string MoviePagePattern = "/film/:movieRef";
    public const string ShowPagePattern = "/serie/:movieRef";
    public const string GroupPattern = "/groupes/:groupId";
    public const string GroupJoinPattern = "/g/:token/rejoindre";
    public const string ListJoinPattern = "/l/:token/rejoindre";

    public const string CreateEvent = "/new";
    public const string Register = "/register";
    public const string ForgotPassword = "/forgot-password";
    public const string Account = "/settings";
    public const string AccountProfile = "/settings/profil";
    public const string AccountPreferences = "/settings/preferences";
    public const string AccountNotifications = "/settings/notifications";
    public const string AccountSecurity = "/settings/securite";
    public const string MyEvents = "/my-events";
    public const string Watchlist = "/watchlist";
    public const string Lists = "/listes";
    public const string WatchedMovies = "/listes/films-vus";
    public const string MyProposals = "/listes/propositions";
    public const string MyWinningProposals = "/listes/propositions-gagnantes";
    public const string NightMovies = "/listes/films-des-soirees";
    public const string LegalNotice = "/mentions-legales";
    public const string PrivacyPolicy = "/politique-de-confidentialite";
    public const string ReleaseNotes = "/nouveautes";
    public const string MovieSearch = "/films/recherche";

    public const string ListPattern = "/listes/:listId";
    public const string SavedListPattern = "/listes/enregistrees/:savedListId";
    public const string ShowcaseRecommendationsPattern = "/films/similaires/:seedTmdbId";
    public const string ShowcaseProviderPattern = "/films/streaming/:provider";
    public const string ShowcaseThemePattern = "/films/theme/:theme";
    public const string MovieCollectionPattern = "/films/collection/:collectionId";
    public const string ProfileMoviesPattern = "/u/:handle/films";
    public const string ProfileProposalsPattern = "/u/:handle/propositions";
    public const string ProfileWinningProposalsPattern = "/u/:handle/propositions-gagnantes";
    public const string ProfileWatchlistPattern = "/u/:handle/watchlist";
    public const string ProfileListsPattern = "/u/:handle/listes";
    public const string PublicListPattern = "/u/:handle/listes/:listId";

    public const string RateQueryParam = "rate";
    public const string ReturnToQueryParam = "returnTo";
    public const string TokenQueryParam = "token";
    public const string EntryOriginQueryParam = "from";
    public const string OAuthErrorQueryParam = "oauthError";
    public const string OAuthLinkedQueryParam = "oauthLinked";
    public const string OAuthProviderQueryParam = "provider";
    public const string OAuthOutcomeQueryParam = "event";

    public static string EventDetail(string slug) => Fill(EventDetailPattern, slug);

    public static string EventRating(string slug) => $"{EventDetail(slug)}?{RateQueryParam}";

    public static string NightRecap(string recapSlug) => Fill(NightRecapPattern, recapSlug);

    public static string Profile(string handle) => Fill(ProfilePattern, Uri.EscapeDataString(handle));

    public static string MoviePage(MovieMediaType mediaType, string movieRef) =>
        Fill(mediaType == MovieMediaType.Tv ? ShowPagePattern : MoviePagePattern, Uri.EscapeDataString(movieRef));

    public static string LoginReturningTo(string path) =>
        $"{Login}?{ReturnToQueryParam}={Uri.EscapeDataString(path)}";

    public static string ResetWithToken(string token) => WithToken(Reset, token);

    public static string VerifyEmailWithToken(string token) => WithToken(VerifyEmail, token);

    public static string PrefixOf(string pattern) => pattern[..pattern.IndexOf(':')];

    private static string WithToken(string path, string token) =>
        $"{path}?{TokenQueryParam}={Uri.EscapeDataString(token)}";

    private static string Fill(string pattern, string value) => pattern[..pattern.LastIndexOf(':')] + value;
}
