using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class GetMovieCollectionsHandlerTests
{
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    private GetMovieCollectionsHandler Build(string? apiKey = "key") =>
        new(_tmdb.Object, _cache, Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey }));

    private static TmdbCollectionSummary Summary(int id) =>
        new(id, $"Saga {id}", $"Resume {id}", $"/poster-{id}.jpg", 4);

    private void SetupAllCollections()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int id, CancellationToken _) => Summary(id));
    }

    [Fact]
    public async Task HandleAsync_MissingApiKey_ThrowsServiceUnavailable()
    {
        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build(apiKey: null).HandleAsync());
    }

    [Fact]
    public async Task HandleAsync_ReturnsEveryCatalogCollection()
    {
        SetupAllCollections();

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
        Assert.False(string.IsNullOrWhiteSpace(result.Disclaimer));
    }

    [Fact]
    public async Task HandleAsync_KeepsCatalogOrder()
    {
        SetupAllCollections();

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.ToList(), result.Items.Select(i => i.Id).ToList());
    }

    [Fact]
    public async Task HandleAsync_MapsSummaryFields()
    {
        SetupAllCollections();
        var expectedId = MovieShowcaseCatalog.CollectionIds[0];

        var first = (await Build().HandleAsync()).Items[0];

        Assert.Equal(expectedId, first.Id);
        Assert.Equal($"Saga {expectedId}", first.Name);
        Assert.Equal($"Resume {expectedId}", first.Overview);
        Assert.Equal($"/poster-{expectedId}.jpg", first.PosterPath);
        Assert.Equal(4, first.MovieCount);
    }

    [Fact]
    public async Task HandleAsync_SkipsCollectionsTmdbCannotServe()
    {
        var missing = MovieShowcaseCatalog.CollectionIds[1];
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int id, CancellationToken _) => id == missing ? null : Summary(id));

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count - 1, result.Items.Count);
        Assert.DoesNotContain(result.Items, i => i.Id == missing);
    }

    [Fact]
    public async Task HandleAsync_SwallowsHttpFailuresOnASingleCollection()
    {
        var failing = MovieShowcaseCatalog.CollectionIds[2];
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns((int id, CancellationToken _) => id == failing
                ? throw new HttpRequestException("tmdb indisponible")
                : Task.FromResult<TmdbCollectionSummary?>(Summary(id)));

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count - 1, result.Items.Count);
    }

    [Fact]
    public async Task HandleAsync_AllCollectionsUnavailable_ThrowsServiceUnavailable()
    {
        _tmdb.Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbCollectionSummary?)null);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build().HandleAsync());
    }

    [Fact]
    public async Task HandleAsync_SecondCallIsServedFromCache()
    {
        SetupAllCollections();
        var handler = Build();

        await handler.HandleAsync();
        await handler.HandleAsync();

        _tmdb.Verify(
            t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Exactly(MovieShowcaseCatalog.CollectionIds.Count));
    }

    [Fact]
    public async Task HandleAsync_CachedResultDoesNotNeedTheApiKey()
    {
        SetupAllCollections();
        await Build().HandleAsync();

        var result = await Build(apiKey: null).HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.CollectionIds.Count, result.Items.Count);
    }
}
