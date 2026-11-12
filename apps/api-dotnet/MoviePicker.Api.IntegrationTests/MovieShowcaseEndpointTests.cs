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
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
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

    private static HttpResponseMessage TmdbJson(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body) };

    private static HttpResponseMessage SagasWithUnorderedParts(string pathAndQuery) =>
        pathAndQuery.StartsWith("/3/collection/", StringComparison.Ordinal)
            ? TmdbJson("""
                {
                  "name": "Saga",
                  "poster_path": "/saga.jpg",
                  "parts": [
                    { "id": 3, "title": "Troisième", "release_date": "2010-01-01", "poster_path": "/third.jpg" },
                    { "id": 1, "title": "Premier", "release_date": "1990-01-01", "poster_path": "/first.jpg" },
                    { "id": 4, "title": "Quatrième", "release_date": "2020-01-01", "poster_path": "/fourth.jpg" },
                    { "id": 2, "title": "Deuxième", "release_date": "2000-01-01", "poster_path": null },
                    { "id": 5, "title": "Cinquième", "release_date": "2005-01-01", "poster_path": "/fifth.jpg" }
                  ]
                }
                """)
            : new HttpResponseMessage(HttpStatusCode.NotFound);

    private static HttpResponseMessage ThemeDiscoveries(string pathAndQuery)
    {
        if (!pathAndQuery.StartsWith("/3/discover/movie", StringComparison.Ordinal))
            return new HttpResponseMessage(HttpStatusCode.NotFound);

        var results = pathAndQuery.Contains("page=1", StringComparison.Ordinal)
            ? """
              [
                { "id": 1, "title": "Alien", "release_date": "1979-05-25", "poster_path": "/alien.jpg" },
                { "id": 2, "title": "Sans affiche", "release_date": "1980-01-01", "poster_path": null },
                { "id": 3, "title": "The Thing", "release_date": "1982-06-25", "poster_path": "/thing.jpg" },
                { "id": 4, "title": "Halloween", "release_date": "1978-10-25", "poster_path": "/halloween.jpg" },
                { "id": 5, "title": "Scream", "release_date": "1996-12-20", "poster_path": "/scream.jpg" }
              ]
              """
            : "[]";
        return TmdbJson($$"""{"results":{{results}}}""");
    }

    private HttpClient CreateClientOnTmdb(Func<string, HttpResponseMessage> route) =>
        _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<ISharedCache>();
            services.AddSingleton<ISharedCache, InMemorySharedCache>();
            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch>(new TmdbMovieSearch(
                new HttpClient(new TmdbRoutes(route)),
                Options.Create(new MoviePickerOptions { TmdbApiKey = "test-key" }),
                new MemoryCache(new MemoryCacheOptions()),
                new InMemorySharedCache(),
                new SingleFlight(),
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

    private static HttpResponseMessage NolanCreditsOnly(string pathAndQuery) =>
        pathAndQuery.StartsWith("/3/person/525/movie_credits", StringComparison.Ordinal)
            ? TmdbJson("""
                {
                  "crew": [
                    { "id": 77, "title": "Memento", "release_date": "2000-10-11", "poster_path": "/memento.jpg", "vote_count": 15000, "job": "Director" },
                    { "id": 27205, "title": "Inception", "release_date": "2010-07-15", "poster_path": "/inception.jpg", "vote_count": 37000, "job": "Director" },
                    { "id": 11660, "title": "Following", "release_date": "1998-09-12", "poster_path": null, "vote_count": 1500, "job": "Director" },
                    { "id": 155, "title": "The Dark Knight", "release_date": "2008-07-16", "poster_path": "/tdk.jpg", "vote_count": 33000, "job": "Screenplay" }
                  ]
                }
                """)
            : new HttpResponseMessage(HttpStatusCode.NotFound);

    [Fact]
    public async Task Showcase_Director_ListsTheFilmsThatPersonDirected_MostVotedFirst()
    {
        using var client = CreateClientOnTmdb(NolanCreditsOnly);

        var res = await client.GetAsync("/api/v1/movies/showcase?section=director&personId=525");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<MovieShowcaseListResponse>(JsonOptions);
        Assert.Equal("director", body!.Section);
        Assert.Equal([27_205, 77], body.Items.Select(item => item.Id));
        Assert.All(body.Items, item => Assert.Equal(MovieMediaType.Movie, item.MediaType));
        Assert.Equal("Inception", body.Items[0].Title);
        Assert.Equal("2010", body.Items[0].Year);
    }

    [Theory]
    [InlineData("")]
    [InlineData("&personId=0")]
    [InlineData("&personId=abc")]
    public async Task Showcase_DirectorWithoutAPerson_Answers400(string personQuery)
    {
        using var client = CreateClientOnTmdb(NolanCreditsOnly);

        var res = await client.GetAsync($"/api/v1/movies/showcase?section=director{personQuery}");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
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

    [Theory]
    [InlineData("?section=trending&genreIds=987654", "unknown_genre")]
    [InlineData("?section=collection&collectionId=2000000000", "unknown_collection")]
    [InlineData("?section=recommendations&seedTmdbId=2000000000", "reference_movie_missing")]
    public async Task Showcase_KeyOutOfTheCatalog_ReturnsBadRequestWithItsCode(string query, string reason)
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync($"/api/v1/movies/showcase{query}");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = System.Text.Json.JsonElement.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal(reason, body.GetProperty("reason").GetString());
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
    [InlineData("/api/v1/movies/showcase/themes")]
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

    [Fact]
    public async Task Collections_PreviewThreePostersPerSagaInReleaseOrder()
    {
        using var client = CreateClientOnTmdb(SagasWithUnorderedParts);

        var res = await client.GetAsync("/api/v1/movies/collections");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var saga = body.RootElement.GetProperty("items")[0];
        Assert.Equal(
            [
                "https://image.tmdb.org/t/p/w154/first.jpg",
                "https://image.tmdb.org/t/p/w154/fifth.jpg",
                "https://image.tmdb.org/t/p/w154/third.jpg",
            ],
            saga.GetProperty("previewPosterPaths").EnumerateArray().Select(path => path.GetString()).ToList());
    }

    [Fact]
    public async Task ShowcaseThemes_IsAnonymous_PreviewsThreePostersPerThemeInCatalogOrder()
    {
        using var client = CreateClientOnTmdb(ThemeDiscoveries);

        var res = await client.GetAsync("/api/v1/movies/showcase/themes");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var items = body.RootElement.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal<string?>(MovieShowcaseCatalog.ThemeKeys, items.Select(item => item.GetProperty("theme").GetString()).ToList());
        var posters = items[0].GetProperty("posters").EnumerateArray()
            .Select(poster => (poster.GetProperty("title").GetString(), poster.GetProperty("posterPath").GetString()))
            .ToList();
        Assert.Equal(
            [
                ("Alien", "https://image.tmdb.org/t/p/w154/alien.jpg"),
                ("The Thing", "https://image.tmdb.org/t/p/w154/thing.jpg"),
                ("Halloween", "https://image.tmdb.org/t/p/w154/halloween.jpg"),
            ],
            posters);
    }

    [Fact]
    public async Task ShowcaseThemes_TmdbDown_ReturnsServiceUnavailable()
    {
        using var client = CreateClientOnTmdb(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));

        var res = await client.GetAsync("/api/v1/movies/showcase/themes");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal("showcase_unavailable", body.RootElement.GetProperty("reason").GetString());
    }
}
