using System.Net;
using System.Text.Json;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class OpenApiContractTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly HttpClient _client;

    public OpenApiContractTests(MoviePickerApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SwaggerJson_ExposesCriticalPaths()
    {
        var res = await _client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var paths = doc.RootElement.GetProperty("paths");
        Assert.True(paths.TryGetProperty("/health", out _));
        Assert.True(paths.TryGetProperty("/health/ready", out var ready) && ready.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events", out var events) && events.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/mine", out var mine) && mine.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/slug/{idOrSlug}", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/slug/{idOrSlug}/share-preview", out var sharePv)
                    && sharePv.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/register", out var reg) && reg.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/login", out var login) && login.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/logout", out var logout) && logout.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/me", out var me) && me.TryGetProperty("get", out _) && me.TryGetProperty("patch", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/password-reset/request", out var pwdReq)
                    && pwdReq.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/password-reset/confirm", out var pwdConfirm)
                    && pwdConfirm.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}/config", out var evCfg)
                    && evCfg.TryGetProperty("get", out _)
                    && evCfg.TryGetProperty("patch", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}", out var evRoot)
                    && evRoot.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}/movies/{movieId}/seen", out var seen)
                    && seen.TryGetProperty("post", out _)
                    && seen.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}/movies/{movieId}/vote", out var voteOps)
                    && voteOps.TryGetProperty("post", out _)
                    && voteOps.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/movies/search", out var mSearch) && mSearch.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/movies/tmdb/{tmdbId}/details", out var mDetails) && mDetails.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/posters/{posterKey}", out var posters) && posters.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/users/{handle}/stats", out var userStats) && userStats.TryGetProperty("get", out _));
        var schemas = doc.RootElement.GetProperty("components").GetProperty("schemas");
        Assert.True(schemas.TryGetProperty("MovieSearchListResponse", out _));
        Assert.True(schemas.TryGetProperty("MovieSearchItemResponse", out var searchItem));
        var searchItemProps = searchItem.GetProperty("properties");
        Assert.True(searchItemProps.TryGetProperty("runtimeMinutes", out var searchRuntimeProp));
        Assert.Equal("integer", searchRuntimeProp.GetProperty("type").GetString());
        Assert.True(schemas.TryGetProperty("WatchProviderOfferResponse", out _));
        Assert.True(schemas.TryGetProperty("MovieDetailsResponse", out var movieDetails));
        var movieDetailsProps = movieDetails.GetProperty("properties");
        Assert.True(movieDetailsProps.TryGetProperty("trailerUrl", out _));
        Assert.True(schemas.TryGetProperty("EventConfigResponse", out var evConfig));
        Assert.True(evConfig.GetProperty("properties").TryGetProperty("allowSeries", out _));
        Assert.True(schemas.TryGetProperty("MovieMediaType", out _));

        Assert.True(schemas.TryGetProperty("UserStatsResponse", out var userStatsSchema));
        var statsProps = userStatsSchema.GetProperty("properties");
        Assert.True(statsProps.TryGetProperty("eventsCreated", out var eventsCreatedProp));
        Assert.Equal("integer", eventsCreatedProp.GetProperty("type").GetString());
        Assert.True(statsProps.TryGetProperty("favoriteGenres", out var favGenresProp));
        Assert.Equal("array", favGenresProp.GetProperty("type").GetString());
        Assert.True(statsProps.TryGetProperty("dailyActivity", out var dailyProp));
        Assert.Equal("array", dailyProp.GetProperty("type").GetString());
        Assert.True(schemas.TryGetProperty("GenreCount", out _));
        Assert.True(schemas.TryGetProperty("DailyActivityPoint", out _));

        Assert.True(schemas.TryGetProperty("MovieWithScoreResponse", out var movieWithScore));
        var movieProps = movieWithScore.GetProperty("properties");
        Assert.True(movieProps.TryGetProperty("runtimeMinutes", out var runtimeProp));
        Assert.Equal("integer", runtimeProp.GetProperty("type").GetString());

        Assert.True(movieProps.TryGetProperty("seenCount", out var seenCountProp));
        Assert.Equal("integer", seenCountProp.GetProperty("type").GetString());
        Assert.True(movieProps.TryGetProperty("seenByPseudos", out var seenByPseudosProp));
        Assert.Equal("array", seenByPseudosProp.GetProperty("type").GetString());

        Assert.True(movieProps.TryGetProperty("myVote", out var myVoteProp));
        Assert.Equal("integer", myVoteProp.GetProperty("type").GetString());

        Assert.True(schemas.TryGetProperty("MarkAsSeenRequest", out _));
        Assert.True(schemas.TryGetProperty("UnmarkAsSeenRequest", out _));
        Assert.True(schemas.TryGetProperty("SeenMarkResponse", out _));

        Assert.True(schemas.TryGetProperty("DeleteEventResponse", out _));

        Assert.False(schemas.TryGetProperty("ReactionRequest", out _));
        Assert.False(schemas.TryGetProperty("MovieReactionAggregateResponse", out _));
    }
}
