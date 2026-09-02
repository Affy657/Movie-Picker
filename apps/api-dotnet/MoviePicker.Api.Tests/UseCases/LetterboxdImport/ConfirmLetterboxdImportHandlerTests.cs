using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class ConfirmLetterboxdImportHandlerTests
{
    private const string UserId = "u1";

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IAddToWatchlistHandler> _addToWatchlist = new();
    private readonly Mock<IUserRepository> _users = new();
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
        _sut = new ConfirmLetterboxdImportHandler(_watchlist.Object, _addToWatchlist.Object, _users.Object);
    }

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
}
