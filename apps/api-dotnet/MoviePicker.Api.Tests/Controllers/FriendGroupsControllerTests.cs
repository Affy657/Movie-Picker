using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroupMembers;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class FriendGroupsControllerTests
{
    private const string UserId = "u1";

    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly FriendGroupsController _sut = new FriendGroupsController().WithContext();

    private void SignedIn(string? userId = UserId) => _currentUser.Setup(c => c.GetUserId()).Returns(userId);

    private static string? PolicyOf(string action) =>
        typeof(FriendGroupsController).GetMethod(action)!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName;

    [Fact]
    public void TheController_IsForSignedInAccounts_UnderGroups()
    {
        Assert.NotNull(typeof(FriendGroupsController).GetCustomAttribute<AuthorizeAttribute>());
        Assert.Equal(ApiRoutePrefix.V1 + "/groups", typeof(FriendGroupsController).GetCustomAttribute<RouteAttribute>()!.Template);
    }

    [Fact]
    public async Task ListGetAndUpdate_AnswerTheirBody()
    {
        var mine = new MyGroupsResponse();
        var detail = new FriendGroupDetailResponse { Id = "g1" };
        var summary = new FriendGroupSummaryResponse { Id = "g1" };
        var rename = new UpdateFriendGroupRequest { Name = "Ciné du jeudi" };
        var list = new Mock<IListFriendGroupsHandler>();
        list.Setup(h => h.HandleAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(mine);
        var get = new Mock<IGetFriendGroupHandler>();
        get.Setup(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>())).ReturnsAsync(detail);
        var update = new Mock<IUpdateFriendGroupHandler>();
        update.Setup(h => h.HandleAsync(UserId, "g1", rename, It.IsAny<CancellationToken>())).ReturnsAsync(summary);

        Assert.Same(mine, Assert.IsType<OkObjectResult>(await _sut.List(list.Object, UserId, CancellationToken.None)).Value);
        Assert.Same(detail, Assert.IsType<OkObjectResult>(await _sut.Get("g1", get.Object, UserId, CancellationToken.None)).Value);
        Assert.Same(summary, Assert.IsType<OkObjectResult>(await _sut.Update("g1", rename, update.Object, UserId, CancellationToken.None)).Value);
    }

    [Fact]
    public async Task Ranking_AnswersTheFiguresOfTheMembers()
    {
        var ranking = new FriendGroupRankingResponse { NightCount = 3 };
        var handler = new Mock<IGetFriendGroupRankingHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>())).ReturnsAsync(ranking);

        var result = await _sut.Ranking("g1", handler.Object, UserId, CancellationToken.None);

        Assert.Same(ranking, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task Create_AnswersCreatedWithTheSummary()
    {
        var request = new CreateFriendGroupRequest { Name = "Les cinéphiles" };
        var summary = new FriendGroupSummaryResponse { Id = "g1" };
        var handler = new Mock<ICreateFriendGroupHandler>();
        handler.Setup(h => h.HandleAsync(UserId, request, It.IsAny<CancellationToken>())).ReturnsAsync(summary);

        var result = await _sut.Create(request, handler.Object, UserId, CancellationToken.None);

        Assert.Same(summary, Assert.IsType<CreatedResult>(result).Value);
    }

    [Fact]
    public async Task InvitePreview_IsOpenToAnonymousVisitors_AndPassesTheSignedInViewerWhenThereIsOne()
    {
        var handler = new Mock<IGetFriendGroupInvitePreviewHandler>();
        var preview = new FriendGroupInvitePreviewResponse { Name = "Les cinéphiles" };
        handler.Setup(h => h.HandleAsync(It.IsAny<string?>(), "token", It.IsAny<CancellationToken>())).ReturnsAsync(preview);

        SignedIn(null);
        var anonymous = await _sut.InvitePreview("token", handler.Object, _currentUser.Object, CancellationToken.None);
        SignedIn(string.Empty);
        await _sut.InvitePreview("token", handler.Object, _currentUser.Object, CancellationToken.None);
        SignedIn();
        await _sut.InvitePreview("token", handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.Same(preview, Assert.IsType<OkObjectResult>(anonymous).Value);
        handler.Verify(h => h.HandleAsync(null, "token", It.IsAny<CancellationToken>()), Times.Exactly(2));
        handler.Verify(h => h.HandleAsync(UserId, "token", It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(typeof(FriendGroupsController).GetMethod(nameof(FriendGroupsController.InvitePreview))!.GetCustomAttribute<AllowAnonymousAttribute>());
    }

    [Theory]
    [InlineData(true, typeof(CreatedResult))]
    [InlineData(false, typeof(OkObjectResult))]
    public async Task Join_AnswersCreatedOnlyWhenTheCallerJustJoined_WithTheGroupAndTheFlag(bool joined, Type expected)
    {
        var join = new FriendGroupJoinResponse { Group = new FriendGroupSummaryResponse { Id = "g1" }, Joined = joined };
        var handler = new Mock<IJoinFriendGroupHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "token", It.IsAny<CancellationToken>())).ReturnsAsync(join);

        var result = await _sut.Join("token", handler.Object, UserId, CancellationToken.None);

        Assert.IsType(expected, result);
        Assert.Same(join, ((ObjectResult)result).Value);
    }

    [Fact]
    public async Task Invite_AnswersCreatedWithThePendingInvitation()
    {
        var request = new InviteToFriendGroupRequest { UserId = "u2" };
        var pending = new FriendGroupPendingInvitationResponse { UserId = "u2" };
        var handler = new Mock<IInviteToFriendGroupHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "g1", request, It.IsAny<CancellationToken>())).ReturnsAsync(pending);

        var result = await _sut.Invite("g1", request, handler.Object, UserId, CancellationToken.None);

        Assert.Same(pending, Assert.IsType<CreatedResult>(result).Value);
    }

    [Fact]
    public async Task Invitable_PassesTheQuery()
    {
        var handler = new Mock<IListFriendGroupInvitableUsersHandler>();
        var users = new FriendGroupInvitableUsersResponse();
        handler.Setup(h => h.HandleAsync(UserId, "g1", "lea", It.IsAny<CancellationToken>())).ReturnsAsync(users);

        var result = await _sut.Invitable("g1", "lea", handler.Object, UserId, CancellationToken.None);

        Assert.Same(users, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task MembersAcceptAndInviteLink_AnswerTheirBody()
    {
        var members = new FriendGroupMembersResponse();
        var summary = new FriendGroupSummaryResponse { Id = "g1" };
        var link = new FriendGroupInviteLinkResponse { Token = "t" };
        var membersHandler = new Mock<IGetFriendGroupMembersHandler>();
        membersHandler.Setup(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>())).ReturnsAsync(members);
        var acceptHandler = new Mock<IAcceptFriendGroupInvitationHandler>();
        acceptHandler.Setup(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>())).ReturnsAsync(summary);
        var linkHandler = new Mock<ICreateFriendGroupInviteLinkHandler>();
        linkHandler.Setup(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>())).ReturnsAsync(link);

        Assert.Same(members, Assert.IsType<OkObjectResult>(await _sut.Members("g1", membersHandler.Object, UserId, CancellationToken.None)).Value);
        Assert.Same(summary, Assert.IsType<OkObjectResult>(await _sut.AcceptInvitation("g1", acceptHandler.Object, UserId, CancellationToken.None)).Value);
        Assert.Same(link, Assert.IsType<OkObjectResult>(await _sut.CreateInviteLink("g1", linkHandler.Object, UserId, CancellationToken.None)).Value);
    }

    [Fact]
    public async Task BodilessActions_AnswerNoContent_AndPassTheirTarget()
    {
        var ct = CancellationToken.None;
        var delete = new Mock<IDeleteFriendGroupHandler>();
        var cancel = new Mock<ICancelFriendGroupInvitationHandler>();
        var decline = new Mock<IDeclineFriendGroupInvitationHandler>();
        var remove = new Mock<IRemoveFriendGroupMemberHandler>();
        var leave = new Mock<ILeaveFriendGroupHandler>();
        var disable = new Mock<IDisableFriendGroupInviteLinkHandler>();

        IActionResult[] results =
        [
            await _sut.Delete("g1", delete.Object, UserId, ct),
            await _sut.CancelInvitation("g1", "u2", cancel.Object, UserId, ct),
            await _sut.DeclineInvitation("g1", decline.Object, UserId, ct),
            await _sut.RemoveMember("g1", "u3", remove.Object, UserId, ct),
            await _sut.Leave("g1", leave.Object, UserId, ct),
            await _sut.DisableInviteLink("g1", disable.Object, UserId, ct)
        ];

        Assert.All(results, result => Assert.IsType<NoContentResult>(result));
        delete.Verify(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>()), Times.Once);
        cancel.Verify(h => h.HandleAsync(UserId, "g1", "u2", It.IsAny<CancellationToken>()), Times.Once);
        decline.Verify(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>()), Times.Once);
        remove.Verify(h => h.HandleAsync(UserId, "g1", "u3", It.IsAny<CancellationToken>()), Times.Once);
        leave.Verify(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>()), Times.Once);
        disable.Verify(h => h.HandleAsync(UserId, "g1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void Routes_HaveTheirRateLimit_JoinRoutesSharingTheirOwn()
    {
        Assert.All(
            [nameof(FriendGroupsController.InvitePreview), nameof(FriendGroupsController.Join)],
            action => Assert.Equal(RateLimitingExtensions.FriendGroupJoinPolicy, PolicyOf(action)));
        Assert.Equal(RateLimitingExtensions.InviteUserPolicy, PolicyOf(nameof(FriendGroupsController.Invite)));
        Assert.All(
            [nameof(FriendGroupsController.List), nameof(FriendGroupsController.Get), nameof(FriendGroupsController.Ranking), nameof(FriendGroupsController.Members), nameof(FriendGroupsController.Invitable)],
            action => Assert.Equal(RateLimitingExtensions.FriendGroupReadPolicy, PolicyOf(action)));
        Assert.All(
            [
                nameof(FriendGroupsController.Create),
                nameof(FriendGroupsController.Update),
                nameof(FriendGroupsController.Delete),
                nameof(FriendGroupsController.CancelInvitation),
                nameof(FriendGroupsController.AcceptInvitation),
                nameof(FriendGroupsController.DeclineInvitation),
                nameof(FriendGroupsController.RemoveMember),
                nameof(FriendGroupsController.Leave),
                nameof(FriendGroupsController.CreateInviteLink),
                nameof(FriendGroupsController.DisableInviteLink)
            ],
            action => Assert.Equal(RateLimitingExtensions.FriendGroupMutationPolicy, PolicyOf(action)));
    }
}
