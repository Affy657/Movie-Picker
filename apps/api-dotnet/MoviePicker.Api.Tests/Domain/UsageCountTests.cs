using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class UsageCountTests
{
    [Theory]
    [InlineData("event_link_opened", "visitor.open")]
    [InlineData("event_link_opened", "visitor.full")]
    [InlineData("event_link_opened", "visitor.closed")]
    [InlineData("event_link_opened", "account.open")]
    [InlineData("event_link_opened", "account.full")]
    [InlineData("event_link_opened", "account.closed")]
    [InlineData("join_prompt_clicked", "login")]
    [InlineData("join_prompt_clicked", "register")]
    [InlineData("recap_viewed", "visitor")]
    [InlineData("recap_viewed", "account")]
    [InlineData("random_pick_opened", "watchlist")]
    [InlineData("random_pick_opened", "list")]
    [InlineData("random_pick_opened", "saved_list")]
    [InlineData("random_pick_opened", "catalog")]
    [InlineData("global_search_result_opened", "title")]
    [InlineData("global_search_result_opened", "all_titles")]
    [InlineData("global_search_result_opened", "member")]
    [InlineData("global_search_result_opened", "night")]
    public void TryParseReported_AcceptsEveryStepTheBrowserReports(string metric, string variant)
    {
        Assert.True(UsageCount.TryParseReported(metric, variant, out var count));
        Assert.Equal(metric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }

    [Theory]
    [InlineData("user_signed_up", "email.event")]
    [InlineData("user_logged_in", "email.other")]
    [InlineData("event_joined", "new_account")]
    [InlineData("letterboxd_synced", "manual")]
    [InlineData("letterboxd_linked", "connected")]
    [InlineData("letterboxd_choices_confirmed", "selected")]
    public void TryParseReported_RefusesWhatOnlyTheServerCounts(string metric, string variant)
    {
        Assert.False(UsageCount.TryParseReported(metric, variant, out _));
    }

    [Theory]
    [InlineData(null, "login")]
    [InlineData("", "login")]
    [InlineData("join_prompt_clicked", null)]
    [InlineData("join_prompt_clicked", "")]
    [InlineData("join_prompt_clicked", "signup")]
    [InlineData("join_prompt_clicked", "LOGIN")]
    [InlineData("event_link_opened", "visitor")]
    [InlineData("event_link_opened", "member.open")]
    [InlineData("unknown_metric", "all")]
    public void TryParseReported_RefusesUnknownMetricsAndVariants(string? metric, string? variant)
    {
        Assert.False(UsageCount.TryParseReported(metric, variant, out _));
    }

    [Theory]
    [InlineData("/e/abc123", "event")]
    [InlineData("/e/abc123?rate", "event")]
    [InlineData("/r/abc123", "recap")]
    [InlineData("/l/token/rejoindre", "list")]
    [InlineData("/u/ad0", "profile")]
    [InlineData("/new?from=recap", "recap")]
    [InlineData("/new?step=2&from=list", "list")]
    [InlineData("/e/abc123?from=recap", "event")]
    [InlineData("/new?from=other", "other")]
    [InlineData("/new?from=elsewhere", "other")]
    [InlineData("/new?source=recap", "other")]
    [InlineData("https://evil.example/new?from=recap", "other")]
    [InlineData("/", "other")]
    [InlineData("/films", "other")]
    [InlineData("/events", "other")]
    [InlineData("/e", "other")]
    [InlineData("https://evil.example/e/abc", "other")]
    [InlineData("//evil.example/e/abc", "other")]
    [InlineData("", "other")]
    [InlineData(null, "other")]
    public void EntryOrigin_ReadsWhereTheAccountWasHeadingFromTheReturnPath(string? returnTo, string origin)
    {
        Assert.Equal(origin, UsageCount.EntryOriginOf(returnTo));
    }

    [Theory]
    [InlineData("email", "/e/abc", "email.event")]
    [InlineData("google", "/r/abc", "google.recap")]
    [InlineData("github", null, "github.other")]
    [InlineData("twitter", "/e/abc", "other.event")]
    public void SignedUp_CombinesTheMethodAndTheOrigin(string method, string? returnTo, string variant)
    {
        var count = UsageCount.SignedUp(method, returnTo);

        Assert.Equal(UsageCount.UserSignedUpMetric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }

    [Fact]
    public void LoggedIn_CombinesTheMethodAndTheOrigin()
    {
        var count = UsageCount.LoggedIn("github", "/l/token/rejoindre");

        Assert.Equal(UsageCount.UserLoggedInMetric, count.Metric);
        Assert.Equal("github.list", count.Variant);
    }

    [Theory]
    [InlineData(0, "new_account")]
    [InlineData(23, "new_account")]
    [InlineData(24, "existing_account")]
    [InlineData(500, "existing_account")]
    public void EventJoined_CallsAnAccountNewDuringItsFirstDay(int accountAgeHours, string variant)
    {
        var now = new DateTimeOffset(2026, 11, 18, 21, 0, 0, TimeSpan.Zero);

        var count = UsageCount.EventJoined(now.AddHours(-accountAgeHours), now);

        Assert.Equal(UsageCount.EventJoinedMetric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }

    [Theory]
    [InlineData(true, "manual")]
    [InlineData(false, "auto")]
    public void LetterboxdSynced_TellsAManualSyncFromAnAutomaticOne(bool forced, string variant)
    {
        var count = UsageCount.LetterboxdSynced(forced);

        Assert.Equal(UsageCount.LetterboxdSyncedMetric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }

    [Theory]
    [InlineData(true, "connected")]
    [InlineData(false, "disconnected")]
    public void LetterboxdLinked_TellsAConnectionFromADisconnection(bool connected, string variant)
    {
        var count = UsageCount.LetterboxdLinked(connected);

        Assert.Equal(UsageCount.LetterboxdLinkedMetric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }

    [Theory]
    [InlineData(3, "selected")]
    [InlineData(1, "selected")]
    [InlineData(0, "none")]
    public void LetterboxdChoicesConfirmed_TellsAChoiceFromADismissal(int selectedCount, string variant)
    {
        var count = UsageCount.LetterboxdChoicesConfirmed(selectedCount);

        Assert.Equal(UsageCount.LetterboxdChoicesConfirmedMetric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }
}
