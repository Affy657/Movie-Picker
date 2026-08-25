using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchAdvancedTests
{
    private static HttpClient CreateHttpClient(HttpMessageHandler handler) =>
        new(handler) { BaseAddress = new Uri("https://api.themoviedb.org") };

    private static TmdbMovieSearch CreateSut(HttpClient client, string? apiKey = "key") =>
        new(
            client,
            Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey, TmdbEnrichmentCacheHours = 1 }),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<TmdbMovieSearch>.Instance);

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body) };

    private static Mock<HttpMessageHandler> Handler(Func<HttpRequestMessage, HttpResponseMessage> route)
    {
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) => Task.FromResult(route(req)));
        return mock;
    }

    private static Mock<HttpMessageHandler> AlwaysReturns(string body) => Handler(_ => Json(body));

    private static readonly int[] singleGenreIdFilter = new[] { 28 };

    [Fact]
    public async Task SearchAsync_GenreFilter_KeepsOnlyMatchingItems()
    {
        var json = """
            {"results":[
              {"id":1,"title":"Match","release_date":"2020-01-01","genre_ids":[28,12]},
              {"id":2,"title":"NoMatch","release_date":"2020-01-01","genre_ids":[35]}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var result = await sut.SearchAsync("x", false, genreIds: singleGenreIdFilter);

        var item = Assert.Single(result);
        Assert.Equal(1, item.Id);
        Assert.Equal([28, 12], item.GenreIds);
    }

    [Fact]
    public async Task SearchAsync_YearFilter_DropsOutOfRangeAndUnparseable()
    {
        var json = """
            {"results":[
              {"id":1,"title":"Old","release_date":"1995-01-01"},
              {"id":2,"title":"InRange","release_date":"2021-01-01"},
              {"id":3,"title":"NoDate"}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var result = await sut.SearchAsync("x", false, yearFrom: 2000, yearTo: 2025);

        var item = Assert.Single(result);
        Assert.Equal(2, item.Id);
    }

    [Fact]
    public async Task SearchAsync_VoteMinFilter_DropsBelowThreshold()
    {
        var json = """
            {"results":[
              {"id":1,"title":"Low","release_date":"2020-01-01","vote_average":4.0},
              {"id":2,"title":"High","release_date":"2020-01-01","vote_average":8.0}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var result = await sut.SearchAsync("x", false, voteMin: 7.0);

        var item = Assert.Single(result);
        Assert.Equal(2, item.Id);
    }

    [Fact]
    public async Task SearchAsync_OriginalLanguageFilter_DropsMismatch()
    {
        var json = """
            {"results":[
              {"id":1,"title":"French","release_date":"2020-01-01","original_language":"fr"},
              {"id":2,"title":"English","release_date":"2020-01-01","original_language":"en"}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var result = await sut.SearchAsync("x", false, originalLanguage: "fr");

        var item = Assert.Single(result);
        Assert.Equal(1, item.Id);
    }

    [Fact]
    public async Task SearchAsync_AllowSeries_ResolvesMovieAndTv_SkipsPerson()
    {
        var json = """
            {"results":[
              {"id":1,"media_type":"movie","title":"Mov","release_date":"2020-05-01"},
              {"id":2,"media_type":"tv","name":"Ser","first_air_date":"2019-03-01"},
              {"id":3,"media_type":"person","name":"Famous Actor"}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var result = await sut.SearchAsync("x", allowSeries: true);

        Assert.Equal(2, result.Count);
        Assert.Equal(MovieMediaType.Movie, result[0].MediaType);
        var series = result[1];
        Assert.Equal(MovieMediaType.Tv, series.MediaType);
        Assert.Equal("Ser", series.Title);
        Assert.Equal("2019", series.Year);
    }

    private static readonly int[] multiGenreIdsFilter = new[] { 28, 12 };

    [Fact]
    public async Task SearchAsync_NoTextWithFilters_UsesDiscoverEndpointAndMapsResults()
    {
        string? capturedUrl = null;
        var handler = Handler(req =>
        {
            capturedUrl = req.RequestUri?.ToString();
            return Json(
                """{"results":[{"id":10,"title":"Popular","release_date":"2022-02-02","vote_average":9.0,"genre_ids":[28,12]}]}""");
        });
        var sut = CreateSut(CreateHttpClient(handler.Object));

        var result = await sut.SearchAsync(
            "   ", false, genreIds: multiGenreIdsFilter, yearFrom: 2000, yearTo: 2025, voteMin: 5.0, originalLanguage: "en");

        var item = Assert.Single(result);
        Assert.Equal(10, item.Id);
        Assert.Equal([28, 12], item.GenreIds);
        Assert.NotNull(capturedUrl);
        Assert.Contains("discover/movie", capturedUrl);
        Assert.Contains("with_genres=28,12", capturedUrl);
        Assert.Contains("primary_release_date.gte=2000-01-01", capturedUrl);
        Assert.Contains("primary_release_date.lte=2025-12-31", capturedUrl);
        Assert.Contains("vote_average.gte=5.0", capturedUrl);
        Assert.Contains("with_original_language=en", capturedUrl);
    }

    [Fact]
    public async Task SearchAsync_NoTextWithRuntimeFilter_UsesDiscoverEndpointWithRuntimeParams()
    {
        string? capturedUrl = null;
        var handler = Handler(req =>
        {
            capturedUrl = req.RequestUri?.ToString();
            return Json("""{"results":[]}""");
        });
        var sut = CreateSut(CreateHttpClient(handler.Object));

        await sut.SearchAsync("   ", false, runtimeMin: 90, runtimeMax: 150);

        Assert.NotNull(capturedUrl);
        Assert.Contains("discover/movie", capturedUrl);
        Assert.Contains("with_runtime.gte=90", capturedUrl);
        Assert.Contains("with_runtime.lte=150", capturedUrl);
    }

    [Fact]
    public async Task GetDetailsAsync_NoApiKey_ThrowsHttpRequestException()
    {
        var sut = CreateSut(CreateHttpClient(new Mock<HttpMessageHandler>().Object), apiKey: null);

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GetDetailsAsync(550, MovieMediaType.Movie));
    }

    [Fact]
    public async Task GetDetailsAsync_NotFound_ReturnsNull()
    {
        var handler = Handler(_ => new HttpResponseMessage(HttpStatusCode.NotFound));
        var sut = CreateSut(CreateHttpClient(handler.Object));

        var result = await sut.GetDetailsAsync(999, MovieMediaType.Movie);

        Assert.Null(result);
    }

    private static readonly string[] expected = new[] { "Drame", "Thriller" };
    private static readonly int[] expectedArray = new[] { 18, 53 };

    private static readonly string[] FightClubCast = new[] { "Brad Pitt", "Edward Norton" };

    [Fact]
    public async Task GetDetailsAsync_OkMovie_MapsAllFields()
    {
        var json = """
            {
              "id":550,
              "title":"Fight Club",
              "overview":"Un employe insomniaque.",
              "tagline":"Le premier regle.",
              "runtime":139,
              "release_date":"1999-10-15",
              "genres":[{"id":18,"name":"Drame"},{"id":53,"name":"Thriller"}],
              "credits":{
                "crew":[{"job":"Editor","name":"Someone"},{"job":"Director","name":"David Fincher"}],
                "cast":[{"name":"Brad Pitt"},{"name":"Edward Norton"}]
              },
              "videos":{"results":[{"site":"YouTube","key":"abc123","type":"Trailer","iso_639_1":"fr","official":true}]}
            }
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var details = await sut.GetDetailsAsync(550, MovieMediaType.Movie);

        Assert.NotNull(details);
        Assert.Equal(550, details!.Id);
        Assert.Equal("Fight Club", details.Title);
        Assert.Equal("Un employe insomniaque.", details.Overview);
        Assert.Equal("Le premier regle.", details.Tagline);
        Assert.Equal(139, details.Runtime);
        Assert.Equal("1999-10-15", details.ReleaseDate);
        Assert.Equal(expected, details.Genres);
        Assert.Equal(expectedArray, details.GenreIds);
        Assert.Equal("David Fincher", details.Director);
        Assert.Equal(FightClubCast, details.Cast);
        Assert.Equal("https://www.youtube.com/watch?v=abc123", details.TrailerUrl);
    }

    [Fact]
    public async Task GetDetailsAsync_PrefersOfficialFrenchTrailer()
    {
        var json = """
            {
              "id":1,"title":"T",
              "videos":{"results":[
                {"site":"YouTube","key":"teaser-en","type":"Teaser","iso_639_1":"en","official":false},
                {"site":"YouTube","key":"trailer-fr","type":"Trailer","iso_639_1":"fr","official":true},
                {"site":"Vimeo","key":"ignored","type":"Trailer","iso_639_1":"fr","official":true}
              ]}
            }
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var details = await sut.GetDetailsAsync(1, MovieMediaType.Movie);

        Assert.Equal("https://www.youtube.com/watch?v=trailer-fr", details!.TrailerUrl);
    }

    [Fact]
    public async Task GetDetailsAsync_Tv_UsesNameFirstAirDateAndEpisodeRunTime()
    {
        var json = """
            {"id":1399,"name":"Game of Thrones","first_air_date":"2011-04-17","episode_run_time":[57],"genres":[]}
            """;
        var sut = CreateSut(CreateHttpClient(AlwaysReturns(json).Object));

        var details = await sut.GetDetailsAsync(1399, MovieMediaType.Tv);

        Assert.NotNull(details);
        Assert.Equal("Game of Thrones", details!.Title);
        Assert.Equal("2011-04-17", details.ReleaseDate);
        Assert.Equal(57, details.Runtime);
        Assert.Null(details.Director);
        Assert.Empty(details.Cast);
        Assert.Null(details.TrailerUrl);
    }

    [Fact]
    public async Task GetDetailsAsync_CachesSecondCall_SingleHttpCall()
    {
        var handler = AlwaysReturns("""{"id":550,"title":"Fight Club"}""");
        var sut = CreateSut(CreateHttpClient(handler.Object));

        await sut.GetDetailsAsync(550, MovieMediaType.Movie);
        await sut.GetDetailsAsync(550, MovieMediaType.Movie);

        handler.Protected().Verify(
            "SendAsync", Times.Once(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetDetailsAsync_MalformedJson_ThrowsHttpRequestException()
    {
        var sut = CreateSut(CreateHttpClient(AlwaysReturns("not a json").Object));

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GetDetailsAsync(550, MovieMediaType.Movie));
    }

    [Fact]
    public async Task GetEnrichmentAsync_Tv_UsesEpisodeRunTime()
    {
        var detailJson = """{"vote_average":8.0,"episode_run_time":[42]}""";
        var watchJson = """{"id":1,"results":{}}""";
        var handler = Handler(req =>
        {
            var path = req.RequestUri?.AbsolutePath ?? "";
            return Json(path.Contains("/watch/providers", StringComparison.Ordinal) ? watchJson : detailJson);
        });
        var sut = CreateSut(CreateHttpClient(handler.Object));

        var enrichment = await sut.GetEnrichmentAsync(1, MovieMediaType.Tv, "FR");

        Assert.NotNull(enrichment);
        Assert.Equal(42, enrichment!.RuntimeMinutes);
        Assert.Equal(8.0, enrichment.VoteAverage);
        Assert.Empty(enrichment.WatchProviders);
    }
}
