using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SearchMovies;

public sealed class SearchMoviesHandlerTests
{
    private const string SeriesEventSlug = "soiree-series";

    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IEventRepository> _events = new();

    public SearchMoviesHandlerTests()
    {
        _events
            .Setup(r => r.GetByIdOrSlugAsync(SeriesEventSlug, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event { Slug = SeriesEventSlug, Config = new EventConfig { AllowSeries = true } });
    }

    private SearchMoviesHandler Build(MoviePickerOptions? options = null) =>
        new(_tmdb.Object, _events.Object, Options.Create(options ?? new MoviePickerOptions { TmdbApiKey = "key" }));

    [Fact]
    public async Task HandleAsync_NoApiKey_ThrowsServiceUnavailable()
    {
        var sut = Build(new MoviePickerOptions { TmdbApiKey = null });

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => sut.HandleAsync("inception", SeriesEventSlug));
    }

    [Fact]
    public async Task HandleAsync_TmdbHttpFailure_ThrowsServiceUnavailable()
    {
        _tmdb.Setup(t => t.SearchAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));
        var sut = Build();

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => sut.HandleAsync("inception", SeriesEventSlug));
    }

    [Fact]
    public async Task HandleAsync_WithoutEnrichment_MapsRowsAndDefaults()
    {
        _tmdb.Setup(t => t.SearchAsync("inception", true, It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new TmdbSearchItem(1, MovieMediaType.Movie, "Inception", "2010", "/p.jpg", 8.4)]);
        var sut = Build(new MoviePickerOptions { TmdbApiKey = "key", TmdbSearchMaxWatchProviderLookups = 0 });

        var result = await sut.HandleAsync("inception", SeriesEventSlug);

        var item = Assert.Single(result.Items);
        Assert.Equal(1, item.Id);
        Assert.Equal("Inception", item.Title);
        Assert.Equal(8.4, item.VoteAverage);
        Assert.Null(item.RuntimeMinutes);
        Assert.Empty(item.WatchProviders);
        Assert.Empty(item.GenreIds);
        Assert.Equal("FR", result.WatchProvidersRegion);
        Assert.False(string.IsNullOrEmpty(result.Disclaimer));
        _tmdb.Verify(t => t.GetEnrichmentAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_MapsGenreIdsFromTmdbRow()
    {
        _tmdb.Setup(t => t.SearchAsync("inception", true, It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new TmdbSearchItem(1, MovieMediaType.Movie, "Inception", "2010", "/p.jpg", 8.4, GenreIds: [28, 878]),
            ]);
        var sut = Build(new MoviePickerOptions { TmdbApiKey = "key", TmdbSearchMaxWatchProviderLookups = 0 });

        var result = await sut.HandleAsync("inception", SeriesEventSlug);

        var item = Assert.Single(result.Items);
        Assert.Equal([28, 878], item.GenreIds);
    }

    [Fact]
    public async Task HandleAsync_WithEnrichment_FillsProvidersRuntimeAndVoteFallback()
    {
        _tmdb.Setup(t => t.SearchAsync("inception", true, It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new TmdbSearchItem(1, MovieMediaType.Movie, "Inception", "2010", "/p.jpg", VoteAverage: null)]);
        _tmdb.Setup(t => t.GetEnrichmentAsync(1, MovieMediaType.Movie, "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieEnrichment(
                7.9,
                [new TmdbWatchProviderOffer(8, "Netflix", "/logo.png", "flatrate")],
                "https://tmdb/watch",
                148));
        var sut = Build();

        var result = await sut.HandleAsync("inception", SeriesEventSlug);

        var item = Assert.Single(result.Items);
        Assert.Equal(7.9, item.VoteAverage);
        Assert.Equal(148, item.RuntimeMinutes);
        Assert.Equal("https://tmdb/watch", item.TmdbWatchPageUrl);
        var provider = Assert.Single(item.WatchProviders);
        Assert.Equal("Netflix", provider.Name);
        Assert.Equal("flatrate", provider.Type);
    }

    [Fact]
    public async Task HandleAsync_TextQueryWithRuntimeFilter_EnrichesAllRowsAndDropsOutOfRange()
    {
        _tmdb.Setup(t => t.SearchAsync("inception", true, It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                90, 120, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new TmdbSearchItem(1, MovieMediaType.Movie, "InRange", "2010", "/p.jpg"),
                new TmdbSearchItem(2, MovieMediaType.Movie, "TooShort", "2011", "/p.jpg"),
                new TmdbSearchItem(3, MovieMediaType.Movie, "Unknown", "2012", "/p.jpg"),
            ]);
        _tmdb.Setup(t => t.GetEnrichmentAsync(1, MovieMediaType.Movie, "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieEnrichment(null, [], null, 100));
        _tmdb.Setup(t => t.GetEnrichmentAsync(2, MovieMediaType.Movie, "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieEnrichment(null, [], null, 45));
        _tmdb.Setup(t => t.GetEnrichmentAsync(3, MovieMediaType.Movie, "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieEnrichment?)null);
        var sut = Build(new MoviePickerOptions { TmdbApiKey = "key", TmdbSearchMaxWatchProviderLookups = 0 });
        var filters = new MovieSearchFilters(Array.Empty<int>(), null, null, RuntimeMin: 90, RuntimeMax: 120);

        var result = await sut.HandleAsync("inception", SeriesEventSlug, filters);

        var item = Assert.Single(result.Items);
        Assert.Equal(1, item.Id);
        Assert.Equal(100, item.RuntimeMinutes);
        _tmdb.Verify(t => t.GetEnrichmentAsync(3, MovieMediaType.Movie, "FR", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NormalizesRegionFromOptions()
    {
        _tmdb.Setup(t => t.SearchAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        var sut = Build(new MoviePickerOptions { TmdbApiKey = "key", TmdbWatchProvidersRegion = " us " });

        var result = await sut.HandleAsync("x", null);

        Assert.Equal("US", result.WatchProvidersRegion);
    }

    [Fact]
    public async Task HandleAsync_UnknownEventSlug_SearchesMoviesOnly()
    {
        _tmdb.Setup(t => t.SearchAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        var sut = Build();

        await sut.HandleAsync("inception", "slug-inconnu");

        _tmdb.Verify(
            t => t.SearchAsync("inception", false, It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_EventAllowingSeries_SearchesMoviesAndSeries()
    {
        _tmdb.Setup(t => t.SearchAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        var sut = Build();

        await sut.HandleAsync("inception", SeriesEventSlug);

        _tmdb.Verify(
            t => t.SearchAsync("inception", true, It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
