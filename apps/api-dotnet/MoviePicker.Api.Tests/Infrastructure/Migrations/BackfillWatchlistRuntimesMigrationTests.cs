using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillWatchlistRuntimesMigrationTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly BackfillWatchlistRuntimesMigration _sut;

    public BackfillWatchlistRuntimesMigrationTests()
    {
        GivenItemsMissingRuntime();

        _sut = new BackfillWatchlistRuntimesMigration(
            _watchlist.Object,
            _tmdb.Object,
            NullLogger<BackfillWatchlistRuntimesMigration>.Instance);
    }

    private static WatchlistItem ItemWithoutRuntime(string id, int tmdbId) =>
        new() { Id = id, TmdbId = tmdbId, MediaType = MovieMediaType.Movie, RuntimeMinutes = null };

    private static TmdbMovieDetails Details(int? runtime) =>
        new(1, "Titre", null, null, null, [], runtime, [], [], null);

    private void GivenItemsMissingRuntime(params WatchlistItem[] items)
    {
        var queue = new Queue<IReadOnlyList<WatchlistItem>>([items, []]);
        _watchlist.Setup(r => r.ListMissingRuntimeAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => queue.Count > 0 ? queue.Dequeue() : []);
    }

    private void GivenTmdbDetails(int tmdbId, TmdbMovieDetails? details) =>
        _tmdb.Setup(t => t.GetDetailsAsync(tmdbId, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);

    [Fact]
    public void Id_IsStableAndDated()
    {
        Assert.Equal("2026-09-05-003-backfill-watchlist-runtimes", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_WritesTheRuntimeReturnedByTmdb()
    {
        GivenItemsMissingRuntime(ItemWithoutRuntime("w1", 11));
        GivenTmdbDetails(11, Details(118));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _watchlist.Verify(r => r.UpdateRuntimeAsync("w1", 118, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_UnknownRuntime_MarksZeroWithoutCountingIt()
    {
        GivenItemsMissingRuntime(ItemWithoutRuntime("w1", 11));
        GivenTmdbDetails(11, Details(null));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(r => r.UpdateRuntimeAsync("w1", 0, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NegativeRuntime_IsClampedToZero()
    {
        GivenItemsMissingRuntime(ItemWithoutRuntime("w1", 11));
        GivenTmdbDetails(11, Details(-42));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(r => r.UpdateRuntimeAsync("w1", 0, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbReturnsNothing_LeavesTheDocumentUntouched()
    {
        GivenItemsMissingRuntime(ItemWithoutRuntime("w1", 11));
        GivenTmdbDetails(11, null);

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(
            r => r.UpdateRuntimeAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbFailsOnOneItem_KeepsGoingWithTheNextOnes()
    {
        GivenItemsMissingRuntime(
            ItemWithoutRuntime("w1", 11),
            ItemWithoutRuntime("w2", 22),
            ItemWithoutRuntime("w3", 33));
        GivenTmdbDetails(11, Details(90));
        _tmdb.Setup(t => t.GetDetailsAsync(22, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB indisponible"));
        GivenTmdbDetails(33, Details(120));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(2, updated);
        _watchlist.Verify(r => r.UpdateRuntimeAsync("w3", 120, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NothingToBackfill_WritesNothing()
    {
        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(
            r => r.UpdateRuntimeAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_RepositoryKeepsReturningTheSamePage_StopsInsteadOfLooping()
    {
        var page = new List<WatchlistItem> { ItemWithoutRuntime("w1", 11) };
        _watchlist.Setup(r => r.ListMissingRuntimeAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(page);
        GivenTmdbDetails(11, Details(100));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _watchlist.Verify(r => r.UpdateRuntimeAsync("w1", 100, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_UsesTheMediaTypeOfEachItem()
    {
        GivenItemsMissingRuntime(ItemWithoutRuntime("w1", 11) with { MediaType = MovieMediaType.Tv });
        GivenTmdbDetails(11, Details(45));

        await _sut.ExecuteAsync();

        _tmdb.Verify(t => t.GetDetailsAsync(11, MovieMediaType.Tv, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_Cancelled_Throws()
    {
        GivenItemsMissingRuntime(ItemWithoutRuntime("w1", 11));
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _sut.ExecuteAsync(cts.Token));
    }
}
