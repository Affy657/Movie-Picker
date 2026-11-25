using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class GetMovieCollectionsHandlerTests
{
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<ISharedCache> _shared = new();
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    private GetMovieCollectionsHandler Build(string? apiKey = "key") =>
        new(
            _tmdb.Object,
            new SharedCacheReadThrough(_cache, _shared.Object, new SingleFlight()),
            Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey }));

    private static TmdbCollectionSummary Summary(int id) =>
        new(
            id,
            $"Saga {id}",
            $"Resume {id}",
            $"/poster-{id}.jpg",
            5,
            [$"/part-1-{id}.jpg", $"/part-2-{id}.jpg", $"/part-3-{id}.jpg", $"/part-4-{id}.jpg", $"/part-5-{id}.jpg"],
            [(id * 10) + 1, (id * 10) + 2, (id * 10) + 3, (id * 10) + 4, (id * 10) + 5]);

    private void SetupAllCollections()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int id, CatalogLanguage _, CancellationToken _) => Summary(id));
    }

    [Fact]
    public async Task HandleAsync_MissingApiKey_ThrowsServiceUnavailable()
    {
        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build(apiKey: null).HandleAsync(CatalogLanguage.French));
    }

    [Fact]
    public async Task HandleAsync_LoadOutlivingItsBudget_AnswersServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .Returns(new TaskCompletionSource<TmdbCollectionSummary?>().Task);
        var handler = new GetMovieCollectionsHandler(
            _tmdb.Object,
            new SharedCacheReadThrough(_cache, _shared.Object, new SingleFlight(), TimeSpan.FromMilliseconds(100)),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
        using var patience = new CancellationTokenSource(TimeSpan.FromSeconds(3));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => handler.HandleAsync(CatalogLanguage.French).WaitAsync(patience.Token));
    }

    [Fact]
    public async Task HandleAsync_ReturnsEveryCatalogCollection()
    {
        SetupAllCollections();

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
        Assert.False(string.IsNullOrWhiteSpace(result.Disclaimer));
    }

    [Fact]
    public async Task HandleAsync_KeepsCatalogOrder()
    {
        SetupAllCollections();

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.ToList(), result.Items.Select(i => i.Id).ToList());
    }

    [Fact]
    public async Task HandleAsync_MapsSummaryFields()
    {
        SetupAllCollections();
        var expectedId = MovieShowcaseCatalog.CollectionIds[0];

        var first = (await Build().HandleAsync(CatalogLanguage.French)).Items[0];

        Assert.Equal(expectedId, first.Id);
        Assert.Equal($"Saga {expectedId}", first.Name);
        Assert.Equal($"Resume {expectedId}", first.Overview);
        Assert.Equal($"/poster-{expectedId}.jpg", first.PosterPath);
        Assert.Equal(5, first.MovieCount);
    }

    [Fact]
    public async Task HandleAsync_PreviewsTheFirstThreePostersOfEachSagaInItsOrder()
    {
        SetupAllCollections();
        var expectedId = MovieShowcaseCatalog.CollectionIds[0];

        var first = (await Build().HandleAsync(CatalogLanguage.French)).Items[0];

        Assert.Equal(
            [$"/part-1-{expectedId}.jpg", $"/part-2-{expectedId}.jpg", $"/part-3-{expectedId}.jpg"],
            first.PreviewPosterPaths);
    }

    [Fact]
    public async Task HandleAsync_ListsEveryFilmOfEachSagaInItsOrder()
    {
        SetupAllCollections();
        var expectedId = MovieShowcaseCatalog.CollectionIds[0];

        var first = (await Build().HandleAsync(CatalogLanguage.French)).Items[0];

        Assert.Equal(
            [(expectedId * 10) + 1, (expectedId * 10) + 2, (expectedId * 10) + 3, (expectedId * 10) + 4, (expectedId * 10) + 5],
            first.MovieIds);
    }

    [Fact]
    public async Task HandleAsync_SnapshotSharedBeforeTheFilmIdsExisted_IsNotServed()
    {
        SetupAllCollections();
        var legacySnapshot = new List<MovieCollectionResponse>
        {
            new() { Id = 1, Name = "Saga without film ids", MovieCount = 3, PreviewPosterPaths = ["/a.jpg"] },
        };
        _shared.Setup(c => c.TryGetAsync<IReadOnlyList<MovieCollectionResponse>>("showcase-collections-v2", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SharedCacheEntry<IReadOnlyList<MovieCollectionResponse>>(legacySnapshot, DateTimeOffset.UtcNow.AddHours(1)));

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
        Assert.All(result.Items, item => Assert.Equal(5, item.MovieIds.Count));
    }

    [Fact]
    public async Task HandleAsync_SagaWithFewerPostersThanThePreview_PreviewsThoseItHas()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int id, CatalogLanguage _, CancellationToken _) => new TmdbCollectionSummary(id, $"Saga {id}", null, null, 2, ["/only.jpg"], [1, 2]));

        var first = (await Build().HandleAsync(CatalogLanguage.French)).Items[0];

        Assert.Equal(["/only.jpg"], first.PreviewPosterPaths);
    }

    [Fact]
    public async Task HandleAsync_SnapshotSharedBeforeThePreviewsExisted_IsNotServed()
    {
        SetupAllCollections();
        var legacySnapshot = new List<MovieCollectionResponse> { new() { Id = 1, Name = "Saga without previews", MovieCount = 3 } };
        _shared.Setup(c => c.TryGetAsync<IReadOnlyList<MovieCollectionResponse>>("showcase-collections-v1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SharedCacheEntry<IReadOnlyList<MovieCollectionResponse>>(legacySnapshot, DateTimeOffset.UtcNow.AddHours(1)));

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
        Assert.All(result.Items, item => Assert.Equal(3, item.PreviewPosterPaths.Count));
    }

    [Fact]
    public async Task HandleAsync_SkipsCollectionsTmdbCannotServe()
    {
        var missing = MovieShowcaseCatalog.CollectionIds[1];
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int id, CatalogLanguage _, CancellationToken _) => id == missing ? null : Summary(id));

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count - 1, result.Items.Count);
        Assert.DoesNotContain(result.Items, i => i.Id == missing);
    }

    [Fact]
    public async Task HandleAsync_SwallowsHttpFailuresOnASingleCollection()
    {
        var failing = MovieShowcaseCatalog.CollectionIds[2];
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .Returns((int id, CatalogLanguage _, CancellationToken _) => id == failing
                ? throw new HttpRequestException("tmdb indisponible")
                : Task.FromResult<TmdbCollectionSummary?>(Summary(id)));

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count - 1, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_AllCollectionsUnavailable_ThrowsServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbCollectionSummary?)null);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build().HandleAsync(CatalogLanguage.French));
    }

    [Fact]
    public async Task HandleAsync_SecondCallIsServedFromCache()
    {
        SetupAllCollections();
        var handler = Build();

        await handler.HandleAsync(CatalogLanguage.French);
        await handler.HandleAsync(CatalogLanguage.French);

        _tmdb.Verify(
            t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()),
            Times.Exactly(MovieShowcaseCatalog.CollectionIds.Count));
    }

    [Fact]
    public async Task HandleAsync_CachedResultDoesNotNeedTheApiKey()
    {
        SetupAllCollections();
        await Build().HandleAsync(CatalogLanguage.French);

        var result = await Build(apiKey: null).HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_SharedCacheHit_SkipsTmdb()
    {
        var snapshot = new List<MovieCollectionResponse> { new() { Id = 1, Name = "Saga cache", MovieCount = 3 } };
        _shared.Setup(c => c.TryGetAsync<IReadOnlyList<MovieCollectionResponse>>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SharedCacheEntry<IReadOnlyList<MovieCollectionResponse>>(snapshot, DateTimeOffset.UtcNow.AddHours(1)));

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal("Saga cache", Assert.Single(result.Items).Name);
        _tmdb.Verify(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_OneCollectionFailedToLoad_ServesThePartialListWithoutSharingIt()
    {
        SetupAllCollections();
        var failingId = MovieShowcaseCatalog.CollectionIds[0];
        _tmdb.Setup(t => t.GetCollectionAsync(failingId, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB answered 429"));

        var first = await Build().HandleAsync(CatalogLanguage.French);
        await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count - 1, first.Items.Count);
        _shared.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<MovieCollectionResponse>>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
        _tmdb.Verify(t => t.GetCollectionAsync(failingId, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshAsync_EveryCollectionLoaded_ReplacesTheSnapshot()
    {
        SetupAllCollections();

        Assert.True(await Build().RefreshAsync(CatalogLanguage.French));
        _shared.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<MovieCollectionResponse>>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RefreshAsync_TmdbDown_KeepsTheOlderSnapshot()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));

        Assert.False(await Build().RefreshAsync(CatalogLanguage.French));
    }

    [Fact]
    public async Task HandleAsync_EachInterfaceLanguage_NamesTheSagasUnderItsOwnSharedKey()
    {
        var shared = new InMemorySharedCache();
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int id, CatalogLanguage language, CancellationToken _) =>
                Summary(id) with { Name = language == CatalogLanguage.English ? $"Saga {id} (en)" : $"Saga {id}" });
        var handler = new GetMovieCollectionsHandler(
            _tmdb.Object,
            new SharedCacheReadThrough(new MemoryCache(new MemoryCacheOptions()), shared, new SingleFlight()),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));

        var english = await handler.HandleAsync(CatalogLanguage.English);
        var french = await handler.HandleAsync(CatalogLanguage.French);

        Assert.All(english.Items, item => Assert.EndsWith("(en)", item.Name));
        Assert.All(french.Items, item => Assert.DoesNotContain("(en)", item.Name));
        Assert.NotNull(await shared.TryGetAsync<IReadOnlyList<MovieCollectionResponse>>("showcase-collections-v4:en-US"));
        Assert.NotNull(await shared.TryGetAsync<IReadOnlyList<MovieCollectionResponse>>("showcase-collections-v4:fr-FR"));
    }

    [Fact]
    public async Task HandleAsync_SnapshotSharedBeforeTheLanguagesExisted_IsNotServed()
    {
        SetupAllCollections();
        var legacySnapshot = new List<MovieCollectionResponse> { new() { Id = 1, Name = "Saga in one language", MovieCount = 3 } };
        _shared.Setup(c => c.TryGetAsync<IReadOnlyList<MovieCollectionResponse>>("showcase-collections-v3", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SharedCacheEntry<IReadOnlyList<MovieCollectionResponse>>(legacySnapshot, DateTimeOffset.UtcNow.AddHours(1)));

        var result = await Build().HandleAsync(CatalogLanguage.French);

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
    }
}
