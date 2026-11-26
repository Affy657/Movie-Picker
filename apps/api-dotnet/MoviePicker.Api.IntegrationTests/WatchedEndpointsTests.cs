using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class WatchedEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/watched";

    private static readonly string StubTmdbTitle = StubTmdbMovieSearch.TitleOf(603);

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public WatchedEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private Task<HttpClient> NewUserAsync(string displayName) =>
        IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);

    private static async Task<UserProfileResponse> MeAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!;

    private static object Title(int tmdbId, string title, int? rating = null, string mediaType = "movie") =>
        new { tmdbId, mediaType, title, year = "1999", rating };

    private static async Task<JsonElement> BodyOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync());

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        (await BodyOfAsync(response)).GetProperty("reason").GetString();

    private static async Task<WatchedStatusResponse> StatusAsync(HttpClient client, int tmdbId, string mediaType = "movie") =>
        (await client.GetFromJsonAsync<WatchedStatusResponse>($"{Route}/{tmdbId}?mediaType={mediaType}", Json))!;

    private static async Task<WatchedStatusResponse> MarkAsync(HttpClient client, int tmdbId, string title, int? rating = null)
    {
        var response = await client.PostAsJsonAsync(Route, Title(tmdbId, title, rating));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<WatchedStatusResponse>(Json))!;
    }

    private async Task<Event> WinNightAsync(string userId, int tmdbId, string title, string date, int? rating = null)
    {
        var past = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        var ratings = scope.ServiceProvider.GetRequiredService<IMovieRatingRepository>();
        var night = await events.AddAsync(new Event
        {
            Title = $"Soirée {title}",
            Date = date,
            Time = "20:30",
            Slug = "watched-" + Guid.NewGuid().ToString("N")[..10],
            CreatedAt = past,
            UpdatedAt = past
        });
        var viewer = await participants.AddAsync(new Participant
        {
            EventId = night.Id,
            UserId = userId,
            Pseudo = "Moi",
            CreatedAt = past,
            UpdatedAt = past
        });
        var film = await movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = viewer.Id,
            TmdbId = tmdbId,
            Title = title,
            Year = "2010",
            CreatedAt = past,
            UpdatedAt = past
        });
        if (rating is { } value)
        {
            await ratings.UpsertAsync(new MovieRating
            {
                EventId = night.Id,
                MovieId = film.Id,
                ParticipantId = viewer.Id,
                Value = value,
                CreatedAt = past,
                UpdatedAt = past
            });
        }

        return await events.UpdateAsync(night with
        {
            Winners = [new EventWinner { MovieId = film.Id, Method = WinnerPickMethod.Wheel, PickedAt = past }],
            ClosedAt = past
        });
    }

    [Theory]
    [InlineData("POST", Route)]
    [InlineData("GET", Route + "/603")]
    [InlineData("PUT", Route + "/603/rating")]
    [InlineData("DELETE", Route + "/603")]
    public async Task EveryRoute_WithoutASession_IsUnauthorized(string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = JsonContent.Create(Title(603, "Matrix", 8))
        };

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Mark_AnswersTheStatusInCamelCase_AndKeepsItsDateWhenMarkedAgain()
    {
        var client = await NewUserAsync("WatchedMark");

        var first = await client.PostAsJsonAsync(Route, Title(603, "Matrix", 8));
        var again = await MarkAsync(client, 603, "Matrix", 6);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var body = await BodyOfAsync(first);
        Assert.Equal("elsewhere", body.GetProperty("status").GetString());
        Assert.Equal(8, body.GetProperty("rating").GetInt32());
        var watchedAt = body.GetProperty("watchedAt").GetDateTimeOffset();
        Assert.Equal(JsonValueKind.Null, body.GetProperty("nightSlug").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("nightTitle").ValueKind);
        Assert.Equal((WatchedStatus.Elsewhere, (DateTimeOffset?)watchedAt, (int?)6), (again.Status, again.WatchedAt, again.Rating));
        var status = await StatusAsync(client, 603);
        Assert.Equal((WatchedStatus.Elsewhere, (DateTimeOffset?)watchedAt, (int?)6), (status.Status, status.WatchedAt, status.Rating));
        Assert.Equal(WatchedStatus.None, (await StatusAsync(client, 603, "tv")).Status);
    }

    [Fact]
    public async Task Status_OfANeverWatchedTitle_IsNone()
    {
        var client = await NewUserAsync("WatchedNone");

        var response = await client.GetAsync($"{Route}/603");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await BodyOfAsync(response);
        Assert.Equal("none", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("watchedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("rating").ValueKind);
    }

    [Fact]
    public async Task Mark_TakesTheTitleOutOfTheWatchlist()
    {
        var client = await NewUserAsync("WatchedWatchlist");
        Assert.Equal(
            HttpStatusCode.Created,
            (await client.PostAsJsonAsync("/api/v1/watchlist", new { tmdbId = 603, title = "Matrix", year = "1999" })).StatusCode);
        Assert.Equal(
            HttpStatusCode.Created,
            (await client.PostAsJsonAsync("/api/v1/watchlist", new { tmdbId = 680, title = "Pulp Fiction", year = "1994" })).StatusCode);

        await MarkAsync(client, 603, "Matrix");

        var watchlist = await client.GetFromJsonAsync<WatchlistResponse>("/api/v1/watchlist", Json);
        Assert.Equal([680], watchlist!.Items.Select(item => item.TmdbId));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public async Task Mark_RatingOutOfRange_IsAValidationError_AndMarksNothing(int rating)
    {
        var client = await NewUserAsync("WatchedBadRating");

        var response = await client.PostAsJsonAsync(Route, Title(603, "Matrix", rating));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.ValidationFailed, await ReasonOfAsync(response));
        Assert.Equal(WatchedStatus.None, (await StatusAsync(client, 603)).Status);
    }

    [Fact]
    public async Task SetRating_SetsAndClears_ButOnlyOnATitleWatchedElsewhere()
    {
        var client = await NewUserAsync("WatchedRating");
        await MarkAsync(client, 603, "Matrix");

        var rated = await client.PutAsJsonAsync($"{Route}/603/rating?mediaType=movie", new { value = 9 });
        var cleared = await client.PutAsJsonAsync($"{Route}/603/rating", new { value = (int?)null });
        var outOfRange = await client.PutAsJsonAsync($"{Route}/603/rating", new { value = 11 });
        var notWatched = await client.PutAsJsonAsync($"{Route}/603/rating?mediaType=tv", new { value = 9 });

        Assert.Equal(HttpStatusCode.OK, rated.StatusCode);
        Assert.Equal(9, (await rated.Content.ReadFromJsonAsync<WatchedStatusResponse>(Json))!.Rating);
        Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        Assert.Null((await cleared.Content.ReadFromJsonAsync<WatchedStatusResponse>(Json))!.Rating);
        Assert.Equal(HttpStatusCode.BadRequest, outOfRange.StatusCode);
        Assert.Equal(ErrorCodes.ValidationFailed, await ReasonOfAsync(outOfRange));
        Assert.Equal(HttpStatusCode.NotFound, notWatched.StatusCode);
        Assert.Equal(ErrorCodes.WatchedTitleNotFound, await ReasonOfAsync(notWatched));
    }

    [Fact]
    public async Task Unmark_IsIdempotent()
    {
        var client = await NewUserAsync("WatchedUnmark");
        await MarkAsync(client, 603, "Matrix");

        var removed = await client.DeleteAsync($"{Route}/603?mediaType=movie");
        var again = await client.DeleteAsync($"{Route}/603");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(WatchedStatus.None, (await StatusAsync(client, 603)).Status);
    }

    [Fact]
    public async Task NightWinner_IsANightWithItsLink_ThatMarkingAndUnmarkingNeverChange()
    {
        var client = await NewUserAsync("WatchedNight");
        var me = await MeAsync(client);
        var night = await WinNightAsync(me.UserId, 27_205, "Inception", "2025-03-10", rating: 7);

        var marked = await MarkAsync(client, 27_205, "Inception", 2);
        var unmarked = await client.DeleteAsync($"{Route}/27205");
        var status = await StatusAsync(client, 27_205);

        Assert.Equal((WatchedStatus.Night, (int?)7, night.Slug, night.Title), (marked.Status, marked.Rating, marked.NightSlug, marked.NightTitle));
        Assert.Equal(HttpStatusCode.NoContent, unmarked.StatusCode);
        Assert.Equal((WatchedStatus.Night, (int?)7, night.Slug), (status.Status, status.Rating, status.NightSlug));
        Assert.NotNull(status.WatchedAt);
    }

    [Fact]
    public async Task WatchedMovies_MergeNightsAndTitlesWatchedElsewhere_WhileTheProfileKeepsTheNights()
    {
        var client = await NewUserAsync("WatchedMerge");
        var me = await MeAsync(client);
        await WinNightAsync(me.UserId, 27_205, "Inception", "2025-03-10", rating: 7);
        await MarkAsync(client, 27_205, "Inception", 3);
        await MarkAsync(client, 603, "Matrix", 8);

        var mine = await client.GetAsync("/api/v1/users/me/watched-movies?take=1000");
        var visitor = await _factory.CreateClient().GetFromJsonAsync<UserWatchedMoviesResponse>(
            $"/api/v1/users/{me.Handle}/watched-movies?take=1000",
            Json);

        var body = await BodyOfAsync(mine);
        Assert.Equal(2, body.GetProperty("total").GetInt32());
        var items = body.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(
            [(603, "elsewhere", 8), (27_205, "night", 7)],
            items.Select(item => (item.GetProperty("tmdbId").GetInt32(), item.GetProperty("source").GetString(), item.GetProperty("myRating").GetInt32())));
        Assert.Equal(1, visitor!.Total);
        Assert.Equal([27_205], visitor.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task Lists_CountTheirWatchedTitles_AndFlagEachOne()
    {
        var client = await NewUserAsync("WatchedLists");
        var me = await MeAsync(client);
        await WinNightAsync(me.UserId, 27_205, "Inception", "2025-03-10");
        var created = await client.PostAsJsonAsync("/api/v1/lists", new { name = "Films cultes" });
        var list = (await created.Content.ReadFromJsonAsync<MovieListSummaryResponse>(Json))!;
        foreach (var (tmdbId, title) in new[] { (603, "Matrix"), (680, "Pulp Fiction"), (27_205, "Inception") })
            await client.PostAsJsonAsync($"/api/v1/lists/{list.Id}/items", new { tmdbId, title, year = "1999" });
        await MarkAsync(client, 603, "Matrix");

        var summaries = JsonElement.Parse(await client.GetStringAsync("/api/v1/lists"));
        var detail = JsonElement.Parse(await client.GetStringAsync($"/api/v1/lists/{list.Id}"));

        var summary = Assert.Single(summaries.GetProperty("items").EnumerateArray().ToList());
        Assert.Equal(2, summary.GetProperty("watchedCount").GetInt32());
        Assert.Equal(
            [(603, true), (680, false), (27_205, true)],
            detail.GetProperty("items").EnumerateArray()
                .Select(item => (item.GetProperty("tmdbId").GetInt32(), item.GetProperty("isWatched").GetBoolean())));
    }

    [Fact]
    public async Task PersonalDataExport_IncludesTheTitlesWatchedElsewhere()
    {
        var client = await NewUserAsync("WatchedExport");
        await MarkAsync(client, 603, "Matrix", 8);

        var export = JsonElement.Parse(await client.GetStringAsync("/api/v1/auth/me/export"));

        var watched = Assert.Single(export.GetProperty("watchedTitles").EnumerateArray().ToList());
        Assert.Equal(603, watched.GetProperty("tmdbId").GetInt32());
        Assert.Equal("movie", watched.GetProperty("mediaType").GetString());
        Assert.Equal(StubTmdbTitle, watched.GetProperty("title").GetString());
        Assert.Equal(8, watched.GetProperty("rating").GetInt32());
        Assert.True(watched.TryGetProperty("watchedAt", out _));
    }

    [Fact]
    public async Task DimWatched_IsOffByDefault_AndFollowsThePatch()
    {
        var client = await NewUserAsync("WatchedDim");

        var before = JsonElement.Parse(await client.GetStringAsync("/api/v1/auth/me"));
        var patched = await client.PatchAsJsonAsync("/api/v1/auth/me", new { dimWatched = true });
        var after = JsonElement.Parse(await client.GetStringAsync("/api/v1/auth/me"));

        Assert.False(before.GetProperty("dimWatched").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, patched.StatusCode);
        Assert.True((await BodyOfAsync(patched)).GetProperty("dimWatched").GetBoolean());
        Assert.True(after.GetProperty("dimWatched").GetBoolean());
    }
}
