using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class WatchlistControllerTests
{
    private readonly WatchlistController _sut = new WatchlistController().WithContext();

    [Fact]
    public async Task Get_Authenticated_ReturnsOkWithHandlerResult()
    {
        var handler = new Mock<IGetWatchlistHandler>();
        var response = new WatchlistResponse { Items = [] };
        handler.Setup(h => h.HandleAsync("u1", true, 0, null, It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var result = await _sut.Get(0, null, handler.Object, "u1", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public async Task Add_Authenticated_ReturnsCreatedWithItem()
    {
        var handler = new Mock<IAddToWatchlistHandler>();
        var request = new AddWatchlistItemRequest { TmdbId = 42, Title = "Matrix", Year = "1999" };
        var response = new WatchlistItemResponse { TmdbId = 42, Title = "Matrix", Year = "1999" };
        handler.Setup(h => h.HandleAsync("u1", request, It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var result = await _sut.Add(request, handler.Object, "u1", CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result);
        Assert.Same(response, created.Value);
    }

    [Fact]
    public async Task Remove_Authenticated_CallsHandler_AndReturnsNoContent()
    {
        var handler = new Mock<IRemoveFromWatchlistHandler>();

        var result = await _sut.Remove(
            42,
            handler.Object,
            "u1",
            CancellationToken.None,
            MovieMediaType.Tv);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(
            h => h.HandleAsync("u1", 42, MovieMediaType.Tv, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
