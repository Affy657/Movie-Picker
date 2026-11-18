using System.Diagnostics.CodeAnalysis;

namespace MoviePicker.Api.Domain;

public sealed record UsageCount
{
    public const string EventLinkOpenedMetric = "event_link_opened";
    public const string JoinPromptClickedMetric = "join_prompt_clicked";
    public const string RecapViewedMetric = "recap_viewed";
    public const string RandomPickOpenedMetric = "random_pick_opened";
    public const string UserSignedUpMetric = "user_signed_up";
    public const string UserLoggedInMetric = "user_logged_in";
    public const string EventJoinedMetric = "event_joined";
    public const string LetterboxdLinkedMetric = "letterboxd_linked";
    public const string LetterboxdSyncedMetric = "letterboxd_synced";
    public const string LetterboxdChoicesConfirmedMetric = "letterboxd_choices_confirmed";
    public const string EmailMethod = "email";

    public static readonly TimeSpan NewAccountWindow = TimeSpan.FromDays(1);

    private const string OtherValue = "other";

    private static readonly string[] Viewers = ["visitor", "account"];
    private static readonly string[] EventStates = ["open", "full", "closed"];
    private static readonly string[] AuthMethods = [EmailMethod, "google", "github"];

    private static readonly (string Prefix, string Origin)[] OriginsByReturnPath =
    [
        ("/e/", "event"),
        ("/r/", "recap"),
        ("/l/", "list"),
        ("/u/", "profile")
    ];

    private static readonly Dictionary<string, HashSet<string>> ReportedVariants = new(StringComparer.Ordinal)
    {
        [EventLinkOpenedMetric] = Viewers
            .SelectMany(viewer => EventStates.Select(state => $"{viewer}.{state}"))
            .ToHashSet(StringComparer.Ordinal),
        [JoinPromptClickedMetric] = new(["login", "register"], StringComparer.Ordinal),
        [RecapViewedMetric] = new(Viewers, StringComparer.Ordinal),
        [RandomPickOpenedMetric] = new(["watchlist", "list", "saved_list"], StringComparer.Ordinal)
    };

    private UsageCount(string metric, string variant)
    {
        Metric = metric;
        Variant = variant;
    }

    public string Metric { get; }

    public string Variant { get; }

    public static bool TryParseReported(string? metric, string? variant, [NotNullWhen(true)] out UsageCount? count)
    {
        count = null;
        if (metric is null || variant is null)
            return false;
        if (!ReportedVariants.TryGetValue(metric, out var variants) || !variants.Contains(variant))
            return false;
        count = new UsageCount(metric, variant);
        return true;
    }

    public static string EntryOriginOf(string? returnTo)
    {
        if (string.IsNullOrEmpty(returnTo))
            return OtherValue;
        foreach (var (prefix, origin) in OriginsByReturnPath)
        {
            if (returnTo.StartsWith(prefix, StringComparison.Ordinal) && returnTo.Length > prefix.Length)
                return origin;
        }
        return OtherValue;
    }

    public static UsageCount SignedUp(string method, string? returnTo) =>
        new(UserSignedUpMetric, AuthVariant(method, returnTo));

    public static UsageCount LoggedIn(string method, string? returnTo) =>
        new(UserLoggedInMetric, AuthVariant(method, returnTo));

    public static UsageCount EventJoined(DateTimeOffset accountCreatedAt, DateTimeOffset now) =>
        new(EventJoinedMetric, now - accountCreatedAt < NewAccountWindow ? "new_account" : "existing_account");

    public static UsageCount LetterboxdSynced(bool forced) =>
        new(LetterboxdSyncedMetric, forced ? "manual" : "auto");

    public static UsageCount LetterboxdLinked(bool connected) =>
        new(LetterboxdLinkedMetric, connected ? "connected" : "disconnected");

    public static UsageCount LetterboxdChoicesConfirmed(int selectedCount) =>
        new(LetterboxdChoicesConfirmedMetric, selectedCount > 0 ? "selected" : "none");

    public static DateOnly DayOf(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, EventSchedule.ParisTimeZone).DateTime);

    private static string AuthVariant(string method, string? returnTo)
    {
        var knownMethod = AuthMethods.Contains(method, StringComparer.Ordinal) ? method : OtherValue;
        return $"{knownMethod}.{EntryOriginOf(returnTo)}";
    }
}
