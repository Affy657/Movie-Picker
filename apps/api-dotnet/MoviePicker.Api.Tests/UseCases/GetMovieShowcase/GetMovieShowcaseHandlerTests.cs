using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class GetMovieShowcaseHandlerTests
{
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<ISharedCache> _shared = new();
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    public GetMovieShowcaseHandlerTests() => GivenEnrichment(new TmdbMovieEnrichment(7.5, [], null, 120));

    private void GivenEnrichment(TmdbMovieEnrichment? enrichment) =>
        _tmdb.Setup(t => t.GetEnrichmentAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(enrichment);

    private static readonly MoviePickerOptions DefaultOptions = new();

    private GetMovieShowcaseHandler Build(string? apiKey = "key") =>
        new(
            _tmdb.Object,
            _movies.Object,
            new SharedCacheReadThrough(_cache, _shared.Object, new SingleFlight()),
            Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey }));

    private GetMovieShowcaseHandler BuildAnotherInstanceOn(ISharedCache shared) =>
        new(
            _tmdb.Object,
            _movies.Object,
            new SharedCacheReadThrough(new MemoryCache(new MemoryCacheOptions()), shared, new SingleFlight()),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

    private void VerifyDiscoveries(Times times) =>
        _tmdb.Verify(
            t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            times);

    private void VerifySharedWrites(Times times) =>
        _shared.Verify(
            c => c.SetAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<MovieShowcaseItemResponse>>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()),
            times);

    private static List<TmdbSearchItem> Items(int count, int idBase = 1) =>
        Enumerable.Range(0, count)
            .Select(i => new TmdbSearchItem(idBase + i, MovieMediaType.Movie, $"Film {i}", "2024", null, 7.5))
            .ToList();

    private static List<ProposedMovieRanking> Ranking(int count) =>
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
    public async Task HandleAsync_TmdbAnswersUnreadableBody_ThrowsServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new System.Text.Json.JsonException("not json"));

        await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending)));
    }

    [Fact]
    public async Task HandleAsync_LoadOutlivingItsBudget_AnswersServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns(new TaskCompletionSource<IReadOnlyList<TmdbSearchItem>>().Task);
        var handler = new GetMovieShowcaseHandler(
            _tmdb.Object,
            _movies.Object,
            new SharedCacheReadThrough(_cache, _shared.Object, new SingleFlight(), TimeSpan.FromMilliseconds(100)),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
        using var patience = new CancellationTokenSource(TimeSpan.FromSeconds(3));

        await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending)).WaitAsync(patience.Token));
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
                DefaultOptions.MostProposedMinEventCount,
                MovieShowcaseCatalog.MostProposedLimit,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(DefaultOptions.MostProposedMinDistinctMovies - 1));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_MostProposedAboveThreshold_RanksFromOne()
    {
        _movies.Setup(r => r.ListMostProposedAsync(
                DefaultOptions.MostProposedMinEventCount,
                MovieShowcaseCatalog.MostProposedLimit,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(DefaultOptions.MostProposedMinDistinctMovies));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.Equal(DefaultOptions.MostProposedMinDistinctMovies, result.Items.Count);
        Assert.Equal(1, result.Items[0].Rank);
        Assert.Equal(2, result.Items[1].Rank);
        Assert.NotNull(result.Items[0].EventCount);
    }

    [Fact]
    public async Task HandleAsync_MostProposed_HonoursLowerFloorsFromOptions()
    {
        _movies.Setup(r => r.ListMostProposedAsync(1, MovieShowcaseCatalog.MostProposedLimit, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(3));
        var handler = new GetMovieShowcaseHandler(
            _tmdb.Object,
            _movies.Object,
            new SharedCacheReadThrough(_cache, _shared.Object, new SingleFlight()),
            Options.Create(new MoviePickerOptions
            {
                TmdbApiKey = "key",
                MostProposedMinEventCount = 1,
                MostProposedMinDistinctMovies = 1,
            }));

        var result = await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.Equal(3, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_MostProposed_DoesNotServeARankingCachedUnderOtherFloors()
    {
        var shared = new InMemorySharedCache();
        _movies.Setup(r => r.ListMostProposedAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(3));
        GetMovieShowcaseHandler On(MoviePickerOptions options) =>
            new(
                _tmdb.Object,
                _movies.Object,
                new SharedCacheReadThrough(new MemoryCache(new MemoryCacheOptions()), shared, new SingleFlight()),
                Options.Create(options));

        var strict = await On(new MoviePickerOptions { TmdbApiKey = "key" })
            .HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));
        var lenient = await On(new MoviePickerOptions
        {
            TmdbApiKey = "key",
            MostProposedMinEventCount = 1,
            MostProposedMinDistinctMovies = 1,
        })
            .HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.MostProposed));

        Assert.Empty(strict.Items);
        Assert.Equal(3, lenient.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_MostProposedWithoutApiKey_StillWorks()
    {
        _movies.Setup(r => r.ListMostProposedAsync(
                It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(DefaultOptions.MostProposedMinDistinctMovies));

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
        _tmdb.Setup(t => t.GetRecommendationsAsync(27_205, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(12));

        var result = await Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Recommendations, SeedTmdbId: 27_205));

        Assert.Equal(12, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_RecommendationsForASeries_AsksForSeriesLikeIt()
    {
        _tmdb.Setup(t => t.GetRecommendationsAsync(1_399, MovieMediaType.Tv, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(4));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(
            MovieShowcaseSections.Recommendations, SeedTmdbId: 1_399, SeedMediaType: MovieMediaType.Tv));

        Assert.Equal(4, result.Items.Count);
        _tmdb.Verify(
            t => t.GetRecommendationsAsync(It.IsAny<int>(), MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_FilmAndSeriesSeedsSharingAnId_DoNotShareAnEntry()
    {
        _tmdb.Setup(t => t.GetRecommendationsAsync(1_399, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));
        var handler = Build();

        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Recommendations, SeedTmdbId: 1_399));
        await handler.HandleAsync(new MovieShowcaseQuery(
            MovieShowcaseSections.Recommendations, SeedTmdbId: 1_399, SeedMediaType: MovieMediaType.Tv));

        _tmdb.Verify(
            t => t.GetRecommendationsAsync(1_399, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
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

    [Fact]
    public async Task HandleAsync_SharedCacheHit_SkipsTmdbEntirely()
    {
        var snapshot = new List<MovieShowcaseItemResponse>
        {
            new() { Id = 7, MediaType = MovieMediaType.Movie, Title = "Depuis le cache", Year = "2020" }
        };
        _shared.Setup(c => c.TryGetAsync<IReadOnlyList<MovieShowcaseItemResponse>>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SharedCacheEntry<IReadOnlyList<MovieShowcaseItemResponse>>(snapshot, DateTimeOffset.UtcNow.AddHours(1)));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        Assert.Equal("Depuis le cache", Assert.Single(result.Items).Title);
        _tmdb.Verify(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SharedCacheMiss_PublishesTheLoadedSection()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(3));

        await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        _shared.Verify(
            c => c.SetAsync(
                It.IsAny<string>(),
                It.Is<IReadOnlyList<MovieShowcaseItemResponse>>(items => items.Count == 3),
                TimeSpan.FromHours(6),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ConcurrentRequestsOnTheSameSection_HitTmdbOnce()
    {
        var gate = new TaskCompletionSource<IReadOnlyList<TmdbSearchItem>>();
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, It.IsAny<CancellationToken>()))
            .Returns(gate.Task);
        var handler = Build();
        var query = new MovieShowcaseQuery(MovieShowcaseSections.Trending);

        var first = handler.HandleAsync(query);
        var second = handler.HandleAsync(query);
        gate.SetResult(Items(2));

        Assert.Equal(2, (await first).Items.Count);
        Assert.Equal(2, (await second).Items.Count);
        _tmdb.Verify(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(MovieShowcaseSections.Recommendations)]
    [InlineData(MovieShowcaseSections.Collection)]
    [InlineData(MovieShowcaseSections.Director)]
    public async Task HandleAsync_SectionKeyedOnAnArbitraryId_StaysOutOfTheSharedCache(string section)
    {
        _tmdb.Setup(t => t.GetRecommendationsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));
        _tmdb.Setup(t => t.GetCollectionMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));
        _tmdb.Setup(t => t.GetDirectedMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(
            section, CollectionId: MovieShowcaseCatalog.CollectionIds[0], SeedTmdbId: 4242, PersonId: 525));

        Assert.Equal(2, result.Items.Count);

        _shared.Verify(
            c => c.TryGetAsync<IReadOnlyList<MovieShowcaseItemResponse>>(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _shared.Verify(
            c => c.SetAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<MovieShowcaseItemResponse>>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TrendingWithSeveralGenres_StaysOutOfTheSharedCache()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));

        await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: [28, 12]));

        _shared.Verify(
            c => c.SetAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<MovieShowcaseItemResponse>>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TrendingWithOneGenre_IsSharedAcrossInstances()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));

        await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: [28]));

        _shared.Verify(
            c => c.SetAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<MovieShowcaseItemResponse>>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ParametersTheSectionIgnores_ReuseOneEntry()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(3));
        var handler = Build();

        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, SeedTmdbId: 42));
        var crafted = await handler.HandleAsync(new MovieShowcaseQuery(
            MovieShowcaseSections.Trending, Theme: "nawak", CollectionId: 7, Provider: "nawak", SeedTmdbId: 43));

        _tmdb.Verify(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
        VerifySharedWrites(Times.Once());
        Assert.Equal(3, crafted.Items.Count);
        Assert.Null(crafted.Theme);
    }

    [Theory]
    [InlineData(MovieShowcaseSections.NowPlaying)]
    [InlineData(MovieShowcaseSections.MostProposed)]
    public async Task HandleAsync_GenresOnASectionWithoutGenres_ReuseTheSectionEntry(string section)
    {
        _tmdb.Setup(t => t.GetNowPlayingMoviesAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(3));
        _movies.Setup(r => r.ListMostProposedAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Ranking(DefaultOptions.MostProposedMinDistinctMovies));
        var handler = Build();

        await handler.HandleAsync(new MovieShowcaseQuery(section));
        await handler.HandleAsync(new MovieShowcaseQuery(section, GenreIds: [28]));
        await handler.HandleAsync(new MovieShowcaseQuery(section, GenreIds: [28, 35]));

        VerifySharedWrites(Times.Once());
    }

    [Theory]
    [InlineData(MovieShowcaseSections.Theme, "frissons", "FRISSONS")]
    [InlineData(MovieShowcaseSections.Theme, "frissons", " Frissons ")]
    [InlineData(MovieShowcaseSections.Provider, "netflix", "NetFlix")]
    public async Task HandleAsync_CatalogKeyWrittenDifferently_ReadsTheSnapshotTheWarmPassWrote(
        string section,
        string catalogKey,
        string variant)
    {
        var shared = new InMemorySharedCache();
        _tmdb.Setup(t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(3));
        Assert.True(await BuildAnotherInstanceOn(shared).RefreshAsync(CatalogQuery(section, catalogKey)));

        var result = await BuildAnotherInstanceOn(shared).HandleAsync(CatalogQuery(section, variant) with { GenreIds = [28] });

        VerifyDiscoveries(Times.Once());
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(section == MovieShowcaseSections.Theme ? catalogKey : null, result.Theme);
    }

    private static MovieShowcaseQuery CatalogQuery(string section, string key) =>
        section == MovieShowcaseSections.Theme
            ? new MovieShowcaseQuery(section, Theme: key)
            : new MovieShowcaseQuery(section, Provider: key);

    [Theory]
    [InlineData(987_654)]
    [InlineData(28, 987_654)]
    public async Task HandleAsync_TrendingOnAGenreTmdbDoesNotHave_IsRejectedBeforeReachingTmdb(params int[] genreIds)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: genreIds)));

        Assert.Equal(ErrorCodes.UnknownGenre, ex.Reason);
        _tmdb.Verify(
            t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
        VerifySharedWrites(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_CollectionOutOfTheCatalog_IsReadFromTmdb()
    {
        _tmdb.Setup(t => t.GetCollectionMoviesAsync(4242, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(3));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Collection, CollectionId: 4242));

        Assert.Equal(3, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_CollectionBeyondAnyTmdbIdentifier_IsRejectedBeforeReachingTmdb()
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Collection, CollectionId: 2_000_000_000)));

        Assert.Equal(ErrorCodes.UnknownCollection, ex.Reason);
        _tmdb.Verify(t => t.GetCollectionMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SeedBeyondAnyTmdbIdentifier_IsRejectedBeforeReachingTmdb()
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Build().HandleAsync(new MovieShowcaseQuery(
            MovieShowcaseSections.Recommendations, SeedTmdbId: MovieShowcaseCatalog.MaxSeedTmdbId + 1)));

        Assert.Equal(ErrorCodes.ReferenceMovieMissing, ex.Reason);
        _tmdb.Verify(
            t => t.GetRecommendationsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Director_ListsTheFilmsOfThatPerson()
    {
        _tmdb.Setup(t => t.GetDirectedMoviesAsync(525, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(7, idBase: 27_205));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Director, PersonId: 525));

        Assert.Equal(MovieShowcaseSections.Director, result.Section);
        Assert.Equal(7, result.Items.Count);
        Assert.Equal(27_205, result.Items[0].Id);
        Assert.All(result.Items, item => Assert.Equal(MovieMediaType.Movie, item.MediaType));
        Assert.Equal(120, result.Items[0].RuntimeMinutes);
    }

    [Fact]
    public async Task HandleAsync_TwoDirectors_DoNotShareAnEntry()
    {
        _tmdb.Setup(t => t.GetDirectedMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int personId, CancellationToken _) => Items(1, idBase: personId));
        var handler = Build();

        var first = await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Director, PersonId: 525));
        var second = await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Director, PersonId: 1_032));
        var again = await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Director, PersonId: 525));

        Assert.Equal(525, first.Items[0].Id);
        Assert.Equal(1_032, second.Items[0].Id);
        Assert.Equal(525, again.Items[0].Id);
        _tmdb.Verify(t => t.GetDirectedMoviesAsync(525, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DirectorTmdbDown_ThrowsServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetDirectedMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("tmdb down"));

        await Assert.ThrowsAsync<ServiceUnavailableException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Director, PersonId: 525)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(-3)]
    [InlineData(MovieShowcaseCatalog.MaxSeedTmdbId + 1)]
    public async Task HandleAsync_DirectorWithoutAPerson_IsRejectedBeforeReachingTmdb(int? personId)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Build().HandleAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Director, SeedTmdbId: 27_205, PersonId: personId)));

        Assert.Equal(ErrorCodes.ReferenceMovieMissing, ex.Reason);
        _tmdb.Verify(t => t.GetDirectedMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_APersonOnAnotherSection_ReusesTheSectionEntry()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(3));
        var handler = Build();

        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));
        await handler.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending, PersonId: 525));

        _tmdb.Verify(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
        _tmdb.Verify(t => t.GetDirectedMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SeedAtTheEdgeOfTheRange_IsStillServed()
    {
        _tmdb.Setup(t => t.GetRecommendationsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));

        var result = await Build().HandleAsync(new MovieShowcaseQuery(
            MovieShowcaseSections.Recommendations, SeedTmdbId: MovieShowcaseCatalog.MaxSeedTmdbId));

        Assert.Equal(2, result.Items.Count);
    }

    [Fact]
    public void TheGenresOfferedByTheHome_AreAllInTheCatalog()
    {
        int[] trendingGenreTabs = [28, 35, 53, 18, 27, 16];

        Assert.All(trendingGenreTabs, id => Assert.True(MovieShowcaseCatalog.IsTmdbMovieGenre(id)));
    }

    [Fact]
    public async Task RefreshAsync_TmdbThrottlingTheEnrichments_KeepsTheCompleteSnapshot()
    {
        var shared = new InMemorySharedCache();
        var trending = new MovieShowcaseQuery(MovieShowcaseSections.Trending);
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(Items(3));
        Assert.True(await BuildAnotherInstanceOn(shared).RefreshAsync(trending));
        GivenEnrichment(null);

        var refreshed = await BuildAnotherInstanceOn(shared).RefreshAsync(trending);

        Assert.False(refreshed);
        var served = await BuildAnotherInstanceOn(shared).HandleAsync(trending);
        Assert.All(served.Items, item => Assert.Equal(120, item.RuntimeMinutes));
    }

    [Fact]
    public async Task RefreshAsync_ASingleEnrichmentMissing_DoesNotPublishTheSection()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(Items(3));
        _tmdb.Setup(t => t.GetEnrichmentAsync(2, MovieMediaType.Movie, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieEnrichment?)null);

        var refreshed = await Build().RefreshAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        Assert.False(refreshed);
        VerifySharedWrites(Times.Never());
    }

    [Fact]
    public async Task RefreshAsync_TitleTmdbKnowsWithoutARuntime_IsComplete()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(Items(3));
        GivenEnrichment(new TmdbMovieEnrichment(null, [], null, null));

        var refreshed = await Build().RefreshAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        Assert.True(refreshed);
        VerifySharedWrites(Times.Once());
    }

    [Fact]
    public async Task HandleAsync_TmdbThrottlingTheEnrichments_ServesTheListWithoutPublishingIt()
    {
        _tmdb.Setup(t => t.GetTrendingMoviesAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(Items(3));
        GivenEnrichment(null);

        var result = await Build().HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Trending));

        Assert.Equal(3, result.Items.Count);
        VerifySharedWrites(Times.Never());
    }

    [Fact]
    public async Task RefreshAsync_TrendingOnAGenreTmdbDoesNotHave_IsNotPublished()
    {
        _tmdb.Setup(t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Items(2));

        var refreshed = await Build().RefreshAsync(
            new MovieShowcaseQuery(MovieShowcaseSections.Trending, GenreIds: [987_654]));

        Assert.False(refreshed);
        VerifySharedWrites(Times.Never());
    }

    [Theory]
    [InlineData(MovieShowcaseSections.Theme, "nawak", null, null, null)]
    [InlineData(MovieShowcaseSections.Provider, null, "nawak", null, null)]
    [InlineData(MovieShowcaseSections.Recommendations, null, null, null, null)]
    [InlineData(MovieShowcaseSections.Collection, null, null, null, null)]
    public async Task HandleAsync_InvalidQuery_IsRejectedBeforeAnyCacheLookup(
        string section,
        string? theme,
        string? provider,
        int? collectionId,
        int? seedTmdbId)
    {
        await Assert.ThrowsAsync<BadRequestException>(
            () => Build().HandleAsync(new MovieShowcaseQuery(section, theme, null, collectionId, provider, seedTmdbId)));

        _shared.Verify(
            c => c.TryGetAsync<IReadOnlyList<MovieShowcaseItemResponse>>(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
