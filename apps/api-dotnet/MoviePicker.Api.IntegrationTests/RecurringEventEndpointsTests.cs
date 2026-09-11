using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class RecurringEventEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public RecurringEventEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateOnly TwoDaysAgo() =>
        EventRecurrence.TodayInParis(DateTimeOffset.UtcNow).AddDays(-2);

    private async Task<CreateEventResponse> CreateEventAsync(HttpClient client, string title, DateOnly date)
    {
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title, date = Iso(date), time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        return created!;
    }

    [Fact]
    public async Task PatchConfig_SettingARecurrence_IsReadBackOnTheEvent()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var created = await CreateEventAsync(client, "Ciné-club", new DateOnly(2035, 6, 1));

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created.Slug}/config",
            new { recurrence = "weekly" });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var get = await client.GetAsync($"/api/v1/events/{created.Slug}/config");
        var config = await get.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Equal(RecurrenceFrequency.Weekly, config!.Recurrence);
        Assert.False(config.HasNextOccurrence);
    }

    [Fact]
    public async Task PatchConfig_ClearingTheRecurrence_StopsTheSeries()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var created = await CreateEventAsync(client, "Ciné-club", new DateOnly(2035, 6, 1));
        await client.PatchAsJsonAsync($"/api/v1/events/{created.Slug}/config", new { recurrence = "monthly" });

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created.Slug}/config",
            new { clearRecurrence = true });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var config = await patch.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Null(config!.Recurrence);
    }

    [Fact]
    public async Task ClosingARecurringEvent_OpensTheNextOccurrenceForTheHost()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var start = TwoDaysAgo();
        var created = await CreateEventAsync(client, "Ciné-club du mardi", start);
        await client.PatchAsJsonAsync($"/api/v1/events/{created.Slug}/config", new { recurrence = "weekly" });

        var close = await client.PostAsJsonAsync($"/api/v1/events/{created.Slug}/close", new { });
        Assert.Equal(HttpStatusCode.OK, close.StatusCode);

        var mine = await client.GetAsync("/api/v1/events/mine");
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);
        var next = Assert.Single(list!.Events, e => e.Date == Iso(start.AddDays(7)));
        Assert.Equal("Ciné-club du mardi", next.Title);
        Assert.NotEqual(created.Slug, next.Slug);
        Assert.True(next.IsCreator);
        Assert.Equal(1, next.ParticipantCount);
    }

    [Fact]
    public async Task ClosingARecurringEvent_CarriesTheConfigurationOverAndKeepsTheSeriesGoing()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var start = TwoDaysAgo();
        var created = await CreateEventAsync(client, "Ciné-club", start);
        await client.PatchAsJsonAsync(
            $"/api/v1/events/{created.Slug}/config",
            new { theme = "Horreur", maxProposalsPerParticipant = 2, recurrence = "weekly" });

        await client.PostAsJsonAsync($"/api/v1/events/{created.Slug}/close", new { });

        var mine = await client.GetAsync("/api/v1/events/mine");
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);
        var next = list!.Events.Single(e => e.Date == Iso(start.AddDays(7)));

        var nextConfig = await (await client.GetAsync($"/api/v1/events/{next.Slug}/config"))
            .Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Equal("Horreur", nextConfig!.Theme);
        Assert.Equal(2, nextConfig.MaxProposalsPerParticipant);
        Assert.Equal(RecurrenceFrequency.Weekly, nextConfig.Recurrence);

        var parentConfig = await (await client.GetAsync($"/api/v1/events/{created.Slug}/config"))
            .Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.True(parentConfig!.HasNextOccurrence);
    }

    [Fact]
    public async Task ClosingARecurringEvent_NeverForksTheSeriesOnRepeatedListings()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var start = TwoDaysAgo();
        var created = await CreateEventAsync(client, "Ciné-club unique", start);
        await client.PatchAsJsonAsync($"/api/v1/events/{created.Slug}/config", new { recurrence = "weekly" });
        await client.PostAsJsonAsync($"/api/v1/events/{created.Slug}/close", new { });

        await client.GetAsync("/api/v1/events/mine");
        var mine = await client.GetAsync("/api/v1/events/mine");
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);

        Assert.Single(list!.Events, e => e.Date == Iso(start.AddDays(7)));
    }

    [Fact]
    public async Task PatchConfig_OnceTheSuccessorExists_Returns409()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var start = TwoDaysAgo();
        var created = await CreateEventAsync(client, "Ciné-club figé", start);
        await client.PatchAsJsonAsync($"/api/v1/events/{created.Slug}/config", new { recurrence = "weekly" });
        await client.PostAsJsonAsync($"/api/v1/events/{created.Slug}/close", new { });

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created.Slug}/config",
            new { clearRecurrence = true });

        Assert.Equal(HttpStatusCode.Conflict, patch.StatusCode);
    }

    [Fact]
    public async Task ListingMyEvents_MaterialisesAnAbandonedOccurrenceWithoutClosingItByHand()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var start = EventRecurrence.TodayInParis(DateTimeOffset.UtcNow).AddDays(-30);
        var created = await CreateEventAsync(client, "Ciné-club oublié", start);
        await client.PatchAsJsonAsync($"/api/v1/events/{created.Slug}/config", new { recurrence = "weekly" });

        var mine = await client.GetAsync("/api/v1/events/mine");
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);

        var future = Iso(EventRecurrence.TodayInParis(DateTimeOffset.UtcNow));
        Assert.Contains(
            list!.Events,
            e => e.Title == "Ciné-club oublié" && string.CompareOrdinal(e.Date, future) > 0);
    }

    [Fact]
    public async Task RecurringEventsSweep_WithoutASchedulerToken_Returns503()
    {
        using var client = _factory.CreateClient();

        var res = await client.PostAsync("/api/v1/scheduler/recurring-events", null);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
    }
}
