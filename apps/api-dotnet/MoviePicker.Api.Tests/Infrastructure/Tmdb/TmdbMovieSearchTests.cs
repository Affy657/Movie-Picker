using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchTests
{
    private static HttpClient CreateHttpClient(HttpMessageHandler handler) => new(handler) { BaseAddress = new Uri("https://api.themoviedb.org") };

    private static TmdbMovieSearch CreateSut(HttpClient client, IOptions<MoviePickerOptions> options) =>
        new(client, options, new MemoryCache(new MemoryCacheOptions()), NullLogger<TmdbMovieSearch>.Instance);

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
    public async Task SearchAsync_RequestUsesCorrectUrlAndKey()
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
        Assert.Contains("api_key=my-secret-key", uri);
        Assert.Contains("query=matrix", uri);
        Assert.Contains("language=fr-FR", uri);
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
}
