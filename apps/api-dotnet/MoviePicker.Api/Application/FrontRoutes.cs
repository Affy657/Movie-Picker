using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application;

public static class FrontRoutes
{
    public const string Home = "/";
    public const string Login = "/login";
    public const string Reset = "/reset";
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

    public const string EventDetailPattern = "/e/:slug";
    public const string NightRecapPattern = "/r/:slug";
    public const string ProfilePattern = "/u/:handle";
    public const string MoviePagePattern = "/film/:movieRef";
    public const string ShowPagePattern = "/serie/:movieRef";

    public const string RateQueryParam = "rate";
    public const string ReturnToQueryParam = "returnTo";
    public const string ResetTokenQueryParam = "token";

    public static string EventDetail(string slug) => Fill(EventDetailPattern, slug);

    public static string EventRating(string slug) => $"{EventDetail(slug)}?{RateQueryParam}";

    public static string NightRecap(string recapSlug) => Fill(NightRecapPattern, recapSlug);

    public static string Profile(string handle) => Fill(ProfilePattern, Uri.EscapeDataString(handle));

    public static string MoviePage(MovieMediaType mediaType, string movieRef) =>
        Fill(mediaType == MovieMediaType.Tv ? ShowPagePattern : MoviePagePattern, Uri.EscapeDataString(movieRef));

    public static string LoginReturningTo(string path) =>
        $"{Login}?{ReturnToQueryParam}={Uri.EscapeDataString(path)}";

    public static string ResetWithToken(string token) =>
        $"{Reset}?{ResetTokenQueryParam}={Uri.EscapeDataString(token)}";

    private static string Fill(string pattern, string value) => pattern[..pattern.LastIndexOf(':')] + value;
}
