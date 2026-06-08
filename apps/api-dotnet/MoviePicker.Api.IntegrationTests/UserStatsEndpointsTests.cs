using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class UserStatsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public UserStatsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<UserProfileResponse> GetMeAsync(HttpClient client)
    {
        var me = await client.GetAsync("/api/v1/auth/me");
        me.EnsureSuccessStatusCode();
        var profile = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        return profile!;
    }

    [Fact]
    public async Task Stats_AfterFullFlow_AreReachableAnonymouslyAndAggregated()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Statisticienne");
        var me = await GetMeAsync(client);

        var todayDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var createRes = await client.PostAsJsonAsync("/api/v1/events", new { title = "Soirée stats", date = todayDate, time = "23:59" });
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;
        var participantId = created.CreatorParticipant!.Id;

        var addMovieRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies", new
        {
            tmdbId = 27205,
            title = "Inception",
            year = "2010",
            posterPath = (string?)null,
            participantId
        });
        addMovieRes.EnsureSuccessStatusCode();
        var movieJson = await addMovieRes.Content.ReadFromJsonAsync<JsonElement>();
        var movieId = movieJson.GetProperty("_id").GetString()!;

        var voteRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/vote", new { participantId, value = 1 });
        voteRes.EnsureSuccessStatusCode();

        var wheelRes = await client.PostAsync($"/api/v1/events/{slug}/wheel", null);
        wheelRes.EnsureSuccessStatusCode();

        var anon = _factory.CreateClient();
        var statsRes = await anon.GetAsync($"/api/v1/users/{me.Handle}/stats");
        Assert.Equal(HttpStatusCode.OK, statsRes.StatusCode);

        var stats = await statsRes.Content.ReadFromJsonAsync<UserStatsResponse>(JsonOptions);
        Assert.NotNull(stats);
        Assert.True(stats!.EventsCreated >= 1);
        Assert.True(stats.MoviesProposed >= 1);
        Assert.True(stats.VotesCast >= 1);
        Assert.True(stats.WinningProposals >= 1);
        Assert.NotEmpty(stats.FavoriteGenres); // the stub TMDB client supplies genre ids
        Assert.NotEmpty(stats.DailyActivity); // zero-filled daily heatmap window
        Assert.Contains(stats.DailyActivity, p => p.Count >= 1); // today's participation lights up a cell
    }

    [Fact]
    public async Task Stats_PrivateProfile_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Discrète Stats");
        var me = await GetMeAsync(client);

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/stats");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Stats_UnknownHandle_Returns404()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/users/nobody_stats_xyz/stats");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
