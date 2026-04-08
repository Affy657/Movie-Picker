using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class CriticalPathTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public CriticalPathTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public async Task GetHealth_Returns200_WithExpectedBody()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/health");
        res.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ok", json.GetProperty("status").GetString());
        Assert.Equal("movie-picker-api", json.GetProperty("service").GetString());
    }

    [Fact]
    public async Task PostEvents_WithoutSession_Returns401()
    {
        var client = _factory.CreateClient();
        var body = new { title = "Soirée test", date = "2030-12-31", time = "20:00" };
        var res = await client.PostAsJsonAsync("/api/v1/events", body);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task PostEvents_WithSession_CreatesEvent_Returns201_WithSlugAndCreatorParticipant()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Créateur");
        var body = new { title = "Soirée test", date = "2030-12-31", time = "20:00" };
        var res = await client.PostAsJsonAsync("/api/v1/events", body);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var created = await res.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        Assert.False(string.IsNullOrEmpty(created!.Slug));
        Assert.Equal("/s/" + created.Slug, created.ShareUrl);
        Assert.NotNull(created.CreatorParticipant);
        Assert.False(string.IsNullOrEmpty(created.CreatorParticipant!.Id));
        Assert.Equal("Créateur", created.CreatorParticipant.Pseudo);
    }

    [Fact]
    public async Task FullCriticalPath_Create_Join_AddMovie_Vote_Wheel_Close()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "HôteIntégration");

        var createBody = new { title = "Soirée intégration", date = "2030-06-15", time = "19:00" };
        var createRes = await client.PostAsJsonAsync("/api/v1/events", createBody);
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;
        var detailRes = await client.GetAsync($"/api/v1/events/slug/{slug}");
        detailRes.EnsureSuccessStatusCode();
        var detailJson = await detailRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(detailJson.GetProperty("isHost").GetBoolean());

        var joinRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Alice" });
        Assert.True(joinRes.StatusCode == HttpStatusCode.Created || joinRes.StatusCode == HttpStatusCode.OK);
        var joinJson = await joinRes.Content.ReadFromJsonAsync<JsonElement>();
        var participantId = joinJson.TryGetProperty("_id", out var idEl)
            ? idEl.GetString()
            : joinJson.GetProperty("participant").GetProperty("_id").GetString();
        Assert.False(string.IsNullOrEmpty(participantId));

        var addMovieRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies", new
        {
            tmdbId = 27205,
            title = "Inception",
            year = "2010",
            posterPath = (string?)null,
            participantId = participantId
        });
        addMovieRes.EnsureSuccessStatusCode();
        var movieJson = await addMovieRes.Content.ReadFromJsonAsync<JsonElement>();
        var movieId = movieJson.GetProperty("_id").GetString()!;

        var voteRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/vote", new { participantId, value = 1 });
        voteRes.EnsureSuccessStatusCode();

        var wheelRes = await client.PostAsync($"/api/v1/events/{slug}/wheel", null);
        wheelRes.EnsureSuccessStatusCode();
        var wheelJson = await wheelRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotNull(wheelJson.GetProperty("winner").GetProperty("title").GetString());

        var closeRes = await client.PostAsync($"/api/v1/events/{slug}/close", null);
        closeRes.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task GetEventDetail_UnknownSlug_Returns404()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/events/slug/slug-inexistant-xyz");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task PostJoin_UnknownSlug_Returns404()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/v1/events/slug-inexistant/join", new { pseudo = "Bob" });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
