using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieNightsEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const int TmdbId = 27_205;

    private readonly MoviePickerApplicationFactory _factory;

    public MovieNightsEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Nights_Anonymous_Answers401()
    {
        var res = await _factory.CreateClient().GetAsync($"/api/v1/movies/tmdb/{TmdbId}/nights?mediaType=movie");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Nights_FilmNeverProposed_AnswersAnEmptySummary()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);

        var res = await client.GetAsync($"/api/v1/movies/tmdb/{TmdbId}/nights?mediaType=movie");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, body.GetProperty("nights").GetArrayLength());
        Assert.Equal(0, body.GetProperty("proposalCount").GetInt32());
        Assert.Equal(0, body.GetProperty("winCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("rating").ValueKind);
        Assert.Equal(0, body.GetProperty("seenBy").GetArrayLength());
        Assert.Equal(0, body.GetProperty("seenCount").GetInt32());
    }

    [Fact]
    public async Task Nights_FilmWonInANightOfMine_DescribesThatNight()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Hôte du film");
        var create = await host.PostAsJsonAsync("/api/v1/events", new { title = "Soirée Nolan", date = TestDates.Upcoming, time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var slug = created.GetProperty("slug").GetString()!;
        var participantId = created.GetProperty("creatorParticipant").GetProperty("_id").GetString()!;
        var pseudo = created.GetProperty("creatorParticipant").GetProperty("pseudo").GetString()!;
        var added = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = TmdbId, title = "Inception", year = "2010", posterPath = (string?)null, participantId });
        added.EnsureSuccessStatusCode();
        var movieId = (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("_id").GetString()!;
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/seen", new { participantId })).EnsureSuccessStatusCode();
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId })).EnsureSuccessStatusCode();
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/close", new { })).EnsureSuccessStatusCode();
        (await host.PutAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/rating", new { participantId, value = 8 })).EnsureSuccessStatusCode();
        var recapSlug = (await host.GetFromJsonAsync<JsonElement>($"/api/v1/events/slug/{slug}")).GetProperty("recapSlug").GetString();

        var res = await host.GetAsync($"/api/v1/movies/tmdb/{TmdbId}/nights?mediaType=movie");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        var night = Assert.Single(body.GetProperty("nights").EnumerateArray());
        Assert.Equal(slug, night.GetProperty("slug").GetString());
        Assert.Equal("Soirée Nolan", night.GetProperty("title").GetString());
        Assert.Equal(TestDates.Upcoming, night.GetProperty("date").GetString());
        Assert.True(night.GetProperty("isWinner").GetBoolean());
        Assert.True(night.GetProperty("isFinished").GetBoolean());
        Assert.Equal(recapSlug, night.GetProperty("recapSlug").GetString());
        Assert.Equal(pseudo, night.GetProperty("proposerPseudo").GetString());
        Assert.Equal(1, body.GetProperty("proposalCount").GetInt32());
        Assert.Equal(1, body.GetProperty("winCount").GetInt32());
        Assert.Equal(8.0, body.GetProperty("rating").GetProperty("average").GetDouble());
        Assert.Equal(1, body.GetProperty("rating").GetProperty("count").GetInt32());
        var viewer = Assert.Single(body.GetProperty("seenBy").EnumerateArray());
        Assert.Equal(pseudo, viewer.GetProperty("pseudo").GetString());
        Assert.True(viewer.TryGetProperty("avatarId", out _));
        Assert.Equal(1, body.GetProperty("seenCount").GetInt32());

        var asSeries = await host.GetFromJsonAsync<JsonElement>($"/api/v1/movies/tmdb/{TmdbId}/nights?mediaType=tv");
        Assert.Equal(0, asSeries.GetProperty("nights").GetArrayLength());
        Assert.Equal(0, asSeries.GetProperty("proposalCount").GetInt32());
    }

    [Fact]
    public async Task Nights_FilmProposedInSomeoneElsesNight_StaysPrivateToItsParticipants()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Autre hôte");
        var create = await host.PostAsJsonAsync("/api/v1/events", new { title = "Soirée privée", date = TestDates.Upcoming, time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var slug = created.GetProperty("slug").GetString()!;
        var participantId = created.GetProperty("creatorParticipant").GetProperty("_id").GetString()!;
        (await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = TmdbId, title = "Inception", year = "2010", posterPath = (string?)null, participantId })).EnsureSuccessStatusCode();
        var outsider = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Curieux");

        var body = await outsider.GetFromJsonAsync<JsonElement>($"/api/v1/movies/tmdb/{TmdbId}/nights?mediaType=movie");

        Assert.Equal(0, body.GetProperty("nights").GetArrayLength());
        Assert.Equal(0, body.GetProperty("proposalCount").GetInt32());
    }
}
