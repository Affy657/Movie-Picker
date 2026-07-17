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
        _watchlist.Setup(w => w.ListByUserIdAsync("u1", 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)Array.Empty<WatchlistItem>());

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
        _watchlist.Setup(w => w.ListByUserIdAsync("u1", 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)items);

        var result = await _sut.HandleAsync("u1");

        var response = Assert.Single(result.Items);
        Assert.Equal(42, response.TmdbId);
        Assert.Equal("Matrix", response.Title);
        Assert.Equal(8.3, response.VoteAverage);
    }
}
