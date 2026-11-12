using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchTests
{
    private static HttpClient CreateHttpClient(HttpMessageHandler handler) => new(handler) { BaseAddress = new Uri("https://api.themoviedb.org") };

    private static TmdbMovieSearch CreateSut(HttpClient client, IOptions<MoviePickerOptions> options) =>
        new(client, options, new MemoryCache(new MemoryCacheOptions()), new InMemorySharedCache(), new SingleFlight(), NullLogger<TmdbMovieSearch>.Instance);

    [Fact]
    public async Task SearchAsync_NoApiKey_ThrowsInvalidOperationException()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = null });
        var client = CreateHttpClient(new Mock<HttpMessageHandler>().Object);
        var sut = CreateSut(client, options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.SearchAsync("inception", false));
        Assert.Contains("TMDB_API_KEY", ex.Message);
    }

    [Fact]
    public async Task SearchAsync_EmptyApiKey_ThrowsInvalidOperationException()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "   " });
        var client = CreateHttpClient(new Mock<HttpMessageHandler>().Object);
        var sut = CreateSut(client, options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.SearchAsync("x", false));
        Assert.Contains("TMDB_API_KEY", ex.Message);
    }

    [Fact]
    public async Task SearchAsync_EmptyQuery_ReturnsEmptyList()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var result = await sut.SearchAsync("   ", false);

        Assert.Empty(result);
        mockHandler.Protected().Verify("SendAsync", Times.Never(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task SearchAsync_OkResponse_ReturnsMappedMovies()
    {
        var json = """
            {
              "results": [
                {
                  "id": 27205,
                  "title": "Inception",
                  "release_date": "2010-07-16",
                  "vote_average": 8.8,
                  "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5ur4.jpg"
                },
                {
                  "id": 78,
                  "title": "Blade Runner",
                  "release_date": "1982-06-25",
                  "poster_path": null
                }
              ]
            }
            """;
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns(() => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json) }));
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var result = await sut.SearchAsync("inception", false);

        Assert.Equal(2, result.Count);
        var first = result[0];
        Assert.Equal(27205, first.Id);
        Assert.Equal(MovieMediaType.Movie, first.MediaType);
        Assert.Equal("Inception", first.Title);
        Assert.Equal("2010", first.Year);
        Assert.Equal(8.8, first.VoteAverage);
        Assert.Equal("https://image.tmdb.org/t/p/w154/9gk7adHYeDvHkCSEqAvQNLV5ur4.jpg", first.PosterPath);
        var second = result[1];
        Assert.Equal(78, second.Id);
        Assert.Equal("Blade Runner", second.Title);
        Assert.Equal("1982", second.Year);
        Assert.Null(second.VoteAverage);
        Assert.Null(second.PosterPath);
    }

    [Fact]
    public async Task SearchAsync_NoResultsProperty_ReturnsEmptyList()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns(() => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") }));
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var result = await sut.SearchAsync("xyz", false);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_HttpError_Throws()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable) { Content = new StringContent("Unavailable") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.SearchAsync("inception", false));
    }

    [Fact]
    public async Task SearchAsync_RequestUsesCorrectUrl_AndLeavesTheCredentialToTheHandler()
    {
        var capturedRequests = new System.Collections.Concurrent.ConcurrentBag<HttpRequestMessage>();
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "my-secret-key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequests.Add(req))
            .Returns(() => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"results\":[]}") }));
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        await sut.SearchAsync("matrix", false);

        var capturedRequest = Assert.Single(
            capturedRequests,
            request => request.RequestUri!.ToString().Contains("/search/movie", StringComparison.Ordinal));
        Assert.Equal(HttpMethod.Get, capturedRequest.Method);
        var uri = capturedRequest.RequestUri?.ToString() ?? "";
        Assert.Contains("api.themoviedb.org", uri);
        Assert.DoesNotContain("my-secret-key", uri);
        Assert.DoesNotContain("api_key", uri);
        Assert.Contains("query=matrix", uri);
        Assert.Contains("language=fr-FR", uri);
    }

    [Fact]
    public async Task SearchAsync_ThroughTheAuthenticationHandler_ReachesTmdbWithTheKey()
    {
        var capturedRequests = new System.Collections.Concurrent.ConcurrentBag<HttpRequestMessage>();
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "my-secret-key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequests.Add(req))
            .Returns(() => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"results\":[]}") }));
        var client = CreateHttpClient(new TmdbAuthenticationHandler(options) { InnerHandler = mockHandler.Object });
        var sut = CreateSut(client, options);

        await sut.SearchAsync("matrix", false);

        Assert.All(capturedRequests, request =>
            Assert.Contains("api_key=my-secret-key", request.RequestUri!.Query));
    }

    [Fact]
    public async Task EveryTmdbUrl_LeavesTheCredentialToTheHandler()
    {
        var capturedRequests = new System.Collections.Concurrent.ConcurrentBag<HttpRequestMessage>();
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "my-secret-key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequests.Add(req))
            .Returns(() => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"results\":[],\"id\":1,\"parts\":[],\"title\":\"x\",\"name\":\"x\"}") }));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), options);

        await sut.SearchAsync("Christopher Nolan", true);
        await sut.DiscoverMoviesAsync(new TmdbDiscoveryCriteria([28], null, null, null, null, null, null), 1);
        await sut.GetTrendingMoviesAsync(1);
        await sut.GetNowPlayingMoviesAsync("FR", 1);
        await sut.GetRecommendationsAsync(550, MovieMediaType.Movie);
        await sut.GetRecommendationsAsync(1399, MovieMediaType.Tv);
        await sut.GetCollectionAsync(10);
        await sut.GetDirectedMoviesAsync(525);
        await sut.GetDetailsAsync(550, MovieMediaType.Movie);
        await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        Assert.NotEmpty(capturedRequests);
        Assert.All(capturedRequests, request =>
            Assert.DoesNotContain("my-secret-key", request.RequestUri!.ToString()));
    }

    [Fact]
    public async Task GetRecommendationsAsync_SeriesSeed_ListsSeriesFromTheSeriesEndpoint()
    {
        var requested = new System.Collections.Concurrent.ConcurrentBag<string>();
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) =>
            {
                requested.Add(req.RequestUri!.AbsolutePath);
                var body = req.RequestUri.Query.Contains("page=1", StringComparison.Ordinal)
                    ? """{"results":[{"id":66732,"name":"Stranger Things","first_air_date":"2016-07-15","vote_average":8.6,"genre_ids":[18]}]}"""
                    : """{"results":[]}""";
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
            });
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        var result = await sut.GetRecommendationsAsync(1399, MovieMediaType.Tv);

        var item = Assert.Single(result);
        Assert.Equal(MovieMediaType.Tv, item.MediaType);
        Assert.Equal("Stranger Things", item.Title);
        Assert.Equal("2016", item.Year);
        Assert.All(requested, path => Assert.Equal("/3/tv/1399/recommendations", path));
    }

    [Fact]
    public async Task GetRecommendationsAsync_SeedUnknownToTmdb_IsAnEmptyList()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.NotFound));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        Assert.Empty(await sut.GetRecommendationsAsync(1399, MovieMediaType.Movie));
    }

    [Fact]
    public async Task GetRecommendationsAsync_TmdbDown_StillThrows()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GetRecommendationsAsync(550, MovieMediaType.Movie));
    }

    private static readonly int[] NolanFilmsMostVotedFirst = [11, 10, 13];

    [Fact]
    public async Task GetDirectedMoviesAsync_ListsTheFilmsThePersonDirected_MostVotedFirst()
    {
        var requested = new System.Collections.Concurrent.ConcurrentBag<Uri>();
        var credits = """
            {
              "cast": [{ "id": 1, "title": "Caméo", "poster_path": "/cameo.jpg", "vote_count": 99999 }],
              "crew": [
                { "id": 10, "title": "Memento", "release_date": "2000-10-11", "poster_path": "/memento.jpg", "vote_count": 15000, "job": "Director" },
                { "id": 11, "title": "Inception", "release_date": "2010-07-15", "poster_path": "/inception.jpg", "vote_count": 37000, "job": "Director", "genre_ids": [28] },
                { "id": 11, "title": "Inception", "release_date": "2010-07-15", "poster_path": "/inception.jpg", "vote_count": 37000, "job": "Screenplay" },
                { "id": 12, "title": "Doodlebug", "release_date": "1997-01-01", "poster_path": null, "vote_count": 500, "job": "Director" },
                { "id": 13, "title": "Following", "release_date": "1998-09-12", "poster_path": "/following.jpg", "vote_count": 1500, "job": "Director" },
                { "id": 11, "title": "Inception", "release_date": "2010-07-15", "poster_path": "/inception.jpg", "vote_count": 37000, "job": "Director" },
                { "id": 14, "title": "Produit", "release_date": "2014-01-01", "poster_path": "/produced.jpg", "vote_count": 50000, "job": "Producer" }
              ]
            }
            """;
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) =>
            {
                requested.Add(req.RequestUri!);
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(credits) });
            });
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        var films = await sut.GetDirectedMoviesAsync(525);

        Assert.Equal(NolanFilmsMostVotedFirst, films.Select(film => film.Id));
        Assert.All(films, film => Assert.Equal(MovieMediaType.Movie, film.MediaType));
        var inception = films[0];
        Assert.Equal("Inception", inception.Title);
        Assert.Equal("2010", inception.Year);
        Assert.Equal("https://image.tmdb.org/t/p/w154/inception.jpg", inception.PosterPath);
        var url = Assert.Single(requested);
        Assert.Equal("/3/person/525/movie_credits", url.AbsolutePath);
        Assert.Contains("language=fr-FR", url.Query, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetDirectedMoviesAsync_ProlificDirector_KeepsTheTwentyMostVotedFilms()
    {
        var crew = string.Join(",", Enumerable.Range(1, 25).Select(i =>
            $$"""{ "id": {{i}}, "title": "Film {{i}}", "poster_path": "/{{i}}.jpg", "vote_count": {{i * 10}}, "job": "Director" }"""));
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent($$"""{"crew":[{{crew}}]}""") });
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        var films = await sut.GetDirectedMoviesAsync(525);

        Assert.Equal(20, films.Count);
        Assert.Equal(25, films[0].Id);
        Assert.Equal(6, films[^1].Id);
    }

    [Fact]
    public async Task GetDirectedMoviesAsync_PersonUnknownToTmdb_IsAnEmptyList()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.NotFound));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        Assert.Empty(await sut.GetDirectedMoviesAsync(525));
    }

    [Fact]
    public async Task GetDirectedMoviesAsync_TmdbDown_StillThrows()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GetDirectedMoviesAsync(525));
    }

    [Fact]
    public async Task GetEnrichmentAsync_NoApiKey_ReturnsNull()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = null });
        var client = CreateHttpClient(new Mock<HttpMessageHandler>().Object);
        var sut = CreateSut(client, options);

        var r = await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        Assert.Null(r);
    }

    [Fact]
    public async Task GetEnrichmentAsync_CachesSecondCall_SingleHttpPair()
    {
        var movieJson = """{"vote_average": 8.4, "runtime": 139}""";
        var watchJson = """
            {
              "id": 550,
              "results": {
                "FR": {
                  "link": "https://www.themoviedb.org/movie/550/watch?locale=FR",
                  "flatrate": [
                    {
                      "logo_path": "/netflix.png",
                      "provider_id": 8,
                      "provider_name": "Netflix",
                      "display_priority": 0
                    }
                  ]
                }
              }
            }
            """;
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>(
                (req, _) =>
                {
                    var u = req.RequestUri?.AbsolutePath ?? "";
                    var body = u.Contains("/watch/providers", StringComparison.Ordinal) ? watchJson : movieJson;
                    return Task.FromResult(
                        new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
                });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var a = await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");
        var b = await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        Assert.NotNull(a);
        Assert.NotNull(b);
        Assert.Equal(8.4, a!.VoteAverage);
        Assert.Equal(139, a.RuntimeMinutes);
        Assert.Single(a.WatchProviders);
        Assert.Equal("Netflix", a.WatchProviders[0].ProviderName);
        Assert.Equal("flatrate", a.WatchProviders[0].MonetizationType);
        Assert.Contains("themoviedb.org", a.TmdbWatchPageUrl ?? "", StringComparison.OrdinalIgnoreCase);
        mockHandler.Protected().Verify(
            "SendAsync",
            Times.Exactly(2),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetEnrichmentAsync_SharedCacheHit_SkipsHttpOnAFreshInstance()
    {
        var shared = new InMemorySharedCache();
        var enrichment = new TmdbMovieEnrichment(7.1, [], null, 95);
        await shared.SetAsync("tmdb-enrich-v2:movie:FR:550", enrichment, TimeSpan.FromHours(1));
        var mockHandler = new Mock<HttpMessageHandler>();
        var sut = new TmdbMovieSearch(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

        var result = await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        Assert.Equal(95, result?.RuntimeMinutes);
        mockHandler.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetEnrichmentAsync_FreshFetch_PublishesToTheSharedCache()
    {
        var shared = new InMemorySharedCache();
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"vote_average": 8.4, "runtime": 139, "results": {}}""")
            });
        var sut = new TmdbMovieSearch(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

        await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        var published = await shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v2:movie:FR:550");
        Assert.Equal(139, published?.Value.RuntimeMinutes);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task GetEnrichmentAsync_TmdbRefusesToAnswer_IsNotPublishedAsAnEmptyEnrichment(HttpStatusCode refusal)
    {
        var shared = new InMemorySharedCache();
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(refusal));
        var sut = new TmdbMovieSearch(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

        var result = await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        Assert.Null(result);
        Assert.Null(await shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v2:movie:FR:550"));
    }

    private sealed class HeldTmdb : HttpMessageHandler
    {
        private readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _calls;

        public int Calls => Volatile.Read(ref _calls);

        public void Release() => _release.SetResult();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref _calls);
            await _release.Task;
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(RuntimeBodyFromPath(request)) };
        }
    }

    [Fact]
    public async Task GetEnrichmentAsync_ConcurrentCallersOnTwoTypedClients_ShareOneFetch()
    {
        var tmdb = new HeldTmdb();
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var memory = new MemoryCache(new MemoryCacheOptions());
        var shared = new InMemorySharedCache();
        var flight = new SingleFlight();
        TmdbMovieSearch TypedClient() => new(new HttpClient(tmdb), options, memory, shared, flight, NullLogger<TmdbMovieSearch>.Instance);

        var first = TypedClient().GetEnrichmentAsync(7, MovieMediaType.Movie, "FR");
        var second = TypedClient().GetEnrichmentAsync(7, MovieMediaType.Movie, "FR");
        tmdb.Release();

        Assert.Equal(7, (await first)?.RuntimeMinutes);
        Assert.Equal(7, (await second)?.RuntimeMinutes);
        Assert.Equal(2, tmdb.Calls);
    }

    [Fact]
    public async Task GetEnrichmentAsync_ACallerGivesUp_TheOtherOneStillReceivesTheSharedFetch()
    {
        var tmdb = new HeldTmdb();
        var sut = CreateSut(new HttpClient(tmdb), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
        using var abandoned = new CancellationTokenSource();

        var leaving = sut.GetEnrichmentAsync(7, MovieMediaType.Movie, "FR", abandoned.Token);
        var staying = sut.GetEnrichmentAsync(7, MovieMediaType.Movie, "FR");
        abandoned.Cancel();
        tmdb.Release();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => leaving);
        Assert.Equal(7, (await staying)?.RuntimeMinutes);
    }

    [Fact]
    public async Task GetEnrichmentAsync_SharedCacheFull_KeepsTheEntryInMemoryAndWritesNothing()
    {
        var shared = new InMemorySharedCache();
        await shared.SetAsync("showcase-v1:trending", "snapshot", TimeSpan.FromHours(1));
        var mockHandler = EnrichmentHandler(RuntimeBodyFromPath);
        var sut = new TmdbMovieSearch(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentSharedCacheMaxEntries = 1 }),
            new MemoryCache(new MemoryCacheOptions()),
            shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

        var first = await sut.GetEnrichmentAsync(7, MovieMediaType.Movie, "FR");
        var second = await sut.GetEnrichmentAsync(7, MovieMediaType.Movie, "FR");

        Assert.Equal(7, first?.RuntimeMinutes);
        Assert.Equal(7, second?.RuntimeMinutes);
        Assert.Null(await shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v2:movie:FR:7"));
        mockHandler.Protected().Verify(
            "SendAsync",
            Times.Exactly(2),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetEnrichmentAsync_TitleUnknownToTmdb_IsCachedAsAnEmptyEnrichment()
    {
        var shared = new InMemorySharedCache();
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.NotFound));
        var sut = new TmdbMovieSearch(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

        var result = await sut.GetEnrichmentAsync(550, MovieMediaType.Movie, "FR");

        Assert.NotNull(result);
        Assert.Null(result!.VoteAverage);
        Assert.NotNull(await shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v2:movie:FR:550"));
    }

    [Fact]
    public async Task GetCollectionAsync_TmdbThrottles_ThrowsSoTheCallerKnowsTheListIsIncomplete()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.TooManyRequests));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GetCollectionAsync(10));
    }

    [Fact]
    public async Task GetCollectionAsync_ListsThePartPostersInReleaseOrderAndSkipsFilmsWithoutOne()
    {
        var collectionJson = """
            {
              "id": 10,
              "name": "Star Wars - La Saga",
              "poster_path": "/saga.jpg",
              "parts": [
                { "id": 3, "title": "Le Retour du Jedi", "release_date": "1983-05-25", "poster_path": "/jedi.jpg" },
                { "id": 4, "title": "Episode IX", "release_date": "", "poster_path": "/announced.jpg" },
                { "id": 1, "title": "La Guerre des étoiles", "release_date": "1977-05-25", "poster_path": "/hope.jpg" },
                { "id": 5, "title": "Sans affiche", "release_date": "1979-01-01", "poster_path": null },
                { "id": 2, "title": "L'Empire contre-attaque", "release_date": "1980-05-20", "poster_path": "/empire.jpg" }
              ]
            }
            """;
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(collectionJson) });
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        var summary = await sut.GetCollectionAsync(10);

        Assert.NotNull(summary);
        Assert.Equal(5, summary!.MovieCount);
        Assert.Equal(
            [
                "https://image.tmdb.org/t/p/w154/hope.jpg",
                "https://image.tmdb.org/t/p/w154/empire.jpg",
                "https://image.tmdb.org/t/p/w154/jedi.jpg",
                "https://image.tmdb.org/t/p/w154/announced.jpg",
            ],
            summary.PartPosterPaths);
    }

    [Fact]
    public async Task GetCollectionAsync_UnknownCollection_ReturnsNull()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() => new HttpResponseMessage(HttpStatusCode.NotFound));
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        Assert.Null(await sut.GetCollectionAsync(10));
    }

    [Fact]
    public async Task GetEnrichmentAsync_SameProviderInFlatrateAndRent_KeepsFlatrate()
    {
        var movieJson = """{"vote_average": 6.0}""";
        var watchJson = """
            {
              "id": 1,
              "results": {
                "FR": {
                  "link": "https://www.themoviedb.org/movie/1/watch",
                  "flatrate": [
                    {
                      "logo_path": "/a.png",
                      "provider_id": 8,
                      "provider_name": "Netflix",
                      "display_priority": 0
                    }
                  ],
                  "rent": [
                    {
                      "logo_path": "/a.png",
                      "provider_id": 8,
                      "provider_name": "Netflix",
                      "display_priority": 0
                    }
                  ]
                }
              }
            }
            """;
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>(
                (req, _) =>
                {
                    var u = req.RequestUri?.AbsolutePath ?? "";
                    var body = u.Contains("/watch/providers", StringComparison.Ordinal) ? watchJson : movieJson;
                    return Task.FromResult(
                        new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
                });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var a = await sut.GetEnrichmentAsync(1, MovieMediaType.Movie, "FR");

        Assert.NotNull(a);
        var p = Assert.Single(a!.WatchProviders);
        Assert.Equal("flatrate", p.MonetizationType);
    }

    [Fact]
    public async Task GetEnrichmentAsync_IncludesRentAndBuy_OrderedByMonetization()
    {
        var movieJson = """{"vote_average": 7.5}""";
        var watchJson = """
            {
              "id": 1,
              "results": {
                "FR": {
                  "link": "https://www.themoviedb.org/movie/1/watch",
                  "buy": [
                    {
                      "logo_path": "/buy.png",
                      "provider_id": 68,
                      "provider_name": "Microsoft Store",
                      "display_priority": 0
                    }
                  ],
                  "rent": [
                    {
                      "logo_path": "/rent.png",
                      "provider_id": 3,
                      "provider_name": "Google Play",
                      "display_priority": 0
                    }
                  ],
                  "flatrate": [
                    {
                      "logo_path": "/sub.png",
                      "provider_id": 8,
                      "provider_name": "Netflix",
                      "display_priority": 0
                    }
                  ]
                }
              }
            }
            """;
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>(
                (req, _) =>
                {
                    var u = req.RequestUri?.AbsolutePath ?? "";
                    var body = u.Contains("/watch/providers", StringComparison.Ordinal) ? watchJson : movieJson;
                    return Task.FromResult(
                        new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
                });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var a = await sut.GetEnrichmentAsync(1, MovieMediaType.Movie, "FR");

        Assert.NotNull(a);
        Assert.Equal(3, a!.WatchProviders.Count);
        Assert.Equal("flatrate", a.WatchProviders[0].MonetizationType);
        Assert.Equal("rent", a.WatchProviders[1].MonetizationType);
        Assert.Equal("buy", a.WatchProviders[2].MonetizationType);
    }

    [Theory]
    [InlineData("""{"vote_average": 7.0}""")]
    [InlineData("""{"vote_average": 7.0, "runtime": 0}""")]
    [InlineData("""{"vote_average": 7.0, "runtime": null}""")]
    public async Task GetEnrichmentAsync_RuntimeAbsentOrZeroOrNull_ReturnsNullRuntime(string movieJson)
    {
        var watchJson = """{"id": 1, "results": {}}""";
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>(
                (req, _) =>
                {
                    var u = req.RequestUri?.AbsolutePath ?? "";
                    var body = u.Contains("/watch/providers", StringComparison.Ordinal) ? watchJson : movieJson;
                    return Task.FromResult(
                        new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
                });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var a = await sut.GetEnrichmentAsync(1, MovieMediaType.Movie, "FR");

        Assert.NotNull(a);
        Assert.Null(a!.RuntimeMinutes);
        Assert.Equal(7.0, a.VoteAverage);
    }

    [Fact]
    public async Task GetEnrichmentAsync_MalformedJson_ReturnsNullInsteadOfThrowing()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("not a json") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = CreateSut(client, options);

        var a = await sut.GetEnrichmentAsync(1, MovieMediaType.Movie, "FR");

        Assert.Null(a);
    }

    private static Mock<HttpMessageHandler> EnrichmentHandler(Func<HttpRequestMessage, string> body)
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) => Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body(req)) }));
        return mockHandler;
    }

    private static string RuntimeBodyFromPath(HttpRequestMessage req)
    {
        var path = req.RequestUri?.AbsolutePath ?? "";
        if (path.Contains("/watch/providers", StringComparison.Ordinal))
            return """{"results": {}}""";
        var id = path.Split('/', StringSplitOptions.RemoveEmptyEntries)[^1];
        return path.Contains("/tv/", StringComparison.Ordinal)
            ? $$"""{"vote_average": 7.0, "episode_run_time": [{{id}}] }"""
            : $$"""{"vote_average": 7.0, "runtime": {{id}} }""";
    }

    [Fact]
    public async Task GetEnrichmentsAsync_NoApiKey_ReturnsAnEmptyMap()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = null }));

        var result = await sut.GetEnrichmentsAsync([(550, MovieMediaType.Movie)], "FR");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetEnrichmentsAsync_ServesEachKeyFromTheCheapestLayer_AndFetchesTheRest()
    {
        var shared = new InMemorySharedCache();
        await shared.SetAsync("tmdb-enrich-v2:movie:FR:2", new TmdbMovieEnrichment(6.0, [], null, 92), TimeSpan.FromHours(1));
        var memory = new MemoryCache(new MemoryCacheOptions());
        memory.Set("tmdb-enrich-v2:movie:FR:1", new TmdbMovieEnrichment(5.0, [], null, 91));
        var mockHandler = EnrichmentHandler(RuntimeBodyFromPath);
        var sut = new TmdbMovieSearch(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 }),
            memory,
            shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

        var result = await sut.GetEnrichmentsAsync(
            [(1, MovieMediaType.Movie), (2, MovieMediaType.Movie), (3, MovieMediaType.Movie), (3, MovieMediaType.Movie), (4, MovieMediaType.Tv)],
            "fr");

        Assert.Equal(4, result.Count);
        Assert.Equal(91, result[(1, MovieMediaType.Movie)]?.RuntimeMinutes);
        Assert.Equal(92, result[(2, MovieMediaType.Movie)]?.RuntimeMinutes);
        Assert.Equal(3, result[(3, MovieMediaType.Movie)]?.RuntimeMinutes);
        Assert.Equal(4, result[(4, MovieMediaType.Tv)]?.RuntimeMinutes);
        mockHandler.Protected().Verify(
            "SendAsync",
            Times.Exactly(4),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
        Assert.Equal(92, memory.Get<TmdbMovieEnrichment>("tmdb-enrich-v2:movie:FR:2")?.RuntimeMinutes);
        Assert.Equal(3, (await shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v2:movie:FR:3"))?.Value.RuntimeMinutes);
        Assert.Equal(4, (await shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v2:tv:FR:4"))?.Value.RuntimeMinutes);
    }

    [Fact]
    public async Task GetEnrichmentsAsync_FetchesTheBudgetOnly_AndLeavesTheRestForTheNextCall()
    {
        var mockHandler = EnrichmentHandler(RuntimeBodyFromPath);
        var sut = CreateSut(
            CreateHttpClient(mockHandler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbBatchEnrichmentMaxFetch = 1 }));

        var first = await sut.GetEnrichmentsAsync([(1, MovieMediaType.Movie), (2, MovieMediaType.Movie)], "FR");
        var second = await sut.GetEnrichmentsAsync([(1, MovieMediaType.Movie), (2, MovieMediaType.Movie)], "FR");

        var only = Assert.Single(first);
        Assert.Equal((1, MovieMediaType.Movie), only.Key);
        Assert.Equal(2, second.Count);
        Assert.Equal(2, second[(2, MovieMediaType.Movie)]?.RuntimeMinutes);
        mockHandler.Protected().Verify(
            "SendAsync",
            Times.Exactly(4),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetEnrichmentAsync_ClientCancellation_Propagates_AndRemembersNoFailure()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, token) =>
            {
                token.ThrowIfCancellationRequested();
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(RuntimeBodyFromPath(req))
                });
            });
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
        using var aborted = new CancellationTokenSource();
        aborted.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => sut.GetEnrichmentAsync(7, MovieMediaType.Movie, "FR", aborted.Token));
        var afterwards = await sut.GetEnrichmentAsync(7, MovieMediaType.Movie, "FR");

        Assert.Equal(7, afterwards?.RuntimeMinutes);
    }

    [Fact]
    public async Task GetEnrichmentsAsync_TmdbFailure_YieldsNullForThatKeyOnly_AndRemembersIt()
    {
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) =>
            {
                var path = req.RequestUri?.AbsolutePath ?? "";
                if (path.Contains("/movie/2", StringComparison.Ordinal))
                    throw new HttpRequestException("tmdb down");
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(RuntimeBodyFromPath(req))
                });
            });
        var sut = CreateSut(CreateHttpClient(mockHandler.Object), Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        var result = await sut.GetEnrichmentsAsync([(1, MovieMediaType.Movie), (2, MovieMediaType.Movie)], "FR");
        var again = await sut.GetEnrichmentsAsync([(2, MovieMediaType.Movie)], "FR");

        Assert.Equal(1, result[(1, MovieMediaType.Movie)]?.RuntimeMinutes);
        Assert.True(result.ContainsKey((2, MovieMediaType.Movie)));
        Assert.Null(result[(2, MovieMediaType.Movie)]);
        Assert.Null(again[(2, MovieMediaType.Movie)]);
        mockHandler.Protected().Verify(
            "SendAsync",
            Times.Exactly(4),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }
}
