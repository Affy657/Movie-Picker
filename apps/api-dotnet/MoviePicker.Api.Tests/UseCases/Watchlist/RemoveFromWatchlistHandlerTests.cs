using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Watchlist;

public sealed class RemoveFromWatchlistHandlerTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly RemoveFromWatchlistHandler _sut;

    public RemoveFromWatchlistHandlerTests()
    {
        _sut = new RemoveFromWatchlistHandler(_watchlist.Object);
    }

    [Fact]
    public async Task HandleAsync_DelegatesToRepository_WithGivenParameters()
    {
        await _sut.HandleAsync("u1", 42, MovieMediaType.Tv);

        _watchlist.Verify(
            w => w.RemoveAsync("u1", 42, MovieMediaType.Tv, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
