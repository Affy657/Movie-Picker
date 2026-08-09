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
    private readonly ConfirmLetterboxdImportHandler _sut;

    public ConfirmLetterboxdImportHandlerTests()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)[]);
        _sut = new ConfirmLetterboxdImportHandler(_watchlist.Object, _addToWatchlist.Object);
    }

    private static AddWatchlistItemRequest Selection(int tmdbId, string title = "Matrix") => new()
    {
        TmdbId = tmdbId,
        MediaType = MovieMediaType.Movie,
        Title = title,
        Year = "1999"
    };

    [Fact]
    public async Task HandleAsync_EmptySelections_ReturnsZeroesWithoutCalls()
    {
        var result = await _sut.HandleAsync(UserId, new LetterboxdImportConfirmRequest { Selections = [] });

        Assert.Equal(0, result.Added);
        Assert.Equal(0, result.AlreadyPresent);
        _addToWatchlist.Verify(
            a => a.HandleAsync(It.IsAny<string>(), It.IsAny<AddWatchlistItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TooManySelections_ThrowsBadRequest()
    {
        var selections = Enumerable.Range(0, LetterboxdCsvParser.MaxRows + 1)
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
        _watchlist.Verify(
            w => w.ListByUserIdAsync(UserId, int.MaxValue, It.IsAny<CancellationToken>()),
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
}
