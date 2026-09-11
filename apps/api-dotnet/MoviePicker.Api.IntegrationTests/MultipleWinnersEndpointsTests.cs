using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MultipleWinnersEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MultipleWinnersEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(string Slug, string ParticipantId)> CreateEventAsync(HttpClient client, string title)
    {
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title, date = "2035-06-01", time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        return (created!.Slug, created.CreatorParticipant!.Id);
    }

    private static async Task<string> AddMovieAsync(
        HttpClient client,
        string slug,
        string participantId,
        int tmdbId,
        string title)
    {
        var res = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId, title, year = "2020", posterPath = (string?)null, participantId });
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("_id").GetString()!;
    }

    private static async Task<JsonElement> DetailAsync(HttpClient client, string slug)
    {
        var res = await client.GetAsync($"/api/v1/events/slug/{slug}");
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static IReadOnlyList<string> WinnerIdsOf(JsonElement detail) =>
        detail.GetProperty("winners")
            .EnumerateArray()
            .Select(w => w.GetProperty("movieId").GetString()!)
            .ToList();

    [Fact]
    public async Task PatchConfig_SettingTheWinnerCount_IsReadBackOnTheConfig()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _) = await CreateEventAsync(client, "Ciné-club à trois films");

        var patch = await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 3 });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var config = await (await client.GetAsync($"/api/v1/events/{slug}/config"))
            .Content.ReadFromJsonAsync<EventConfigResponse>(JsonOptions);
        Assert.Equal(3, config!.WinnerCount);
        Assert.Equal(0, config.DrawnWinnerCount);
    }

    [Fact]
    public async Task Wheel_DrawsUpToTheConfiguredCount_ThenRefuses()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club double");
        await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        await AddMovieAsync(client, slug, participantId, 27205, "Inception");
        await AddMovieAsync(client, slug, participantId, 155, "The Dark Knight");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 2 });

        (await client.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { })).EnsureSuccessStatusCode();
        var third = await client.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { });

        Assert.Equal(HttpStatusCode.Conflict, third.StatusCode);
        var winners = WinnerIdsOf(await DetailAsync(client, slug));
        Assert.Equal(2, winners.Count);
        Assert.Equal(winners.Distinct().Count(), winners.Count);
    }

    [Fact]
    public async Task Wheel_EveryMovieAlreadyDrawn_Returns400()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club épuisé");
        await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 3 });

        (await client.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { })).EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { });

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task PatchConfig_LoweringTheCountBelowWhatIsDrawn_Returns409()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club figé");
        var first = await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        await AddMovieAsync(client, slug, participantId, 27205, "Inception");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 3 });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = first });

        var patch = await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);

        var raise = await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 5 });
        Assert.Equal(HttpStatusCode.OK, raise.StatusCode);
    }

    [Fact]
    public async Task Winner_PickingTheSameMovieTwice_Returns409()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club doublon");
        var movieId = await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        await AddMovieAsync(client, slug, participantId, 27205, "Inception");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 3 });

        (await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId })).EnsureSuccessStatusCode();
        var again = await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId });

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task DeleteWinner_RemovesItFromThePalmaresAndPutsItBackInTheDraw()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club corrigé");
        var first = await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        var second = await AddMovieAsync(client, slug, participantId, 27205, "Inception");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 2 });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = first });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = second });

        var delete = await client.DeleteAsync($"/api/v1/events/{slug}/winners/{first}");
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        Assert.Equal(new[] { second }, WinnerIdsOf(await DetailAsync(client, slug)));

        var draw = await client.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { });
        draw.EnsureSuccessStatusCode();
        Assert.Equal(new[] { second, first }, WinnerIdsOf(await DetailAsync(client, slug)));
    }

    [Fact]
    public async Task DeleteWinner_MovieThatNeverWon_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club introuvable");
        var movieId = await AddMovieAsync(client, slug, participantId, 603, "The Matrix");

        var delete = await client.DeleteAsync($"/api/v1/events/{slug}/winners/{movieId}");

        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    [Fact]
    public async Task ListMyEvents_ReportsEveryWinnerOfTheEvening()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club palmarès");
        var first = await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        var second = await AddMovieAsync(client, slug, participantId, 27205, "Inception");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 2 });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = first });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = second });

        var mine = await client.GetAsync("/api/v1/events/mine");
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);
        var summary = Assert.Single(list!.Events, e => e.Slug == slug);

        Assert.Equal(new[] { "The Matrix", "Inception" }, summary.WinnerMovies.Select(w => w.Title));
    }

    [Fact]
    public async Task DeleteWheel_ClearsTheWholePalmares()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(client, "Ciné-club remis à zéro");
        var first = await AddMovieAsync(client, slug, participantId, 603, "The Matrix");
        var second = await AddMovieAsync(client, slug, participantId, 27205, "Inception");
        await client.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 2 });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = first });
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = second });

        var reset = await client.DeleteAsync($"/api/v1/events/{slug}/wheel");
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        Assert.Empty(WinnerIdsOf(await DetailAsync(client, slug)));
    }
}
