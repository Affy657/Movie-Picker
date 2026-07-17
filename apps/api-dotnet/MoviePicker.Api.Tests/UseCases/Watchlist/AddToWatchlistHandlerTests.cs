using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Watchlist;

public sealed class AddToWatchlistHandlerTests
{
    private const string UserId = "u1";

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IPosterImageStore> _posterImageStore = new();
    private readonly AddToWatchlistHandler _sut;

    public AddToWatchlistHandlerTests()
    {
        _posterImageStore.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? p) => p);
        _sut = new AddToWatchlistHandler(_watchlist.Object, _posterImageStore.Object, TimeProvider.System);
    }

    private static AddWatchlistItemRequest Request() => new()
    {
        TmdbId = 42,
        MediaType = MovieMediaType.Movie,
        Title = "Matrix",
        Year = "1999",
        PosterPath = null,
        VoteAverage = 8.3,
        RuntimeMinutes = 136
    };

    [Fact]
    public async Task HandleAsync_NewItem_Persists_AndReturnsIt()
    {
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.Equal(42, result.TmdbId);
        Assert.Equal("Matrix", result.Title);
        Assert.Equal(8.3, result.VoteAverage);
        Assert.Equal(136, result.RuntimeMinutes);
        _watchlist.Verify(
            w => w.GetOneAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DuplicateItem_ReturnsExistingStoredItem_NotAFabricatedOne()
    {
        var existing = new WatchlistItem
        {
            Id = "existing-id",
            UserId = UserId,
            TmdbId = 42,
            MediaType = MovieMediaType.Movie,
            Title = "Matrix (déjà en liste)",
            Year = "1999",
            PosterPath = null,
            VoteAverage = 8.3,
            RuntimeMinutes = 136,
            CreatedAt = new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero)
        };
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _watchlist.Setup(w => w.GetOneAsync(UserId, 42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.Equal(existing.CreatedAt, result.CreatedAt);
        Assert.Equal(existing.Title, result.Title);
        Assert.NotEqual(DateTimeOffset.UtcNow.Date, result.CreatedAt.Date);
    }

    [Fact]
    public async Task HandleAsync_DuplicateItem_ExistingVanished_FallsBackToConstructedItem()
    {
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _watchlist.Setup(w => w.GetOneAsync(UserId, 42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync((WatchlistItem?)null);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.Equal(42, result.TmdbId);
        Assert.Equal("Matrix", result.Title);
    }
}
