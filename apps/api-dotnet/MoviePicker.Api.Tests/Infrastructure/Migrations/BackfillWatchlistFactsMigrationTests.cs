using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillWatchlistFactsMigrationTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly BackfillWatchlistFactsMigration _sut;

    public BackfillWatchlistFactsMigrationTests()
    {
        GivenItemsMissingFacts();

        _sut = new BackfillWatchlistFactsMigration(
            _watchlist.Object,
            _tmdb.Object,
            NullLogger<BackfillWatchlistFactsMigration>.Instance);
    }

    private static WatchlistItem ItemWithoutFacts(string id, int tmdbId) =>
        new() { Id = id, TmdbId = tmdbId, MediaType = MovieMediaType.Movie, RuntimeMinutes = null, VoteAverage = null };

    private static TmdbMovieDetails Details(int? runtime, double? voteAverage = 7.2) =>
        new(1, "Titre", null, null, null, [], runtime, [], [], null, VoteAverage: voteAverage);

    private void GivenItemsMissingFacts(params WatchlistItem[] items)
    {
        var queue = new Queue<IReadOnlyList<WatchlistItem>>([items, []]);
        _watchlist.Setup(r => r.ListMissingFactsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => queue.Count > 0 ? queue.Dequeue() : []);
    }

    private void GivenTmdbDetails(int tmdbId, TmdbMovieDetails? details) =>
        _tmdb.Setup(t => t.GetDetailsAsync(tmdbId, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);

    [Fact]
    public void Id_IsStableAndDated()
    {
        Assert.Equal("2026-09-20-001-backfill-watchlist-facts", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_WritesTheRuntimeAndTheVoteReturnedByTmdb()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11));
        GivenTmdbDetails(11, Details(118, 8.3));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _watchlist.Verify(r => r.UpdateFactsAsync("w1", 118, 8.3, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_UnknownRuntime_MarksZeroWithoutCountingIt()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11) with { VoteAverage = 6.1 });
        GivenTmdbDetails(11, Details(null, 6.1));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(r => r.UpdateFactsAsync("w1", 0, 6.1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NegativeRuntime_IsClampedToZero()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11));
        GivenTmdbDetails(11, Details(-42, null));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(r => r.UpdateFactsAsync("w1", 0, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_VoteAlone_CountsAsAnUpdate()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11) with { RuntimeMinutes = 0 });
        GivenTmdbDetails(11, Details(null, 7.9));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _watchlist.Verify(r => r.UpdateFactsAsync("w1", 0, 7.9, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbReturnsNothing_LeavesTheDocumentUntouched()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11));
        GivenTmdbDetails(11, null);

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(
            r => r.UpdateFactsAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbFailsOnOneItem_UpdatesTheOthersThenReportsTheMigrationIncomplete()
    {
        GivenItemsMissingFacts(
            ItemWithoutFacts("w1", 11),
            ItemWithoutFacts("w2", 22),
            ItemWithoutFacts("w3", 33));
        GivenTmdbDetails(11, Details(90));
        _tmdb.Setup(t => t.GetDetailsAsync(22, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB indisponible"));
        GivenTmdbDetails(33, Details(120));

        var ex = await Assert.ThrowsAsync<BackfillIncompleteException>(() => _sut.ExecuteAsync());

        Assert.Equal(1, ex.Failed);
        _watchlist.Verify(r => r.UpdateFactsAsync("w3", 120, 7.2, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NothingToBackfill_WritesNothing()
    {
        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _watchlist.Verify(
            r => r.UpdateFactsAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<double?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_RepositoryKeepsReturningTheSamePage_StopsInsteadOfLooping()
    {
        var page = new List<WatchlistItem> { ItemWithoutFacts("w1", 11) };
        _watchlist.Setup(r => r.ListMissingFactsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(page);
        GivenTmdbDetails(11, Details(100));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _watchlist.Verify(r => r.UpdateFactsAsync("w1", 100, 7.2, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_UsesTheMediaTypeOfEachItem()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11) with { MediaType = MovieMediaType.Tv });
        GivenTmdbDetails(11, Details(45));

        await _sut.ExecuteAsync();

        _tmdb.Verify(t => t.GetDetailsAsync(11, MovieMediaType.Tv, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_Cancelled_Throws()
    {
        GivenItemsMissingFacts(ItemWithoutFacts("w1", 11));
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _sut.ExecuteAsync(cts.Token));
    }
}
