using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.IntegrationTests.Helpers;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class UsageCountsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/usage-counts";

    private readonly MoviePickerApplicationFactory _factory;

    public UsageCountsEndpointsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
    }

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    [Fact]
    public async Task Report_FromAVisitorWithoutAccount_CountsTheStep()
    {
        var before = await UsageCountProbe.ReadTodayAsync(_factory, "event_link_opened", "visitor.open");

        var res = await _factory.CreateClient().PostAsJsonAsync(Route, new { metric = "event_link_opened", variant = "visitor.open" });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal(before + 1, await UsageCountProbe.ReadTodayAsync(_factory, "event_link_opened", "visitor.open"));
    }

    [Fact]
    public async Task Report_FromASignedInAccount_CountsTheStep()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Counted");
        var before = await UsageCountProbe.ReadTodayAsync(_factory, "random_pick_opened", "watchlist");

        var res = await client.PostAsJsonAsync(Route, new { metric = "random_pick_opened", variant = "watchlist" });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Equal(before + 1, await UsageCountProbe.ReadTodayAsync(_factory, "random_pick_opened", "watchlist"));
    }

    [Theory]
    [InlineData("event_joined", "new_account")]
    [InlineData("user_signed_up", "email.event")]
    [InlineData("join_prompt_clicked", "signup")]
    public async Task Report_OfACountTheBrowserCannotReport_IsRefusedAndNotCounted(string metric, string variant)
    {
        var before = await UsageCountProbe.ReadTodayAsync(_factory, metric, variant);

        var res = await _factory.CreateClient().PostAsJsonAsync(Route, new { metric, variant });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("unknown_usage_count", await ReasonOfAsync(res));
        Assert.Equal(before, await UsageCountProbe.ReadTodayAsync(_factory, metric, variant));
    }

    [Fact]
    public async Task Report_WithoutVariant_IsAValidationError()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync(Route, new { metric = "recap_viewed" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("validation_failed", await ReasonOfAsync(res));
    }

    [Fact]
    public async Task VisitorWhoSignsUpFromAnEventLink_IsCountedAtSignUpThenAtArrival()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "HôteCompté");
        var createRes = await host.PostAsJsonAsync("/api/v1/events", new { title = "Soirée comptée", date = TestDates.Upcoming, time = "20:00" });
        createRes.EnsureSuccessStatusCode();
        var slug = (await createRes.Content.ReadFromJsonAsync<CreateEventResponse>())!.Slug;
        var signUpsBefore = await UsageCountProbe.ReadTodayAsync(_factory, "user_signed_up", "email.event");
        var arrivalsBefore = await UsageCountProbe.ReadTodayAsync(_factory, "event_joined", "new_account");

        var visitor = _factory.CreateClient();
        var register = await visitor.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"u{Guid.NewGuid():N}@test.local",
            password = "abcd1234",
            displayName = "Invitée",
            returnTo = $"/e/{slug}"
        });
        register.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(visitor, register);
        var join = await visitor.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Invitée" });
        join.EnsureSuccessStatusCode();

        Assert.Equal(signUpsBefore + 1, await UsageCountProbe.ReadTodayAsync(_factory, "user_signed_up", "email.event"));
        Assert.Equal(arrivalsBefore + 1, await UsageCountProbe.ReadTodayAsync(_factory, "event_joined", "new_account"));
    }
}
