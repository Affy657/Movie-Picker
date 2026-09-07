using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Application.UseCases.UserStats;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class UsersControllerTests
{
    private static UsersController Controller(string? userId) =>
        new UsersController().WithContext(
            userId is null ? null : ControllerTestHelpers.AuthenticatedUser(userId));

    [Fact]
    public async Task HandleAvailable_ForwardsHandleAndCurrentUser()
    {
        var handler = new Mock<ICheckHandleAvailabilityHandler>();

        var result = await Controller("u1").HandleAvailable("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("cinephile", "u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAvailable_NullHandle_PassesEmptyString()
    {
        var handler = new Mock<ICheckHandleAvailabilityHandler>();

        await Controller(null).HandleAvailable(null, handler.Object, CancellationToken.None);

        handler.Verify(h => h.HandleAsync("", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPublicProfile_ForwardsHandle()
    {
        var handler = new Mock<IGetPublicProfileHandler>();

        var result = await Controller("u1").GetPublicProfile("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("cinephile", "u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetUserStats_ForwardsHandle()
    {
        var handler = new Mock<IGetUserStatsHandler>();

        var result = await Controller(null).GetUserStats("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("cinephile", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Follow_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IFollowUserHandler>();

        var result = await Controller("u1").Follow("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", "cinephile", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Follow_Anonymous_ReturnsUnauthorized()
    {
        var handler = new Mock<IFollowUserHandler>();

        var result = await Controller(null).Follow("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        handler.Verify(
            h => h.HandleAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Unfollow_Authenticated_ReturnsNoContent()
    {
        var handler = new Mock<IUnfollowUserHandler>();

        var result = await Controller("u1").Unfollow("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("u1", "cinephile", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Unfollow_Anonymous_ReturnsUnauthorized()
    {
        var result = await Controller(null).Unfollow("cinephile", new Mock<IUnfollowUserHandler>().Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetFollowing_ForwardsHandleAndViewer()
    {
        var handler = new Mock<IGetFollowingListHandler>();

        var result = await Controller("u1").GetFollowing("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("cinephile", "u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetFollowers_ForwardsHandleAndViewer()
    {
        var handler = new Mock<IGetFollowersListHandler>();

        var result = await Controller("u1").GetFollowers("cinephile", handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("cinephile", "u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    private static Mock<ICurrentUserAccessor> Accessor(string? userId)
    {
        var accessor = new Mock<ICurrentUserAccessor>();
        accessor.Setup(a => a.GetUserId()).Returns(userId);
        return accessor;
    }

    [Fact]
    public async Task GetMyWatchedMovies_ForwardsTheCurrentUser()
    {
        var handler = new Mock<IGetUserWatchedMoviesHandler>();
        handler
            .Setup(h => h.HandleForUserAsync("u1", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserWatchedMoviesResponse { Items = [] });

        var result = await Controller("u1")
            .GetMyWatchedMovies(1, handler.Object, Accessor("u1").Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleForUserAsync("u1", 1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMyWatchedMovies_NeverGoesThroughThePublicProfile()
    {
        var handler = new Mock<IGetUserWatchedMoviesHandler>();
        handler
            .Setup(h => h.HandleForUserAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserWatchedMoviesResponse { Items = [] });

        await Controller("u1")
            .GetMyWatchedMovies(6, handler.Object, Accessor("u1").Object, CancellationToken.None);

        handler.Verify(
            h => h.HandleAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetMyWatchedMovies_WithoutSession_ReturnsUnauthorized()
    {
        var handler = new Mock<IGetUserWatchedMoviesHandler>();

        var result = await Controller(null)
            .GetMyWatchedMovies(1, handler.Object, Accessor(null).Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        handler.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetFollowingWatchedMovies_ForwardsTheCurrentUser()
    {
        var handler = new Mock<IGetFollowedWatchedMoviesHandler>();
        handler
            .Setup(h => h.HandleAsync("u1", 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserWatchedMoviesResponse { Items = [] });

        var result = await Controller("u1")
            .GetFollowingWatchedMovies(20, handler.Object, Accessor("u1").Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("u1", 20, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetFollowingWatchedMovies_WithoutSession_ReturnsUnauthorized()
    {
        var handler = new Mock<IGetFollowedWatchedMoviesHandler>();

        var result = await Controller(null)
            .GetFollowingWatchedMovies(20, handler.Object, Accessor(null).Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        handler.VerifyNoOtherCalls();
    }
}
