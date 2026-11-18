using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.PublicLists;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class PublicListsControllerTests
{
    private readonly PublicListsController _sut = new PublicListsController().WithContext();

    private static Mock<ICurrentUserAccessor> Viewer(string? userId)
    {
        var accessor = new Mock<ICurrentUserAccessor>();
        accessor.Setup(a => a.GetUserId()).Returns(userId);
        return accessor;
    }

    [Theory]
    [InlineData(null)]
    [InlineData("u1")]
    public async Task List_ForwardsTheHandleAndTheViewer_SignedInOrNot(string? viewerId)
    {
        var response = new PublicListsResponse();
        var handler = new Mock<IListPublicListsHandler>();
        handler.Setup(h => h.HandleAsync("lea", viewerId, It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var result = await _sut.List("lea", handler.Object, Viewer(viewerId).Object, CancellationToken.None);

        Assert.Same(response, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("u1")]
    public async Task Get_ForwardsTheHandleTheListAndTheViewer(string? viewerId)
    {
        var response = new PublicListResponse { Id = "l1" };
        var handler = new Mock<IGetPublicListHandler>();
        handler.Setup(h => h.HandleAsync("lea", "l1", viewerId, It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var result = await _sut.Get("lea", "l1", handler.Object, Viewer(viewerId).Object, CancellationToken.None);

        Assert.Same(response, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task Copy_AnswersTheCreatedList()
    {
        var request = new CopySavedListRequest { Name = "Mon Hitchcock" };
        var list = new MovieListResponse { Id = "copy", Name = "Mon Hitchcock" };
        var handler = new Mock<ICopyPublicListHandler>();
        handler.Setup(h => h.HandleAsync("u1", "lea", "l1", request, It.IsAny<CancellationToken>())).ReturnsAsync(list);

        var result = await _sut.Copy("lea", "l1", request, handler.Object, "u1", CancellationToken.None);

        Assert.Same(list, Assert.IsType<CreatedResult>(result).Value);
    }

    [Theory]
    [InlineData(nameof(PublicListsController.List), true, RateLimitingExtensions.PublicProfilePolicy)]
    [InlineData(nameof(PublicListsController.Get), true, RateLimitingExtensions.PublicProfilePolicy)]
    [InlineData(nameof(PublicListsController.Copy), false, RateLimitingExtensions.MovieListMutationPolicy)]
    public void EveryAction_DeclaresWhoMayCallIt_AndItsRateLimit(string action, bool anonymous, string policy)
    {
        var method = typeof(PublicListsController).GetMethod(action)!;

        Assert.Equal(anonymous, method.GetCustomAttribute<AllowAnonymousAttribute>() is not null);
        Assert.Equal(!anonymous, method.GetCustomAttribute<AuthorizeAttribute>() is not null);
        Assert.Equal(policy, method.GetCustomAttribute<EnableRateLimitingAttribute>()!.PolicyName);
    }
}
