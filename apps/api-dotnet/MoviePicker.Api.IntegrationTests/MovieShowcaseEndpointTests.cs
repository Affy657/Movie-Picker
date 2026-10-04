using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieShowcaseEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const int SeriesSeedId = 1_399;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MovieShowcaseEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<MovieShowcaseListResponse> GetShowcaseAsync(string queryString)
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/movies/showcase{queryString}");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<MovieShowcaseListResponse>(JsonOptions);
        Assert.NotNull(body);
        return body!;
    }

    private sealed class TmdbRoutes(Func<string, HttpResponseMessage> route) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(route(request.RequestUri!.AbsolutePath + request.RequestUri.Query));
    }

    private static HttpResponseMessage SeriesRecommendationsOnly(string pathAndQuery)
    {
        if (pathAndQuery.StartsWith($"/3/tv/{SeriesSeedId}/recommendations", StringComparison.Ordinal))
        {
            var results = pathAndQuery.Contains("page=1", StringComparison.Ordinal)
                ? """[{"id":66732,"media_type":"tv","name":"Stranger Things","first_air_date":"2016-07-15","genre_ids":[18,9648],"vote_average":8.6}]"""
                : "[]";
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent($$"""{"results":{{results}}}""") };
        }

        return new HttpResponseMessage(HttpStatusCode.NotFound);
    }

    private HttpClient CreateClientOnTmdb(Func<string, HttpResponseMessage> route) =>
        _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch>(new TmdbMovieSearch(
                new HttpClient(new TmdbRoutes(route)),
                Options.Create(new MoviePickerOptions { TmdbApiKey = "test-key" }),
                new MemoryCache(new MemoryCacheOptions()),
                new InMemorySharedCache(),
                NullLogger<TmdbMovieSearch>.Instance));
        })).CreateClient();

    [Fact]
    public async Task Showcase_RecommendationsForASeries_ListsTheSeriesTmdbRecommends()
    {
        using var client = CreateClientOnTmdb(SeriesRecommendationsOnly);

        var res = await client.GetAsync($"/api/v1/movies/showcase?section=recommendations&seedTmdbId={SeriesSeedId}&seedMediaType=tv");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<MovieShowcaseListResponse>(JsonOptions);
        var item = Assert.Single(body!.Items);
        Assert.Equal(66_732, item.Id);
        Assert.Equal(MovieMediaType.Tv, item.MediaType);
        Assert.Equal("Stranger Things", item.Title);
        Assert.Equal("2016", item.Year);
    }

    [Fact]
    public async Task Showcase_RecommendationsForASeedTmdbDoesNotKnowAsAFilm_IsAnEmptyList()
    {
        using var client = CreateClientOnTmdb(SeriesRecommendationsOnly);

        var res = await client.GetAsync($"/api/v1/movies/showcase?section=recommendations&seedTmdbId={SeriesSeedId}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<MovieShowcaseListResponse>(JsonOptions);
        Assert.Empty(body!.Items);
    }

    [Fact]
    public async Task Showcase_IsAnonymous_ReturnsTrendingItems()
    {
        var body = await GetShowcaseAsync("?section=trending");

        Assert.Equal("trending", body.Section);
        Assert.NotEmpty(body.Items);
        Assert.All(body.Items, item => Assert.False(string.IsNullOrWhiteSpace(item.Title)));
        Assert.False(string.IsNullOrWhiteSpace(body.Disclaimer));
    }

    [Fact]
    public async Task Showcase_WithoutSection_DefaultsToTrending()
    {
        var body = await GetShowcaseAsync(string.Empty);

        Assert.Equal("trending", body.Section);
    }

    [Fact]
    public async Task Showcase_NowPlaying_ReturnsItems()
    {
        var body = await GetShowcaseAsync("?section=now-playing");

        Assert.Equal("now-playing", body.Section);
        Assert.NotEmpty(body.Items);
    }

    [Fact]
    public async Task Showcase_KnownTheme_EchoesTheme()
    {
        var body = await GetShowcaseAsync("?section=theme&theme=annees-80");

        Assert.Equal("annees-80", body.Theme);
        Assert.NotEmpty(body.Items);
    }

    [Fact]
    public async Task Showcase_UnknownSection_ReturnsBadRequest()
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync("/api/v1/movies/showcase?section=nawak");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Showcase_UnknownTheme_ReturnsBadRequest()
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync("/api/v1/movies/showcase?section=theme&theme=nawak");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Showcase_MostProposed_IsEmptyWhileTheServiceHasNoRanking()
    {
        var body = await GetShowcaseAsync("?section=most-proposed");

        Assert.Empty(body.Items);
    }

    [Theory]
    [InlineData("/api/v1/movies/showcase?section=trending")]
    [InlineData("/api/v1/movies/collections")]
    public async Task PublicShowcase_IsCacheableByTheBrowser(string path)
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync(path);

        res.EnsureSuccessStatusCode();
        Assert.Equal("public, max-age=300, stale-while-revalidate=3600", res.Headers.CacheControl?.ToString());
    }

    [Theory]
    [InlineData("br")]
    [InlineData("gzip")]
    public async Task Showcase_IsCompressed_WhenTheClientAcceptsIt(string encoding)
    {
        var anon = _factory.CreateClient();
        anon.DefaultRequestHeaders.AcceptEncoding.ParseAdd(encoding);

        var res = await anon.GetAsync("/api/v1/movies/showcase?section=trending");

        res.EnsureSuccessStatusCode();
        Assert.Equal(encoding, Assert.Single(res.Content.Headers.ContentEncoding));
    }

    [Fact]
    public async Task Collections_IsAnonymous_ReturnsCuratedList()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/movies/collections");

        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<MovieCollectionListResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.NotEmpty(body!.Items);
        Assert.All(body.Items, item => Assert.False(string.IsNullOrWhiteSpace(item.Name)));
    }
}
