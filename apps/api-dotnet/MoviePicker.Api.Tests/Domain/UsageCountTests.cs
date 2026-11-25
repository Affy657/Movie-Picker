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
    [InlineData("global_search_result_opened", "saga")]
    [InlineData("global_search_result_opened", "group")]
    [InlineData("global_search_result_opened", "list")]
    [InlineData("global_search_result_opened", "public_list")]
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
    [InlineData("email", "event", "email.event")]
    [InlineData("google", "recap", "google.recap")]
    [InlineData("github", "other", "github.other")]
    [InlineData("twitter", "event", "other.event")]
    [InlineData("email", "elsewhere", "email.other")]
    public void SignedUp_CombinesTheMethodAndTheOrigin(string method, string entryOrigin, string variant)
    {
        var count = UsageCount.SignedUp(method, entryOrigin);

        Assert.Equal(UsageCount.UserSignedUpMetric, count.Metric);
        Assert.Equal(variant, count.Variant);
    }

    [Fact]
    public void LoggedIn_CombinesTheMethodAndTheOrigin()
    {
        var count = UsageCount.LoggedIn("github", UsageCount.ListOrigin);

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
