using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MovieListsControllerTests
{
    private const string UserId = "u1";

    private readonly MovieListsController _sut = new MovieListsController().WithContext();

    [Fact]
    public async Task List_WithATmdbId_ProbesThatTitle_AndWithoutOne_ProbesNothing()
    {
        var handler = new Mock<IListMovieListsHandler>();
        var response = new MovieListsResponse();
        handler.Setup(h => h.HandleAsync(UserId, It.IsAny<MovieListTitle?>(), It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var probed = await _sut.List(1920, handler.Object, UserId, CancellationToken.None, MovieMediaType.Tv);
        await _sut.List(null, handler.Object, UserId, CancellationToken.None);

        Assert.Same(response, Assert.IsType<OkObjectResult>(probed).Value);
        handler.Verify(h => h.HandleAsync(UserId, new MovieListTitle(1920, MovieMediaType.Tv), It.IsAny<CancellationToken>()), Times.Once);
        handler.Verify(h => h.HandleAsync(UserId, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(true, typeof(CreatedResult))]
    [InlineData(false, typeof(OkObjectResult))]
    public async Task AddItem_AnswersCreatedOnlyForANewTitle(bool created, Type expected)
    {
        var request = new AddWatchlistItemRequest { TmdbId = 603, Title = "Matrix" };
        var item = new MovieListItemResponse { TmdbId = 603, Title = "Matrix" };
        var handler = new Mock<IAddMovieListItemHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "l1", request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MovieListItemAddition(item, created));

        var result = await _sut.AddItem("l1", request, handler.Object, UserId, CancellationToken.None);

        Assert.IsType(expected, result);
        Assert.Same(item, ((ObjectResult)result).Value);
    }

    [Fact]
    public async Task RemoveItem_PassesTheMediaType_AndAnswersNoContent()
    {
        var handler = new Mock<IRemoveMovieListItemHandler>();

        var result = await _sut.RemoveItem("l1", 1920, handler.Object, UserId, CancellationToken.None, MovieMediaType.Tv);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync(UserId, "l1", new MovieListTitle(1920, MovieMediaType.Tv), It.IsAny<CancellationToken>()), Times.Once);
    }
}
