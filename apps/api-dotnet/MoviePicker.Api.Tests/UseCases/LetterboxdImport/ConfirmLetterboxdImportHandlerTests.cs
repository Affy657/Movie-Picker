using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class ConfirmLetterboxdImportHandlerTests
{
    private const string UserId = "u1";

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IAddToWatchlistHandler> _addToWatchlist = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly InMemoryWatchedTitleRepository _watched = new();
    private readonly SteppingClock _clock = new(new DateTimeOffset(2026, 11, 13, 20, 0, 0, TimeSpan.Zero));
    private readonly Mock<IUsageRecorder> _usage = new();
    private readonly ConfirmLetterboxdImportHandler _sut;

    public ConfirmLetterboxdImportHandlerTests()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)[]);
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = UserId,
                Email = "a@b.c",
                LetterboxdPendingReconciliationCount = 4
            });
        var facts = new MovieListItemFactory(_posters.Object, _tmdb.Object, NullLogger<MovieListItemFactory>.Instance);
        _sut = new ConfirmLetterboxdImportHandler(
            _watchlist.Object,
            _addToWatchlist.Object,
            _users.Object,
            new LetterboxdWatchedWriter(_watched, _watchlist.Object, _users.Object, facts, _clock),
            new LetterboxdLinkedCounter(_users.Object, _watchlist.Object, _watched),
            _usage.Object);
    }

    private static LetterboxdWatchedSelectionRequest WatchedSelection(
        int tmdbId,
        string slug,
        int? rating = null,
        DateOnly? watchedOn = null) => new()
        {
            TmdbId = tmdbId,
            MediaType = MovieMediaType.Movie,
            Title = $"Film {tmdbId}",
            Year = "1999",
            LetterboxdSlug = slug,
            Rating = rating,
            WatchedOn = watchedOn
        };

    private void GivenOnWatchlist(int tmdbId, string? slug) =>
        _watchlist
            .Setup(w => w.GetOneAsync(UserId, tmdbId, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WatchlistItem { UserId = UserId, TmdbId = tmdbId, Title = $"Film {tmdbId}", LetterboxdSlug = slug });

    private void GivenPendingCount(int pending) =>
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = UserId, Email = "a@b.c", LetterboxdPendingReconciliationCount = pending });

    private static AddWatchlistItemRequest Selection(
        int tmdbId,
        string title = "Matrix",
        string? letterboxdSlug = null) => new()
        {
            TmdbId = tmdbId,
            MediaType = MovieMediaType.Movie,
            Title = title,
            Year = "1999",
            LetterboxdSlug = letterboxdSlug
        };

    [Fact]
    public async Task HandleAsync_EmptySelections_UpdatesPendingCountWithoutWatchlistCalls()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [], RemainingUnresolvedCount = 3 });

        Assert.Equal(0, result.Added);
        Assert.Equal(0, result.AlreadyPresent);
        Assert.Equal(4, result.PendingReconciliationCount);
        _addToWatchlist.Verify(
            a => a.HandleAsync(It.IsAny<string>(), It.IsAny<AddWatchlistItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 4, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_TooManySelections_ThrowsBadRequest()
    {
        var selections = Enumerable.Range(0, LetterboxdImportLimits.MaxRows + 1)
            .Select(i => Selection(i))
            .ToList();

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(UserId, new LetterboxdImportConfirmRequest { Selections = selections }));
    }

    [Fact]
    public async Task HandleAsync_NewSelection_AddsToWatchlist()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [Selection(42)] });

        Assert.Equal(1, result.Added);
        Assert.Equal(0, result.AlreadyPresent);
        _addToWatchlist.Verify(
            a => a.HandleAsync(UserId, It.Is<AddWatchlistItemRequest>(r => r.TmdbId == 42), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_SelectionAlreadyInWatchlist_SkipsAdd()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)
            [
                new WatchlistItem
                {
                    Id = "1",
                    UserId = UserId,
                    TmdbId = 42,
                    MediaType = MovieMediaType.Movie,
                    Title = "Matrix",
                    Year = "1999",
                    CreatedAt = DateTimeOffset.UtcNow
                }
            ]);

        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [Selection(42)] });

        Assert.Equal(0, result.Added);
        Assert.Equal(1, result.AlreadyPresent);
        _addToWatchlist.Verify(
            a => a.HandleAsync(It.IsAny<string>(), It.IsAny<AddWatchlistItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SelectionAlreadyInWatchlist_AttachesLetterboxdSlugToExistingItem()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)
            [
                new WatchlistItem
                {
                    Id = "1",
                    UserId = UserId,
                    TmdbId = 42,
                    MediaType = MovieMediaType.Movie,
                    Title = "Matrix",
                    Year = "1999",
                    CreatedAt = DateTimeOffset.UtcNow
                }
            ]);

        await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [Selection(42, letterboxdSlug: "the-matrix")] });

        _watchlist.Verify(
            w => w.SetLetterboxdSlugAsync(
                UserId, 42, MovieMediaType.Movie, "the-matrix", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NewSelectionWithSlug_ForwardsSlugToAddHandler()
    {
        await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [Selection(42, letterboxdSlug: "the-matrix")] });

        _addToWatchlist.Verify(
            a => a.HandleAsync(
                UserId,
                It.Is<AddWatchlistItemRequest>(r => r.LetterboxdSlug == "the-matrix"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_RemainingUnresolvedCount_PersistsThatCount()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest
            {
                Selections = [Selection(42)],
                RemainingUnresolvedCount = 3
            });

        Assert.Equal(3, result.PendingReconciliationCount);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 3, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_RemainingUnresolvedCountZeroWithNoSelections_KeepsCurrentCount()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [], RemainingUnresolvedCount = 0 });

        Assert.Equal(4, result.PendingReconciliationCount);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 4, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ClientCannotDropPendingBelowResolvedCount()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest
            {
                Selections = [Selection(42)],
                RemainingUnresolvedCount = 0
            });

        Assert.Equal(3, result.PendingReconciliationCount);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 3, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithoutRemainingCount_DecrementsStoredPendingCount()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { Selections = [Selection(42), Selection(43)] });

        Assert.Equal(2, result.PendingReconciliationCount);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 2, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WatchedSelection_IsWatchedFromLetterboxd_AndLeavesTheWatchlist()
    {
        GivenOnWatchlist(603, slug: null);
        _watchlist
            .Setup(w => w.RemoveAsync(UserId, 603, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest
            {
                WatchedSelections = [WatchedSelection(603, "the-matrix", rating: 9, watchedOn: new DateOnly(2026, 10, 30))]
            });

        var stored = await _watched.GetAsync(UserId, 603, MovieMediaType.Movie);
        Assert.Equal((1, 0, 0), (result.WatchedAdded, result.WatchedAlreadyPresent, result.Added));
        Assert.Equal(
            (WatchedOrigin.Letterboxd, "the-matrix", (int?)9, (WatchedOrigin?)WatchedOrigin.Letterboxd, new DateTimeOffset(2026, 10, 30, 12, 0, 0, TimeSpan.Zero)),
            (stored!.Origin, stored.LetterboxdSlug, stored.Rating, stored.RatingOrigin, stored.WatchedAt));
        _watchlist.Verify(w => w.RemoveAsync(UserId, 603, MovieMediaType.Movie, It.IsAny<CancellationToken>()), Times.Once);
        _addToWatchlist.Verify(
            a => a.HandleAsync(It.IsAny<string>(), It.IsAny<AddWatchlistItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WatchedSelectionStillOnTheLetterboxdWatchlist_StaysToWatch()
    {
        GivenOnWatchlist(603, slug: "the-matrix");

        await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { WatchedSelections = [WatchedSelection(603, "the-matrix")] });

        Assert.NotNull(await _watched.GetAsync(UserId, 603, MovieMediaType.Movie));
        _watchlist.Verify(
            w => w.RemoveAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WatchedSelectionAlreadyWatchedByHand_IsLinkedWithoutTouchingItsRating()
    {
        await _watched.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = UserId,
            TmdbId = 603,
            Title = "Matrix",
            Rating = 10,
            RatingOrigin = WatchedOrigin.Manual
        });

        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { WatchedSelections = [WatchedSelection(603, "the-matrix", rating: 4)] });

        var stored = await _watched.GetAsync(UserId, 603, MovieMediaType.Movie);
        Assert.Equal((0, 1), (result.WatchedAdded, result.WatchedAlreadyPresent));
        Assert.Equal((WatchedOrigin.Manual, "the-matrix", (int?)10), (stored!.Origin, stored.LetterboxdSlug, stored.Rating));
    }

    [Fact]
    public async Task HandleAsync_TooManyWatchedSelections_ThrowsBadRequest()
    {
        var selections = Enumerable.Range(0, LetterboxdImportLimits.MaxRows + 1)
            .Select(i => WatchedSelection(i + 1, $"film-{i}"))
            .ToList();

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(UserId, new LetterboxdImportConfirmRequest { WatchedSelections = selections }));
    }

    [Fact]
    public async Task HandleAsync_WithoutRemainingCount_DecrementsByTheChoicesOfBothLists()
    {
        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest
            {
                Selections = [Selection(42)],
                WatchedSelections = [WatchedSelection(603, "the-matrix"), WatchedSelection(680, "pulp-fiction")]
            });

        Assert.Equal(1, result.PendingReconciliationCount);
    }

    [Fact]
    public async Task HandleAsync_PendingChoicesOfBothLists_AreNotCappedAtASingleListBudget()
    {
        GivenPendingCount(LetterboxdImportLimits.MaxRows + 100);

        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { WatchedSelections = [WatchedSelection(603, "the-matrix")] });

        Assert.Equal(LetterboxdImportLimits.MaxRows + 99, result.PendingReconciliationCount);
    }

    [Fact]
    public async Task HandleAsync_RefreshesTheCountsOfTitlesLinkedToLetterboxd()
    {
        _watchlist
            .Setup(w => w.CountLinkedToLetterboxdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        await _sut.HandleAsync(
            UserId,
            new LetterboxdImportConfirmRequest { WatchedSelections = [WatchedSelection(603, "the-matrix")] });

        _users.Verify(u => u.SetLetterboxdLinkedCountsAsync(UserId, 5, 1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithSelections_CountsAConfirmation()
    {
        await _sut.HandleAsync(UserId, new LetterboxdImportConfirmRequest { Selections = [Selection(42)] });

        _usage.Verify(
            x => x.RecordAsync(
                It.Is<UsageCount>(c => c.Metric == UsageCount.LetterboxdChoicesConfirmedMetric && c.Variant == "selected"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithoutSelection_CountsADismissal()
    {
        await _sut.HandleAsync(UserId, new LetterboxdImportConfirmRequest { Selections = [], RemainingUnresolvedCount = 0 });

        _usage.Verify(
            x => x.RecordAsync(
                It.Is<UsageCount>(c => c.Metric == UsageCount.LetterboxdChoicesConfirmedMetric && c.Variant == "none"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_RefusedRequest_IsNotCounted()
    {
        var selections = Enumerable.Range(0, LetterboxdImportLimits.MaxRows + 1).Select(i => Selection(i)).ToList();

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync(UserId, new LetterboxdImportConfirmRequest { Selections = selections }));

        _usage.Verify(x => x.RecordAsync(It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
