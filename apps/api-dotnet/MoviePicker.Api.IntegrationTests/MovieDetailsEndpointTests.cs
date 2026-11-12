using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieDetailsEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MovieDetailsEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly string[] Cast = new[] { "Leonardo DiCaprio", "Joseph Gordon-Levitt" };
    private static readonly string[] Genres = new[] { "Action" };
    private static readonly int[] GenreIds = new[] { 28 };

    private HttpClient CreateClientWith(ITmdbMovieSearch fake) =>
        _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
        {
            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton(fake);
        })).CreateClient();

    [Fact]
    public async Task GetDetails_ValidId_Returns200WithPayload()
    {
        var fake = new FakeTmdb
        {
            Details = new TmdbMovieDetails(
                27205,
                "Inception",
                "Un voleur qui explore les rêves.",
                "Votre esprit est la scène du crime.",
                "Christopher Nolan",
                Cast,
                148,
                Genres,
                GenreIds,
                "2010-07-16")
        };
        using var client = CreateClientWith(fake);

        var res = await client.GetAsync("/api/v1/movies/tmdb/27205/details");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(27205, body.GetProperty("tmdbId").GetInt32());
        Assert.Equal("Inception", body.GetProperty("title").GetString());
        Assert.Equal("Christopher Nolan", body.GetProperty("director").GetString());
        Assert.Equal(148, body.GetProperty("runtimeMinutes").GetInt32());
        var cast = body.GetProperty("cast").EnumerateArray().Select(e => e.GetString()).ToArray();
        Assert.Contains("Leonardo DiCaprio", cast);
    }

    [Fact]
    public async Task GetDetails_FilmPageFacts_AreServedNextToTheModalFields()
    {
        var fake = new FakeTmdb
        {
            Details = new TmdbMovieDetails(
                27205, "Inception", null, null, "Christopher Nolan", Cast, 148, Genres, GenreIds, "2010-07-16",
                TrailerUrl: "https://www.youtube.com/watch?v=abc",
                Extras: new TmdbMovieDetailsExtras(
                    OriginalTitle: "Inception",
                    OriginalLanguage: "en",
                    ProductionCountries: ["GB", "US"],
                    Budget: 160_000_000,
                    VoteCount: 37_112,
                    Certification: "12",
                    Collection: new TmdbCollectionReference(1_241, "Inception, la saga"),
                    DirectorId: 525,
                    CastMembers: [new TmdbCastMember("Leonardo DiCaprio", null, "https://image.tmdb.org/t/p/w185/leo.jpg")],
                    Crew: [new TmdbCrewCredit(TmdbCrewJobs.Writer, "Christopher Nolan")],
                    Videos: [new TmdbVideo("abc", "Bande-annonce VF", "Trailer", "fr")]))
        };
        using var client = CreateClientWith(fake);

        var res = await client.GetAsync("/api/v1/movies/tmdb/27205/details?mediaType=movie");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal("Christopher Nolan", body.GetProperty("director").GetString());
        Assert.Equal("https://www.youtube.com/watch?v=abc", body.GetProperty("trailerUrl").GetString());
        Assert.Equal(2, body.GetProperty("cast").GetArrayLength());
        Assert.Equal("Inception", body.GetProperty("originalTitle").GetString());
        Assert.Equal("en", body.GetProperty("originalLanguage").GetString());
        Assert.Equal("GB,US", string.Join(",", body.GetProperty("productionCountries").EnumerateArray().Select(c => c.GetString())));
        Assert.Equal(160_000_000L, body.GetProperty("budget").GetInt64());
        Assert.Equal(37_112, body.GetProperty("voteCount").GetInt32());
        Assert.Equal("12", body.GetProperty("certification").GetString());
        Assert.Equal(1_241, body.GetProperty("collection").GetProperty("id").GetInt32());
        Assert.Equal("Inception, la saga", body.GetProperty("collection").GetProperty("name").GetString());
        Assert.Equal(525, body.GetProperty("directorId").GetInt32());
        var castMember = Assert.Single(body.GetProperty("castMembers").EnumerateArray());
        Assert.Equal("Leonardo DiCaprio", castMember.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, castMember.GetProperty("character").ValueKind);
        Assert.Equal("https://image.tmdb.org/t/p/w185/leo.jpg", castMember.GetProperty("profilePath").GetString());
        var crewMember = Assert.Single(body.GetProperty("crew").EnumerateArray());
        Assert.Equal("writer", crewMember.GetProperty("job").GetString());
        Assert.Equal("Christopher Nolan", crewMember.GetProperty("name").GetString());
        var video = Assert.Single(body.GetProperty("videos").EnumerateArray());
        Assert.Equal("abc", video.GetProperty("key").GetString());
        Assert.Equal("Bande-annonce VF", video.GetProperty("name").GetString());
        Assert.Equal("Trailer", video.GetProperty("type").GetString());
        Assert.Equal("fr", video.GetProperty("language").GetString());
    }

    [Fact]
    public async Task GetDetails_DetailsWithoutFilmPageFacts_ServeEmptyListsAndNulls()
    {
        var fake = new FakeTmdb
        {
            Details = new TmdbMovieDetails(42, "Sans extras", null, null, null, [], null, [], [], null)
        };
        using var client = CreateClientWith(fake);

        var res = await client.GetAsync("/api/v1/movies/tmdb/42/details");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(0, body.GetProperty("castMembers").GetArrayLength());
        Assert.Equal(0, body.GetProperty("crew").GetArrayLength());
        Assert.Equal(0, body.GetProperty("videos").GetArrayLength());
        Assert.Equal(0, body.GetProperty("productionCountries").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("collection").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("certification").ValueKind);
    }

    [Fact]
    public async Task GetDetails_UnknownId_Returns404()
    {
        var fake = new FakeTmdb { Details = null };
        using var client = CreateClientWith(fake);

        var res = await client.GetAsync("/api/v1/movies/tmdb/999999/details");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetDetails_TmdbUpstreamError_Returns503()
    {
        var fake = new FakeTmdb { ThrowOnDetails = true };
        using var client = CreateClientWith(fake);

        var res = await client.GetAsync("/api/v1/movies/tmdb/42/details");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
    }

    [Fact]
    public async Task GetDetails_SlowerThanTheRequestBudget_Returns503()
    {
        var fake = new FakeTmdb { HangOnDetails = true };
        using var client = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
        {
            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch>(fake);
            services.PostConfigure<RequestTimeoutOptions>(options => options.DefaultPolicy = new RequestTimeoutPolicy
            {
                Timeout = TimeSpan.FromMilliseconds(200),
                TimeoutStatusCode = options.DefaultPolicy!.TimeoutStatusCode
            });
        })).CreateClient();

        var res = await client.GetAsync("/api/v1/movies/tmdb/42/details");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
    }

    [Fact]
    public async Task GetDetails_InvalidIdZero_Returns404()
    {
        var fake = new FakeTmdb();
        using var client = CreateClientWith(fake);

        var res = await client.GetAsync("/api/v1/movies/tmdb/0/details");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    private sealed class FakeTmdb : ITmdbMovieSearch
    {
        public TmdbMovieDetails? Details { get; set; }
        public bool ThrowOnDetails { get; set; }
        public bool HangOnDetails { get; set; }

        public Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, bool allowSeries, IReadOnlyList<int>? genreIds = null, int? yearFrom = null, int? yearTo = null, double? voteMin = null, string? originalLanguage = null, int? runtimeMin = null, int? runtimeMax = null, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<IReadOnlyList<TmdbSearchItem>> SearchTitlesAsync(string query, bool allowSeries, int? yearFrom = null, int? yearTo = null, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, MovieMediaType mediaType, string region, CancellationToken ct = default)
            => Task.FromResult<TmdbMovieEnrichment?>(null);

        public Task<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>> GetEnrichmentsAsync(
            IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)> keys, string region, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>>(
                new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>());

        public async Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
        {
            if (ThrowOnDetails)
                throw new HttpRequestException("tmdb down");
            if (HangOnDetails)
                await Task.Delay(Timeout.Infinite, ct);
            return Details;
        }

        public Task<IReadOnlyList<TmdbSearchItem>> GetTrendingMoviesAsync(int pages, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<IReadOnlyList<TmdbSearchItem>> GetNowPlayingMoviesAsync(string region, int pages, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(TmdbDiscoveryCriteria criteria, int pages, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<TmdbCollectionSummary?> GetCollectionAsync(int collectionId, CancellationToken ct = default)
            => Task.FromResult<TmdbCollectionSummary?>(null);

        public Task<IReadOnlyList<TmdbSearchItem>> GetCollectionMoviesAsync(int collectionId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<IReadOnlyList<TmdbSearchItem>> GetRecommendationsAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<IReadOnlyList<TmdbSearchItem>> GetDirectedMoviesAsync(int personId, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());
    }
}
