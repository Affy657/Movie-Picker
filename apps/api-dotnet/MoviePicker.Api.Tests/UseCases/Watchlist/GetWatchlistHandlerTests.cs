using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Watchlist;

public sealed class GetWatchlistHandlerTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly GetWatchlistHandler _sut;

    public GetWatchlistHandlerTests()
    {
        _sut = new GetWatchlistHandler(_watchlist.Object);
    }

    [Fact]
    public async Task HandleAsync_NoItems_ReturnsEmptyList()
    {
        _watchlist.Setup(w => w.ListPageByUserIdAsync("u1", 0, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)Array.Empty<WatchlistItem>());
        _watchlist.Setup(w => w.CountByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var result = await _sut.HandleAsync("u1");

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_WithItems_MapsEachToResponse()
    {
        var items = new List<WatchlistItem>
        {
            new()
            {
                Id = "1",
                UserId = "u1",
                TmdbId = 42,
                MediaType = MovieMediaType.Movie,
                Title = "Matrix",
                Year = "1999",
                VoteAverage = 8.3,
                RuntimeMinutes = 136,
                CreatedAt = DateTimeOffset.UtcNow
            }
        };
        _watchlist.Setup(w => w.ListPageByUserIdAsync("u1", 0, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)items);
        _watchlist.Setup(w => w.CountByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(items.Count);

        var result = await _sut.HandleAsync("u1");

        var response = Assert.Single(result.Items);
        Assert.Equal(42, response.TmdbId);
        Assert.Equal("Matrix", response.Title);
        Assert.Equal(8.3, response.VoteAverage);
        Assert.Equal(1, result.Total);
        Assert.False(result.HasMore);
    }

    [Fact]
    public async Task HandleAsync_MoreItemsThanRequested_FlagsHasMore()
    {
        _watchlist.Setup(w => w.ListPageByUserIdAsync("u1", 0, 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)
            [
                new() { Id = "1", UserId = "u1", TmdbId = 1, Title = "A", CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = "2", UserId = "u1", TmdbId = 2, Title = "B", CreatedAt = DateTimeOffset.UtcNow }
            ]);
        _watchlist.Setup(w => w.CountByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(7);

        var result = await _sut.HandleAsync("u1", 0, 2);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(7, result.Total);
        Assert.True(result.HasMore);
    }

    [Fact]
    public async Task HandleAsync_TakeAboveCap_IsClampedToFiveHundred()
    {
        _watchlist.Setup(w => w.ListPageByUserIdAsync("u1", 10, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)Array.Empty<WatchlistItem>());
        _watchlist.Setup(w => w.CountByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(0);

        await _sut.HandleAsync("u1", 10, 5000);

        _watchlist.Verify(
            w => w.ListPageByUserIdAsync("u1", 10, 500, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
