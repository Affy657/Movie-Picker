using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MoviePicker.Api.Application.Ports;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

/// <summary>
/// Couvre le nouvel endpoint <c>GET /api/v1/movies/tmdb/{tmdbId}/details</c> — 200, 404 (film inconnu), 503 (TMDB KO).
/// </summary>
public sealed class MovieDetailsEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MovieDetailsEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

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
                new[] { "Leonardo DiCaprio", "Joseph Gordon-Levitt" },
                148,
                new[] { "Action" },
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

        public Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<TmdbSearchItem>>(Array.Empty<TmdbSearchItem>());

        public Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, string region, CancellationToken ct = default)
            => Task.FromResult<TmdbMovieEnrichment?>(null);

        public Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, CancellationToken ct = default)
        {
            if (ThrowOnDetails)
                throw new HttpRequestException("tmdb down");
            return Task.FromResult(Details);
        }
    }
}
