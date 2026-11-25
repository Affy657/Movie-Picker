using System.Diagnostics.CodeAnalysis;

namespace MoviePicker.Api.Domain;

public sealed record UsageCount
{
    public const string EventLinkOpenedMetric = "event_link_opened";
    public const string JoinPromptClickedMetric = "join_prompt_clicked";
    public const string RecapViewedMetric = "recap_viewed";
    public const string RandomPickOpenedMetric = "random_pick_opened";
    public const string GlobalSearchResultOpenedMetric = "global_search_result_opened";
    public const string UserSignedUpMetric = "user_signed_up";
    public const string UserLoggedInMetric = "user_logged_in";
    public const string EventJoinedMetric = "event_joined";
    public const string LetterboxdLinkedMetric = "letterboxd_linked";
    public const string LetterboxdSyncedMetric = "letterboxd_synced";
    public const string LetterboxdChoicesConfirmedMetric = "letterboxd_choices_confirmed";
    public const string FormMethod = "email";

    public static readonly TimeSpan NewAccountWindow = TimeSpan.FromDays(1);

    public const string EventOrigin = "event";
    public const string RecapOrigin = "recap";
    public const string ListOrigin = "list";
    public const string ProfileOrigin = "profile";
    public const string OtherOrigin = OtherValue;

    private const string OtherValue = "other";

    private static readonly string[] Viewers = ["visitor", "account"];
    private static readonly string[] EventStates = ["open", "full", "closed"];
    private static readonly string[] AuthMethods = [FormMethod, "google", "github"];
    private static readonly string[] EntryOrigins = [EventOrigin, RecapOrigin, ListOrigin, ProfileOrigin];

    private static readonly Dictionary<string, HashSet<string>> ReportedVariants = new(StringComparer.Ordinal)
    {
        [EventLinkOpenedMetric] = Viewers
            .SelectMany(viewer => EventStates.Select(state => $"{viewer}.{state}"))
            .ToHashSet(StringComparer.Ordinal),
        [JoinPromptClickedMetric] = new(["login", "register"], StringComparer.Ordinal),
        [RecapViewedMetric] = new(Viewers, StringComparer.Ordinal),
        [RandomPickOpenedMetric] = new(["watchlist", "list", "saved_list", "catalog"], StringComparer.Ordinal),
        [GlobalSearchResultOpenedMetric] = new(
            ["title", "all_titles", "saga", "member", "night", "group", "list", "public_list"],
            StringComparer.Ordinal)
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

    public static bool IsEntryOrigin([NotNullWhen(true)] string? origin) =>
        origin is not null && Array.Exists(EntryOrigins, known => known == origin);

    public static UsageCount SignedUp(string method, string entryOrigin) =>
        new(UserSignedUpMetric, AuthVariant(method, entryOrigin));

    public static UsageCount LoggedIn(string method, string entryOrigin) =>
        new(UserLoggedInMetric, AuthVariant(method, entryOrigin));

    public static UsageCount EventJoined(DateTimeOffset accountCreatedAt, DateTimeOffset now) =>
        new(EventJoinedMetric, now - accountCreatedAt < NewAccountWindow ? "new_account" : "existing_account");

    public static UsageCount LetterboxdSynced(bool forced) =>
        new(LetterboxdSyncedMetric, forced ? "manual" : "auto");

    public static UsageCount LetterboxdLinked(bool connected) =>
        new(LetterboxdLinkedMetric, connected ? "connected" : "disconnected");

    public static UsageCount LetterboxdChoicesConfirmed(int selectedCount) =>
        new(LetterboxdChoicesConfirmedMetric, selectedCount > 0 ? "selected" : "none");

    private static string AuthVariant(string method, string entryOrigin)
    {
        var knownMethod = AuthMethods.Contains(method, StringComparer.Ordinal) ? method : OtherValue;
        var knownOrigin = IsEntryOrigin(entryOrigin) ? entryOrigin : OtherOrigin;
        return $"{knownMethod}.{knownOrigin}";
    }
}
