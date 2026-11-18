using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Watched;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class WatchedControllerTests
{
    private const string UserId = "u1";

    private readonly WatchedController _sut = new WatchedController().WithContext();

    [Fact]
    public async Task Mark_AnswersTheStatus()
    {
        var request = new MarkWatchedRequest { TmdbId = 603, Title = "Matrix", Rating = 8 };
        var status = new WatchedStatusResponse { Status = WatchedStatus.Elsewhere, Rating = 8 };
        var handler = new Mock<IMarkWatchedHandler>();
        handler.Setup(h => h.HandleAsync(UserId, request, It.IsAny<CancellationToken>())).ReturnsAsync(status);

        var result = await _sut.Mark(request, handler.Object, UserId, CancellationToken.None);

        Assert.Same(status, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task GetStatus_PassesTheMediaType()
    {
        var status = new WatchedStatusResponse();
        var handler = new Mock<IGetWatchedStatusHandler>();
        handler.Setup(h => h.HandleAsync(UserId, 1920, MovieMediaType.Tv, It.IsAny<CancellationToken>())).ReturnsAsync(status);

        var result = await _sut.GetStatus(1920, handler.Object, UserId, CancellationToken.None, MovieMediaType.Tv);

        Assert.Same(status, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task SetRating_PassesTheValueAndTheMediaType()
    {
        var status = new WatchedStatusResponse();
        var handler = new Mock<ISetWatchedRatingHandler>();
        handler.Setup(h => h.HandleAsync(UserId, 1920, MovieMediaType.Tv, null, It.IsAny<CancellationToken>())).ReturnsAsync(status);

        var result = await _sut.SetRating(1920, new SetWatchedRatingRequest(), handler.Object, UserId, CancellationToken.None, MovieMediaType.Tv);

        Assert.Same(status, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task Unmark_PassesTheMediaType_AndAnswersNoContent()
    {
        var handler = new Mock<IUnmarkWatchedHandler>();

        var result = await _sut.Unmark(1920, handler.Object, UserId, CancellationToken.None, MovieMediaType.Tv);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync(UserId, 1920, MovieMediaType.Tv, It.IsAny<CancellationToken>()), Times.Once);
    }
}
