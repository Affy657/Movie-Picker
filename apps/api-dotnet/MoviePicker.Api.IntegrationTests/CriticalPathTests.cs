using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
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

    private static readonly JsonSerializerOptions JsonConfigOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
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
        Assert.Equal("/e/" + created.Slug, created.ShareUrl);
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

    /// <summary>
    /// Parcours V1 roadmap §20 : session (login après inscription) → création liée au compte → PATCH config → GET config (persistance) → marquage « déjà vu ».
    /// </summary>
    [Fact]
    public async Task V1Flow_Login_CreateEvent_PatchConfig_MarkAsSeen()
    {
        var email = $"v1flow{Guid.NewGuid():N}@test.local";
        const string password = "abcd1234";

        var registerClient = _factory.CreateClient();
        var reg = await registerClient.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest
            {
                Email = email,
                Password = password,
                DisplayName = "FlowV1"
            });
        reg.EnsureSuccessStatusCode();

        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = email, Password = password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        IntegrationTestAuth.ApplySessionCookie(client, login);

        var createRes = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée V1 flow", date = "2031-06-01", time = "20:00" });
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;
        var creatorPid = created.CreatorParticipant?.Id;
        Assert.False(string.IsNullOrEmpty(creatorPid));

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{slug}/config",
            new { theme = "Science-fiction" });
        patch.EnsureSuccessStatusCode();

        var getCfg = await client.GetAsync($"/api/v1/events/{slug}/config");
        getCfg.EnsureSuccessStatusCode();
        var cfg = await getCfg.Content.ReadFromJsonAsync<EventConfigResponse>(JsonConfigOptions);
        Assert.NotNull(cfg);
        Assert.Equal("Science-fiction", cfg!.Theme);

        var addMovie = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new
            {
                tmdbId = 303,
                title = "Film flow",
                year = "2021",
                posterPath = (string?)null,
                participantId = creatorPid
            });
        addMovie.EnsureSuccessStatusCode();
        var movie = await addMovie.Content.ReadFromJsonAsync<MovieWithScoreResponse>(JsonOptions);
        Assert.NotNull(movie);

        var seen = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie!.Id}/seen",
            new { participantId = creatorPid });
        // Contrat : le endpoint renvoie 200 OK (ressource idempotente, pas de "location").
        Assert.Equal(HttpStatusCode.OK, seen.StatusCode);

        // Idempotence : un second POST doit rester 200 OK et ne pas conflicter.
        var seenAgain = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie.Id}/seen",
            new { participantId = creatorPid });
        Assert.Equal(HttpStatusCode.OK, seenAgain.StatusCode);

        // DELETE (unmark) renvoie 204 No Content.
        var unmarkRequest = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/events/{slug}/movies/{movie.Id}/seen")
        {
            Content = JsonContent.Create(new { participantId = creatorPid })
        };
        var unmark = await client.SendAsync(unmarkRequest);
        Assert.Equal(HttpStatusCode.NoContent, unmark.StatusCode);

        // Régression : l'ancienne route « reactions » doit retourner 404 Not Found (surface API).
        var legacyReaction = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie.Id}/reactions",
            new { participantId = creatorPid, reactionId = "already_seen" });
        Assert.Equal(HttpStatusCode.NotFound, legacyReaction.StatusCode);
    }

    [Fact]
    public async Task VoteToggle_PostThenDelete_RemovesMyVote_AndIsReflectedInMovieList()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "VoteToggle");

        var createBody = new { title = "Soirée vote toggle", date = "2030-07-01", time = "20:00" };
        var createRes = await client.PostAsJsonAsync("/api/v1/events", createBody);
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        var slug = created!.Slug;
        var participantId = created.CreatorParticipant!.Id;

        var addMovieRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies", new
        {
            tmdbId = 9999,
            title = "Toggle Movie",
            year = "2024",
            posterPath = (string?)null,
            participantId
        });
        addMovieRes.EnsureSuccessStatusCode();
        var movieJson = await addMovieRes.Content.ReadFromJsonAsync<JsonElement>();
        var movieId = movieJson.GetProperty("_id").GetString()!;

        var voteRes = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movieId}/vote",
            new { participantId, value = 1 });
        voteRes.EnsureSuccessStatusCode();

        var listAfterVote = await client.GetAsync(
            $"/api/v1/events/{slug}/movies?participantId={Uri.EscapeDataString(participantId)}");
        listAfterVote.EnsureSuccessStatusCode();
        var listJson = await listAfterVote.Content.ReadFromJsonAsync<JsonElement>();
        var firstMovie = listJson.EnumerateArray().First();
        Assert.Equal(1, firstMovie.GetProperty("up").GetInt32());
        Assert.Equal(1, firstMovie.GetProperty("myVote").GetInt32());

        var listAnonymous = await client.GetAsync($"/api/v1/events/{slug}/movies");
        listAnonymous.EnsureSuccessStatusCode();
        var listAnonJson = await listAnonymous.Content.ReadFromJsonAsync<JsonElement>();
        var firstAnon = listAnonJson.EnumerateArray().First();
        Assert.Equal(JsonValueKind.Null, firstAnon.GetProperty("myVote").ValueKind);

        // DELETE /vote : participantId passé en query string (standard HTTP, plus
        // sûr que le body sur certains proxies historiques).
        var deleteVoteRes = await client.DeleteAsync(
            $"/api/v1/events/{slug}/movies/{movieId}/vote?participantId={Uri.EscapeDataString(participantId)}");
        Assert.Equal(HttpStatusCode.NoContent, deleteVoteRes.StatusCode);

        var listAfterDelete = await client.GetAsync(
            $"/api/v1/events/{slug}/movies?participantId={Uri.EscapeDataString(participantId)}");
        listAfterDelete.EnsureSuccessStatusCode();
        var listAfterJson = await listAfterDelete.Content.ReadFromJsonAsync<JsonElement>();
        var movieAfter = listAfterJson.EnumerateArray().First();
        Assert.Equal(0, movieAfter.GetProperty("up").GetInt32());
        Assert.Equal(JsonValueKind.Null, movieAfter.GetProperty("myVote").ValueKind);

        // Idempotent : redélétion sans vote existant doit renvoyer 204 (cf. revue de code).
        var deleteAgainRes = await client.DeleteAsync(
            $"/api/v1/events/{slug}/movies/{movieId}/vote?participantId={Uri.EscapeDataString(participantId)}");
        Assert.Equal(HttpStatusCode.NoContent, deleteAgainRes.StatusCode);
    }

    [Fact]
    public async Task Wheel_Relaunch_DoesNotPickPreviousWinner_WhenMultipleMovies()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "WheelRelaunch");

        var createBody = new { title = "Soirée relance roue", date = "2030-07-01", time = "20:00" };
        var createRes = await client.PostAsJsonAsync("/api/v1/events", createBody);
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        var slug = created!.Slug;
        var participantId = created.CreatorParticipant!.Id;

        async Task<string> AddMovieAsync(int tmdbId, string title)
        {
            var res = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies", new
            {
                tmdbId,
                title,
                year = "2024",
                posterPath = (string?)null,
                participantId
            });
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadFromJsonAsync<JsonElement>();
            return json.GetProperty("_id").GetString()!;
        }

        await AddMovieAsync(1001, "Film A");
        await AddMovieAsync(1002, "Film B");
        await AddMovieAsync(1003, "Film C");

        var first = await client.PostAsync($"/api/v1/events/{slug}/wheel", null);
        first.EnsureSuccessStatusCode();
        var firstJson = await first.Content.ReadFromJsonAsync<JsonElement>();
        var previousWinnerId = firstJson.GetProperty("winner").GetProperty("_id").GetString()!;

        for (var i = 0; i < 10; i++)
        {
            var relaunch = await client.PostAsync($"/api/v1/events/{slug}/wheel", null);
            relaunch.EnsureSuccessStatusCode();
            var relaunchJson = await relaunch.Content.ReadFromJsonAsync<JsonElement>();
            var newWinnerId = relaunchJson.GetProperty("winner").GetProperty("_id").GetString()!;
            Assert.NotEqual(previousWinnerId, newWinnerId);
            previousWinnerId = newWinnerId;
        }
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
