using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.IntegrationTests.Helpers;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieShareDocumentTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MovieShareDocumentTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task FilmPage_KnownFilm_ServesTheShellWithTheFilmPreview()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;

        var res = await _factory.CreateClient().GetAsync("/film/42-film-e2e-stub");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("public, max-age=60", string.Join(", ", res.Headers.GetValues("Cache-Control")));
        Assert.Equal("frame-ancestors 'none'", string.Join(", ", res.Headers.GetValues("Content-Security-Policy")));
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Film E2E Stub (2024)\" />", html);
        Assert.Contains("<meta property=\"og:url\" content=\"https://web.integration.test/film/42-film-e2e-stub\" />", html);
        Assert.Contains("<link rel=\"canonical\" href=\"https://web.integration.test/film/42-film-e2e-stub\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
        Assert.Contains("src=\"/assets/index.js\"", html);
        Assert.DoesNotContain("Titre du site", html);
    }

    [Fact]
    public async Task SeriesPage_KnownSeries_ServesTheShellUnderTheSeriesPath()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;

        var res = await _factory.CreateClient().GetAsync("/serie/42");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:url\" content=\"https://web.integration.test/serie/42\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }

    [Theory]
    [InlineData("/film/inception")]
    [InlineData("/film/0")]
    [InlineData("/serie/abc-def")]
    public async Task FilmPage_ReferenceWithoutATmdbId_Answers404WithTheShell(string path)
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;

        var res = await _factory.CreateClient().GetAsync(path);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Movie Picker\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }

    private sealed class TmdbDown : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
    }

    [Fact]
    public async Task FilmPage_TmdbDown_Answers404WithTheShellNever500()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        using var client = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch>(new TmdbMovieSearch(
                new HttpClient(new TmdbDown()),
                Options.Create(new MoviePickerOptions { TmdbApiKey = "test-key" }),
                new MemoryCache(new MemoryCacheOptions()),
                new InMemorySharedCache(),
                new SingleFlight(),
                NullLogger<TmdbMovieSearch>.Instance));
        })).CreateClient();

        var res = await client.GetAsync("/film/27205-inception");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Movie Picker\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }

    [Fact]
    public async Task FilmDocuments_StayOutOfTheApiContract()
    {
        var json = await _factory.CreateClient().GetStringAsync("/swagger/v1/swagger.json");
        using var doc = JsonDocument.Parse(json);
        var paths = doc.RootElement.GetProperty("paths");

        Assert.False(paths.TryGetProperty("/film/{slug}", out _));
        Assert.False(paths.TryGetProperty("/serie/{slug}", out _));
        Assert.True(paths.TryGetProperty("/api/v1/movies/tmdb/{tmdbId}/nights", out var nights) && nights.TryGetProperty("get", out _));
    }
}
