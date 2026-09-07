using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class GetMovieShowcaseHandlerTests
{
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    private GetMovieShowcaseHandler Build(string? apiKey = "key") =>
        new(
            _tmdb.Object,
            _movies.Object,
            _cache,
            Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey }));

    private static IReadOnlyList<TmdbSearchItem> Items(int count, int idBase = 1) =>
        Enumerable.Range(0, count)
            .Select(i => new TmdbSearchItem(idBase + i, MovieMediaType.Movie, $"Film {i}", "2024", null, 7.5))
            .ToList();

    private static IReadOnlyList<ProposedMovieRanking> Ranking(int count) =>
        Enumerable.Range(0, count)
            .Select(i => new ProposedMovieRanking(
                1_000 + i, MovieMediaType.Movie, $"Film {i}", "2024", null, [18], count - i + 1))
            .ToList();

    [Fact]
    public async Task HandleAsync_UnknownSection_Throws()
    {
        await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery("inconnue")));
    }

    [Fact]
    public async Task HandleAsync_TrendingWithoutGenre_UsesTrendingEndpoint()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(100));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        Assert.Equal(100, result.Items.Count);
        Assert.Equal(MovieShowcaseSections.Trending, result.Section);
        _tmdb.Verify(
            t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TrendingWithGenre_DiscoversOnThatGenre()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.Is<TmdbDiscoveryCriteria>(c => c.GenreIds != null && c.GenreIds.Contains(35)),
                MovieShowcaseCatalog.PagesPerSection,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(40));

        var result = await Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: [35]));

        Assert.Equal(40, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_UnknownTheme_Throws()
    {
        await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Theme, "nawak")));
    }

    [Theory]
    [InlineData("frissons")]
    [InlineData("comedies-francaises")]
    [InlineData("annees-80")]
    [InlineData("braquages")]
    [InlineData("pepites-a24")]
    public async Task HandleAsync_KnownTheme_Discovers(string theme)
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.IsAny<TmdbDiscoveryCriteria>(), MovieShowcaseCatalog.PagesPerSection, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(60));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Theme, theme));

        Assert.Equal(60, result.Items.Count);
        Assert.Equal(theme, result.Theme);
    }

    [Fact]
    public async Task HandleAsync_CollectionWithoutId_Throws()
    {
        await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Collection)));
    }

    [Fact]
    public async Task HandleAsync_MissingApiKey_ThrowsServiceUnavailable()
    {
        await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => Build(apiKey: null).HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending)));
    }

    [Fact]
    public async Task HandleAsync_TmdbDown_ThrowsServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("tmdb down"));

        await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending)));
    }

    [Fact]
    public async Task HandleAsync_SecondCall_ServedFromCache()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(20));

        var handler = Build();
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        _tmdb.Verify(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DifferentGenres_UseDistinctCacheEntries()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(20));

        var handler = Build();
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: [35]));
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: [18]));

        _tmdb.Verify(
            t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task HandleAsync_MostProposedBelowThreshold_ReturnsEmpty()
    {
        _movies.Setup(r => r.ListMostProposedAsync(
                MovieShowcaseCatalog.MostProposedMinEventCount,
                MovieShowcaseCatalog.MostProposedLimit,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(MovieShowcaseCatalog.MostProposedMinDistinctMovies - 1));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_MostProposedAboveThreshold_RanksFromOne()
    {
        _movies.Setup(r => r.ListMostProposedAsync(
                MovieShowcaseCatalog.MostProposedMinEventCount,
                MovieShowcaseCatalog.MostProposedLimit,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(MovieShowcaseCatalog.MostProposedMinDistinctMovies));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.Equal(MovieShowcaseCatalog.MostProposedMinDistinctMovies, result.Items.Count);
        Assert.Equal(1, result.Items[0].Rank);
        Assert.Equal(2, result.Items[1].Rank);
        Assert.NotNull(result.Items[0].EventCount);
    }

    [Fact]
    public async Task HandleAsync_MostProposedWithoutApiKey_StillWorks()
    {
        _movies.Setup(r => r.ListMostProposedAsync(
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(MovieShowcaseCatalog.MostProposedMinDistinctMovies));

        var result = await Build(apiKey: null).HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.NotEmpty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_Provider_DiscoversOnWatchProviderAndRegion()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.Is<TmdbDiscoveryCriteria>(c =>
                    c.WatchProviderIds != null
                    && c.WatchProviderIds.Contains(8)
                    && c.WatchRegion == "FR"),
                MovieShowcaseCatalog.PagesPerSection,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(30));

        var result = await Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Provider, Provider: "netflix"));

        Assert.Equal(30, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_UnknownProvider_Throws()
    {
        await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(
                new MovieShowcaseQuery(MovieShowcaseSections.Provider, Provider: "nawak")));
    }

    [Fact]
    public async Task HandleAsync_Recommendations_UsesSeedMovie()
    {
        _tmdb.Setup(t => t.GetRecommendationsAsync(27_205, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(12));

        var result = await Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Recommendations, SeedTmdbId: 27_205));

        Assert.Equal(12, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_RecommendationsWithoutSeed_Throws()
    {
        await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Recommendations)));
    }

    [Theory]
    [InlineData("moins-de-90-min")]
    [InlineData("indetronables")]
    [InlineData("annees-90")]
    [InlineData("annees-2000")]
    [InlineData("en-famille")]
    public async Task HandleAsync_NewThemes_AreKnown(string theme)
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.IsAny<TmdbDiscoveryCriteria>(),
                MovieShowcaseCatalog.PagesPerSection,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(20));

        var result = await Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Theme, Theme: theme));

        Assert.Equal(20, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_ShortFilmsTheme_CapsRuntime()
    {
        TmdbDiscoveryCriteria? seen = null;
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.IsAny<TmdbDiscoveryCriteria>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .Callback<TmdbDiscoveryCriteria, int, CancellationToken>((c, _, _) => seen = c)
            .ReturnsAsync(Items(5));

        await Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Theme, Theme: "moins-de-90-min"));

        Assert.Equal(90, seen?.RuntimeMax);
    }

    [Fact]
    public async Task HandleAsync_ProviderAndTheme_DoNotShareACacheEntry()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(
                It.IsAny<TmdbDiscoveryCriteria>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(7));

        var handler = Build();
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Provider, Provider: "netflix"));
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Provider, Provider: "disney-plus"));

        _tmdb.Verify(
            t => t.DiscoverMoviesAsync(
                It.IsAny<TmdbDiscoveryCriteria>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }
}
