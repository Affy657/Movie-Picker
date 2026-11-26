using System.Collections.Concurrent;
using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchLanguageTests
{
    private const string FrenchTitle = "Le Voyage de Chihiro";
    private const string EnglishTitle = "Spirited Away";

    private readonly LanguageAwareTmdb _tmdb = new();
    private readonly InMemorySharedCache _shared = new();

    private TmdbMovieSearch CreateSut() =>
        new(
            new HttpClient(_tmdb) { BaseAddress = new Uri("https://api.themoviedb.org") },
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            _shared,
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

    [Fact]
    public async Task GetDetailsAsync_AsksTmdbInTheInterfaceLanguage()
    {
        var details = await CreateSut().GetDetailsAsync(129, MovieMediaType.Movie, CatalogLanguage.English);

        Assert.Equal(EnglishTitle, details?.Title);
        Assert.Contains(_tmdb.Urls, url => url.Contains("/movie/129?language=en-US", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetDetailsAsync_CachesEachLanguageApart()
    {
        var sut = CreateSut();

        var french = await sut.GetDetailsAsync(129, MovieMediaType.Movie, CatalogLanguage.French);
        var english = await sut.GetDetailsAsync(129, MovieMediaType.Movie, CatalogLanguage.English);
        var frenchAgain = await sut.GetDetailsAsync(129, MovieMediaType.Movie, CatalogLanguage.French);

        Assert.Equal(FrenchTitle, french?.Title);
        Assert.Equal(EnglishTitle, english?.Title);
        Assert.Equal(FrenchTitle, frenchAgain?.Title);
        Assert.Equal(2, _tmdb.Urls.Length);
    }

    [Fact]
    public async Task GetDetailsAsync_PutsTheTrailerOfTheInterfaceLanguageFirst()
    {
        var english = await CreateSut().GetDetailsAsync(129, MovieMediaType.Movie, CatalogLanguage.English);
        var french = await CreateSut().GetDetailsAsync(129, MovieMediaType.Movie, CatalogLanguage.French);

        Assert.Equal("https://www.youtube.com/watch?v=en-trailer", english?.TrailerUrl);
        Assert.Equal("en", english?.Extras?.Videos[0].Language);
        Assert.Equal("https://www.youtube.com/watch?v=fr-trailer", french?.TrailerUrl);
        Assert.Equal("fr", french?.Extras?.Videos[0].Language);
    }

    [Fact]
    public async Task GetEnrichmentAsync_CarriesTheTitleInTheInterfaceLanguage()
    {
        var sut = CreateSut();

        var english = await sut.GetEnrichmentAsync(129, MovieMediaType.Movie, "FR", CatalogLanguage.English);
        var french = await sut.GetEnrichmentAsync(129, MovieMediaType.Movie, "FR", CatalogLanguage.French);

        Assert.Equal(EnglishTitle, english?.Title);
        Assert.Equal(FrenchTitle, french?.Title);
        Assert.Contains(_tmdb.Urls, url => url.EndsWith("/movie/129?language=en-US", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetEnrichmentAsync_SharesEachLanguageUnderItsOwnVersionedKey()
    {
        await CreateSut().GetEnrichmentAsync(129, MovieMediaType.Movie, "FR", CatalogLanguage.English);

        var shared = await _shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v3:movie:FR:en-US:129");
        Assert.Equal(EnglishTitle, shared?.Value.Title);
        Assert.Null(await _shared.TryGetAsync<TmdbMovieEnrichment>("tmdb-enrich-v3:movie:FR:fr-FR:129"));
    }

    [Fact]
    public async Task GetEnrichmentsAsync_ReadsTheSharedEntriesOfTheRequestedLanguageOnly()
    {
        await _shared.SetAsync(
            "tmdb-enrich-v3:movie:FR:fr-FR:129",
            new TmdbMovieEnrichment(8.5, [], null, 125, Title: FrenchTitle),
            TimeSpan.FromHours(1));

        var english = await CreateSut().GetEnrichmentsAsync([(129, MovieMediaType.Movie)], "FR", CatalogLanguage.English);

        Assert.Equal(EnglishTitle, english[(129, MovieMediaType.Movie)]?.Title);
        Assert.Contains(_tmdb.Urls, url => url.EndsWith("/movie/129?language=en-US", StringComparison.Ordinal));
    }

    [Fact]
    public async Task SearchAsync_AsksTmdbForTitlesInTheInterfaceLanguage()
    {
        var results = await CreateSut().SearchAsync("chihiro", false, CatalogLanguage.English);

        Assert.Equal(EnglishTitle, Assert.Single(results).Title);
        Assert.Contains(_tmdb.Urls, url => url.Contains("search/movie?query=chihiro&language=en-US", StringComparison.Ordinal));
    }

    [Fact]
    public async Task SearchTitlesAsync_AsksTmdbForTitlesInTheInterfaceLanguage()
    {
        var results = await CreateSut().SearchTitlesAsync("chihiro", true, CatalogLanguage.English);

        Assert.Equal(EnglishTitle, Assert.Single(results).Title);
        Assert.Contains(_tmdb.Urls, url => url.Contains("search/multi?query=chihiro&language=en-US", StringComparison.Ordinal));
    }

    [Fact]
    public async Task CatalogReads_AskTmdbInTheInterfaceLanguage()
    {
        var sut = CreateSut();

        await sut.GetTrendingMoviesAsync(1, CatalogLanguage.English);
        await sut.GetNowPlayingMoviesAsync("FR", 1, CatalogLanguage.English);
        await sut.DiscoverMoviesAsync(new TmdbDiscoveryCriteria(GenreIds: [16]), 1, CatalogLanguage.English);
        await sut.GetRecommendationsAsync(129, MovieMediaType.Movie, CatalogLanguage.English);
        await sut.GetDirectedMoviesAsync(608, CatalogLanguage.English);
        await sut.GetCollectionMoviesAsync(10, CatalogLanguage.English);
        var collection = await sut.GetCollectionAsync(10, CatalogLanguage.English);

        Assert.Equal("Ghibli, the collection", collection?.Name);
        Assert.All(_tmdb.Urls, url => Assert.Contains("language=en-US", url, StringComparison.Ordinal));
        Assert.DoesNotContain(_tmdb.Urls, url => url.Contains("fr-FR", StringComparison.Ordinal));
    }

    private sealed class LanguageAwareTmdb : HttpMessageHandler
    {
        private readonly ConcurrentQueue<string> _urls = new();

        public string[] Urls => _urls.ToArray();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var url = request.RequestUri!.ToString();
            _urls.Enqueue(url);
            var english = url.Contains("language=en-US", StringComparison.Ordinal);
            var title = english ? EnglishTitle : FrenchTitle;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(BodyFor(url, title, english))
            });
        }

        private static string BodyFor(string url, string title, bool english)
        {
            if (url.Contains("/watch/providers", StringComparison.Ordinal))
                return """{"results": {}}""";
            if (url.Contains("/collection/", StringComparison.Ordinal))
            {
                var name = english ? "Ghibli, the collection" : "Ghibli, la collection";
                return $$"""{"name": "{{name}}", "parts": [{"id": 129, "title": "{{title}}", "release_date": "2001-07-20", "poster_path": "/p.jpg"}]}""";
            }
            if (url.Contains("/movie_credits", StringComparison.Ordinal))
                return $$"""{"crew": [{"id": 129, "job": "Director", "title": "{{title}}", "poster_path": "/p.jpg", "vote_count": 10}]}""";
            if (url.Contains("/search/person", StringComparison.Ordinal))
                return """{"results": []}""";
            if (url.Contains("/search/multi", StringComparison.Ordinal))
                return $$"""{"results": [{"id": 129, "media_type": "movie", "title": "{{title}}", "release_date": "2001-07-20"}]}""";
            if (url.Contains("/search/", StringComparison.Ordinal)
                || url.Contains("/trending/", StringComparison.Ordinal)
                || url.Contains("/now_playing", StringComparison.Ordinal)
                || url.Contains("/discover/", StringComparison.Ordinal)
                || url.Contains("/recommendations", StringComparison.Ordinal))
                return $$"""{"results": [{"id": 129, "title": "{{title}}", "release_date": "2001-07-20"}]}""";
            return $$"""
                {
                  "id": 129,
                  "title": "{{title}}",
                  "release_date": "2001-07-20",
                  "runtime": 125,
                  "vote_average": 8.5,
                  "videos": {"results": [
                    {"site": "YouTube", "key": "fr-trailer", "type": "Trailer", "iso_639_1": "fr", "official": true, "name": "Bande-annonce"},
                    {"site": "YouTube", "key": "en-trailer", "type": "Trailer", "iso_639_1": "en", "official": true, "name": "Trailer"}
                  ]}
                }
                """;
        }
    }
}
