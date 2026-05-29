using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventConfigEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventConfigEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task GetConfig_ReturnsDefaults_WhenNoConfigStored()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "C", date = "2035-06-01", time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);

        var res = await client.GetAsync($"/api/v1/events/{created!.Slug}/config");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(WheelMode.StrictRandom, body!.WheelMode);
    }

    [Fact]
    public async Task PatchConfig_AsHost_UpdatesAndGetReflects()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Cfg", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created!.Slug}/config",
            new
            {
                theme = "Horreur",
                maxProposalsPerParticipant = 2,
                wheelMode = "weightedByVotes"
            });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = await patch.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Horreur", updated!.Theme);
        Assert.Equal(2, updated.MaxProposalsPerParticipant);
        Assert.Equal(WheelMode.WeightedByVotes, updated.WheelMode);

        var get = await client.GetAsync($"/api/v1/events/{created.Slug}/config");
        var again = await get.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Equal("Horreur", again!.Theme);
    }

    [Fact]
    public async Task PatchConfig_WithoutHost_Returns403()
    {
        var owner = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await owner.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "X", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);

        var stranger = _factory.CreateClient();
        var patch = await stranger.PatchAsJsonAsync(
            $"/api/v1/events/{created!.Slug}/config",
            new { theme = "Y" });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
    }

    [Fact]
    public async Task PatchConfig_AfterWheel_Returns409()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Wheel", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "P" });
        join.EnsureSuccessStatusCode();
        var joinBody = await join.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var participantId = joinBody.TryGetProperty("_id", out var idEl)
            ? idEl.GetString()
            : joinBody.GetProperty("participant").GetProperty("_id").GetString();
        Assert.False(string.IsNullOrEmpty(participantId));

        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new
            {
                tmdbId = 27205,
                title = "Inception",
                year = "2010",
                posterPath = (string?)null,
                participantId
            });
        add.EnsureSuccessStatusCode();
        var movieJson = await add.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var movieId = movieJson.GetProperty("_id").GetString()!;

        var wheel = await client.PostAsync($"/api/v1/events/{slug}/wheel", null);
        wheel.EnsureSuccessStatusCode();

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{slug}/config",
            new { theme = "Too late" });
        Assert.Equal(HttpStatusCode.Conflict, patch.StatusCode);
    }

    [Fact]
    public async Task PatchConfig_MaxParticipants_AsHost_UpdatesAndGetReflects()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Cap", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created!.Slug}/config",
            new { maxParticipants = 6 });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = await patch.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Equal(6, updated!.MaxParticipants);

        var clear = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created.Slug}/config",
            new { maxParticipants = 0 });
        var cleared = await clear.Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Null(cleared!.MaxParticipants);
    }

    [Fact]
    public async Task Join_WhenAtCapacity_Returns409()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Full", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var patch = await host.PatchAsJsonAsync(
            $"/api/v1/events/{slug}/config",
            new { maxParticipants = 2 });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var first = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var join1 = await first.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Alice" });
        join1.EnsureSuccessStatusCode();

        var second = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var join2 = await second.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Bob" });
        Assert.Equal(HttpStatusCode.Conflict, join2.StatusCode);
    }

    [Fact]
    public async Task PatchConfig_MaxParticipants_BelowCurrent_Returns409()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Shrink", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        var slug = created!.Slug;

        var joiner1 = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        (await joiner1.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Alice" })).EnsureSuccessStatusCode();
        var joiner2 = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        (await joiner2.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Bob" })).EnsureSuccessStatusCode();

        var patch = await host.PatchAsJsonAsync(
            $"/api/v1/events/{slug}/config",
            new { maxParticipants = 1 });
        Assert.Equal(HttpStatusCode.Conflict, patch.StatusCode);
    }

    [Fact]
    public async Task PatchConfig_InvalidEndDate_Returns400()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Bad date", date = "2035-06-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{created!.Slug}/config",
            new { endDate = "not-a-date" });
        Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);
    }
}
