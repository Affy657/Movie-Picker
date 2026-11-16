using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieListMembers;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MovieListMembersControllerTests
{
    private const string UserId = "u1";

    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly MovieListsController _sut = new MovieListsController().WithContext();

    private void SignedIn(string? userId = UserId) => _currentUser.Setup(c => c.GetUserId()).Returns(userId);

    [Fact]
    public async Task EveryMembershipAction_WithoutAUser_IsUnauthorized_AndCallsNoHandler()
    {
        SignedIn(null);
        var ct = CancellationToken.None;
        var user = _currentUser.Object;

        IActionResult[] results =
        [
            await _sut.Members("l1", Mock.Of<IGetMovieListMembersHandler>(MockBehavior.Strict), user, ct),
            await _sut.Invitable("l1", "lea", Mock.Of<IListMovieListInvitableUsersHandler>(MockBehavior.Strict), user, ct),
            await _sut.Invite("l1", new InviteToMovieListRequest { UserId = "u2" }, Mock.Of<IInviteToMovieListHandler>(MockBehavior.Strict), user, ct),
            await _sut.CancelInvitation("l1", "u2", Mock.Of<ICancelMovieListInvitationHandler>(MockBehavior.Strict), user, ct),
            await _sut.AcceptInvitation("l1", Mock.Of<IAcceptMovieListInvitationHandler>(MockBehavior.Strict), user, ct),
            await _sut.DeclineInvitation("l1", Mock.Of<IDeclineMovieListInvitationHandler>(MockBehavior.Strict), user, ct),
            await _sut.RemoveMember("l1", "u2", Mock.Of<IRemoveMovieListMemberHandler>(MockBehavior.Strict), user, ct),
            await _sut.Leave("l1", Mock.Of<ILeaveMovieListHandler>(MockBehavior.Strict), user, ct),
            await _sut.CreateInviteLink("l1", Mock.Of<ICreateMovieListInviteLinkHandler>(MockBehavior.Strict), user, ct),
            await _sut.DisableInviteLink("l1", Mock.Of<IDisableMovieListInviteLinkHandler>(MockBehavior.Strict), user, ct),
            await _sut.Join("token", Mock.Of<IJoinMovieListHandler>(MockBehavior.Strict), user, ct)
        ];

        Assert.All(results, result => Assert.IsType<UnauthorizedResult>(result));
    }

    [Fact]
    public async Task InvitePreview_IsOpenToAnonymousVisitors_AndPassesTheSignedInViewerWhenThereIsOne()
    {
        var handler = new Mock<IGetMovieListInvitePreviewHandler>();
        var preview = new MovieListInvitePreviewResponse { Name = "Halloween" };
        handler.Setup(h => h.HandleAsync(It.IsAny<string?>(), "token", It.IsAny<CancellationToken>())).ReturnsAsync(preview);

        SignedIn(null);
        var anonymous = await _sut.InvitePreview("token", handler.Object, _currentUser.Object, CancellationToken.None);
        SignedIn();
        await _sut.InvitePreview("token", handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.Same(preview, Assert.IsType<OkObjectResult>(anonymous).Value);
        handler.Verify(h => h.HandleAsync(null, "token", It.IsAny<CancellationToken>()), Times.Once);
        handler.Verify(h => h.HandleAsync(UserId, "token", It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(typeof(MovieListsController).GetMethod(nameof(MovieListsController.InvitePreview))!.GetCustomAttribute<AllowAnonymousAttribute>());
    }

    [Theory]
    [InlineData(true, typeof(CreatedResult))]
    [InlineData(false, typeof(OkObjectResult))]
    public async Task Join_AnswersCreatedOnlyWhenTheCallerJustJoined(bool joined, Type expected)
    {
        SignedIn();
        var summary = new MovieListSummaryResponse { Id = "l1" };
        var handler = new Mock<IJoinMovieListHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "token", It.IsAny<CancellationToken>())).ReturnsAsync(new MovieListJoin(summary, joined));

        var result = await _sut.Join("token", handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType(expected, result);
        Assert.Same(summary, ((ObjectResult)result).Value);
    }

    [Fact]
    public async Task Invite_AnswersCreatedWithThePendingInvitation()
    {
        SignedIn();
        var request = new InviteToMovieListRequest { UserId = "u2" };
        var pending = new MovieListPendingInvitationResponse { UserId = "u2" };
        var handler = new Mock<IInviteToMovieListHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "l1", request, It.IsAny<CancellationToken>())).ReturnsAsync(pending);

        var result = await _sut.Invite("l1", request, handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.Same(pending, Assert.IsType<CreatedResult>(result).Value);
    }

    [Fact]
    public async Task Invitable_PassesTheQuery()
    {
        SignedIn();
        var handler = new Mock<IListMovieListInvitableUsersHandler>();
        var users = new MovieListInvitableUsersResponse();
        handler.Setup(h => h.HandleAsync(UserId, "l1", "lea", It.IsAny<CancellationToken>())).ReturnsAsync(users);

        var result = await _sut.Invitable("l1", "lea", handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.Same(users, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task MembersAcceptAndInviteLink_AnswerTheirBody()
    {
        SignedIn();
        var members = new MovieListMembersResponse();
        var summary = new MovieListSummaryResponse { Id = "l1" };
        var link = new MovieListInviteLinkResponse { Token = "t" };
        var membersHandler = new Mock<IGetMovieListMembersHandler>();
        membersHandler.Setup(h => h.HandleAsync(UserId, "l1", It.IsAny<CancellationToken>())).ReturnsAsync(members);
        var acceptHandler = new Mock<IAcceptMovieListInvitationHandler>();
        acceptHandler.Setup(h => h.HandleAsync(UserId, "l1", It.IsAny<CancellationToken>())).ReturnsAsync(summary);
        var linkHandler = new Mock<ICreateMovieListInviteLinkHandler>();
        linkHandler.Setup(h => h.HandleAsync(UserId, "l1", It.IsAny<CancellationToken>())).ReturnsAsync(link);

        Assert.Same(members, Assert.IsType<OkObjectResult>(await _sut.Members("l1", membersHandler.Object, _currentUser.Object, CancellationToken.None)).Value);
        Assert.Same(summary, Assert.IsType<OkObjectResult>(await _sut.AcceptInvitation("l1", acceptHandler.Object, _currentUser.Object, CancellationToken.None)).Value);
        Assert.Same(link, Assert.IsType<OkObjectResult>(await _sut.CreateInviteLink("l1", linkHandler.Object, _currentUser.Object, CancellationToken.None)).Value);
    }

    [Fact]
    public async Task BodilessActions_AnswerNoContent_AndPassTheirTarget()
    {
        SignedIn();
        var ct = CancellationToken.None;
        var cancel = new Mock<ICancelMovieListInvitationHandler>();
        var decline = new Mock<IDeclineMovieListInvitationHandler>();
        var remove = new Mock<IRemoveMovieListMemberHandler>();
        var leave = new Mock<ILeaveMovieListHandler>();
        var disable = new Mock<IDisableMovieListInviteLinkHandler>();

        IActionResult[] results =
        [
            await _sut.CancelInvitation("l1", "u2", cancel.Object, _currentUser.Object, ct),
            await _sut.DeclineInvitation("l1", decline.Object, _currentUser.Object, ct),
            await _sut.RemoveMember("l1", "u3", remove.Object, _currentUser.Object, ct),
            await _sut.Leave("l1", leave.Object, _currentUser.Object, ct),
            await _sut.DisableInviteLink("l1", disable.Object, _currentUser.Object, ct)
        ];

        Assert.All(results, result => Assert.IsType<NoContentResult>(result));
        cancel.Verify(h => h.HandleAsync(UserId, "l1", "u2", It.IsAny<CancellationToken>()), Times.Once);
        decline.Verify(h => h.HandleAsync(UserId, "l1", It.IsAny<CancellationToken>()), Times.Once);
        remove.Verify(h => h.HandleAsync(UserId, "l1", "u3", It.IsAny<CancellationToken>()), Times.Once);
        leave.Verify(h => h.HandleAsync(UserId, "l1", It.IsAny<CancellationToken>()), Times.Once);
        disable.Verify(h => h.HandleAsync(UserId, "l1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void JoinRoutes_ShareTheirOwnRateLimit()
    {
        string?[] policies =
        [
            typeof(MovieListsController).GetMethod(nameof(MovieListsController.InvitePreview))!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName,
            typeof(MovieListsController).GetMethod(nameof(MovieListsController.Join))!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName
        ];

        Assert.All(policies, policy => Assert.Equal(RateLimitingExtensions.MovieListJoinPolicy, policy));
        Assert.Equal(
            RateLimitingExtensions.InviteUserPolicy,
            typeof(MovieListsController).GetMethod(nameof(MovieListsController.Invite))!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);
    }
}
