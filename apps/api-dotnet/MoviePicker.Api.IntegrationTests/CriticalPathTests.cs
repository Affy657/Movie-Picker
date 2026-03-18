using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class CriticalPathTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly HttpClient _client;

    public CriticalPathTests(MoviePickerApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_Returns200_WithExpectedBody()
    {
        var res = await _client.GetAsync("/health");
        res.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ok", json.GetProperty("status").GetString());
        Assert.Equal("movie-picker-api", json.GetProperty("service").GetString());
    }

    [Fact]
    public async Task PostEvents_CreatesEvent_Returns201_WithSlugAndHostToken()
    {
        var body = new { title = "Soirée test", date = "2030-12-31", time = "20:00" };
        var res = await _client.PostAsJsonAsync("/events", body);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        var slug = json.GetProperty("slug").GetString();
        var hostToken = json.GetProperty("hostToken").GetString();
        Assert.False(string.IsNullOrEmpty(slug));
        Assert.False(string.IsNullOrEmpty(hostToken));
        Assert.Equal("/s/" + slug, json.GetProperty("shareUrl").GetString());
    }

    [Fact]
    public async Task FullCriticalPath_Create_Join_AddMovie_Vote_Wheel_Close()
    {
        // 1. Créer l'événement
        var createBody = new { title = "Soirée intégration", date = "2030-06-15", time = "19:00" };
        var createRes = await _client.PostAsJsonAsync("/events", createBody);
        createRes.EnsureSuccessStatusCode();
        var createJson = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var slug = createJson.GetProperty("slug").GetString()!;
        var hostToken = createJson.GetProperty("hostToken").GetString()!;

        // 2. Détail avec host
        var detailRes = await _client.GetAsync($"/events/slug/{slug}?host={Uri.EscapeDataString(hostToken)}");
        detailRes.EnsureSuccessStatusCode();
        var detailJson = await detailRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(detailJson.GetProperty("isHost").GetBoolean());

        // 3. Rejoindre
        var joinRes = await _client.PostAsJsonAsync($"/events/{slug}/join", new { pseudo = "Alice" });
        Assert.True(joinRes.StatusCode == HttpStatusCode.Created || joinRes.StatusCode == HttpStatusCode.OK);
        var joinJson = await joinRes.Content.ReadFromJsonAsync<JsonElement>();
        var participantId = joinJson.TryGetProperty("_id", out var idEl) ? idEl.GetString() : joinJson.GetProperty("participant").GetProperty("_id").GetString();
        Assert.False(string.IsNullOrEmpty(participantId));

        // 4. Ajouter un film
        var addMovieRes = await _client.PostAsJsonAsync($"/events/{slug}/movies", new
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

        // 5. Vote
        var voteRes = await _client.PostAsJsonAsync($"/events/{slug}/movies/{movieId}/vote", new { participantId, value = 1 });
        voteRes.EnsureSuccessStatusCode();

        // 6. Lancer la roue (avec hostToken)
        var wheelRes = await _client.PostAsync($"/events/{slug}/wheel?host={Uri.EscapeDataString(hostToken)}", null);
        wheelRes.EnsureSuccessStatusCode();
        var wheelJson = await wheelRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotNull(wheelJson.GetProperty("winner").GetProperty("title").GetString());

        // 7. Clôturer (avec hostToken)
        var closeRes = await _client.PostAsync($"/events/{slug}/close?host={Uri.EscapeDataString(hostToken)}", null);
        closeRes.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task GetEventDetail_UnknownSlug_Returns404()
    {
        var res = await _client.GetAsync("/events/slug/slug-inexistant-xyz");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task PostJoin_UnknownSlug_Returns404()
    {
        var res = await _client.PostAsJsonAsync("/events/slug-inexistant/join", new { pseudo = "Bob" });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
