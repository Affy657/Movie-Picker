using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieListMembers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieListMembers;

public sealed class InviteToMovieListHandlerTests : MovieListMembershipTestBase
{
    private Task<MovieListPendingInvitationResponse> InviteAsync(string listId, string target, string by = Owner) =>
        Kit.InviteHandler().HandleAsync(by, listId, new InviteToMovieListRequest { UserId = target });

    [Fact]
    public async Task HandleAsync_AFollowedAccount_IsInvited_AndNotifiedInTheInboxAndByPush()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await Kit.PushSubscriptions.UpsertAsync(new PushSubscription
        {
            Id = string.Empty,
            UserId = Invitee,
            Endpoint = "https://push.test/zoe",
            P256dh = "key",
            Auth = "auth"
        });

        var invitation = await InviteAsync(list.Id, Invitee);

        Assert.Equal((Invitee, "Zoé", "invitee1", Start), (invitation.UserId, invitation.DisplayName, invitation.Handle, invitation.InvitedAt));
        Assert.True((await Kit.Lists.FindAsync(list.Id))!.IsInvited(Invitee));
        var notice = Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
        Assert.Equal(UserNotificationType.ListInvitation, notice.Type);
        Assert.Equal((list.Id, "Halloween"), (notice.ListId, notice.ListName));
        Assert.Equal(("owner1", "Léa", "avatar-owner-1"), (notice.ActorHandle, notice.ActorDisplayName, notice.ActorAvatarId));
        Assert.False(notice.IsRead);
        Kit.Push.Verify(
            p => p.SendAsync(
                It.Is<PushSubscription>(s => s.UserId == Invitee),
                It.Is<PushMessage>(m => m.Body.Contains("Léa", StringComparison.Ordinal)
                    && m.Body.Contains("Halloween", StringComparison.Ordinal)
                    && m.Url == "/notifications"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AnInviteeWhoTurnedTheTypeOff_GetsAWithheldNotice_AndNoPush()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        var zoe = (await Kit.Users.GetByIdAsync(Invitee))!;
        await Kit.Users.UpdateAsync(zoe with
        {
            NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.ListInvitation] = false }
        });
        await Kit.PushSubscriptions.UpsertAsync(new PushSubscription { Id = string.Empty, UserId = Invitee, Endpoint = "https://push.test/zoe", P256dh = "k", Auth = "a" });

        await InviteAsync(list.Id, Invitee);

        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
        Assert.True((await Kit.Lists.FindAsync(list.Id))!.IsInvited(Invitee));
        Kit.Push.Verify(p => p.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AnAccountThatCannotBeRead_LeavesNoOrphanInvitation()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        var users = new Mock<IUserRepository>();
        users
            .Setup(u => u.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("users unreachable"));
        var handler = new InviteToMovieListHandler(
            Kit.Lists, Kit.Follows, users.Object, Kit.Notifications, Kit.PushSubscriptions, Kit.Push.Object, Kit.Quota, Kit.Clock);

        await Assert.ThrowsAsync<TimeoutException>(
            () => handler.HandleAsync(Owner, list.Id, new InviteToMovieListRequest { UserId = Invitee }));

        Assert.Empty((await Kit.Lists.FindAsync(list.Id))!.Invitations);
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_AnAccountTheOwnerDoesNotFollow_IsRefused()
    {
        var list = await SharedListAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => InviteAsync(list.Id, Invitee));

        Assert.Equal(ErrorCodes.InviteOnlyFollowed, ex.Reason);
        Assert.Empty((await Kit.Lists.FindAsync(list.Id))!.Invitations);
    }

    [Fact]
    public async Task HandleAsync_AMember_IsAlreadyThere()
    {
        var list = await SharedListAsync(Member);
        await Kit.Follows.FollowAsync(Owner, Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(list.Id, Member));

        Assert.Equal(ErrorCodes.ListAlreadyMember, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TheOwnerThemself_IsAlreadyThere()
    {
        var list = await SharedListAsync();

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(list.Id, Owner));

        Assert.Equal(ErrorCodes.ListAlreadyMember, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_APendingInvitee_IsNotInvitedTwice()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await InviteAsync(list.Id, Invitee);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(list.Id, Invitee));

        Assert.Equal(ErrorCodes.ListInvitationAlreadySent, ex.Reason);
        Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_TwentySeatsTaken_PendingInvitationsIncluded_IsAConflict()
    {
        var list = await SharedListAsync(Member);
        await FillAsync(list.Id, 17);
        await Kit.InviteAsync(list.Id, Stranger);
        await Kit.Follows.FollowAsync(Owner, Invitee);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(list.Id, Invitee));

        Assert.Equal(ErrorCodes.ListMembersLimitReached, ex.Reason);
        Assert.Equal(MovieList.MaxMembers, ex.Parameters!["max"]);
    }

    [Fact]
    public async Task HandleAsync_NineteenSeatsTaken_LeavesRoomForOneMore()
    {
        var list = await SharedListAsync(Member);
        await FillAsync(list.Id, 17);
        await Kit.Follows.FollowAsync(Owner, Invitee);

        await InviteAsync(list.Id, Invitee);

        Assert.Equal(MovieList.MaxMembers, (await Kit.Lists.FindAsync(list.Id))!.SeatsTaken);
    }

    [Fact]
    public async Task HandleAsync_AMember_CannotInvite()
    {
        var list = await SharedListAsync(Member);
        await Kit.Follows.FollowAsync(Member, Invitee);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => InviteAsync(list.Id, Invitee, by: Member));

        Assert.Equal(ErrorCodes.ListOwnerOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AStranger_SeesNoList()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Stranger, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => InviteAsync(list.Id, Invitee, by: Stranger));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_BeyondTheDailyQuotaOfThePair_IsRefused_WithoutInviting()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        Kit.Quota.Allows = false;

        var ex = await Assert.ThrowsAsync<TooManyRequestsException>(() => InviteAsync(list.Id, Invitee));

        Assert.Equal(ErrorCodes.InvitationLimitReached, ex.Reason);
        Assert.Empty((await Kit.Lists.FindAsync(list.Id))!.Invitations);
        var call = Assert.Single(Kit.Quota.Calls);
        Assert.Equal((InviteToMovieListHandler.PairQuotaScope, $"{Owner}|{Invitee}", 5, TimeSpan.FromHours(24)), (call.Scope, call.Subject, call.Limit, call.Window));
    }

    [Fact]
    public async Task HandleAsync_AnInvitationAgainAfterACancel_ReplacesTheOldNotice()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await InviteAsync(list.Id, Invitee);
        await Kit.Lists.RemoveInvitationAsync(list.Id, Invitee);

        await InviteAsync(list.Id, Invitee);

        Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }
}

public sealed class CancelMovieListInvitationHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_TheOwner_WithdrawsTheInvitationAndItsNotice()
    {
        var list = await SharedListAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await Kit.InviteHandler().HandleAsync(Owner, list.Id, new InviteToMovieListRequest { UserId = Invitee });

        await Kit.CancelInvitationHandler().HandleAsync(Owner, list.Id, Invitee);
        await Kit.CancelInvitationHandler().HandleAsync(Owner, list.Id, Invitee);

        Assert.Empty((await Kit.Lists.FindAsync(list.Id))!.Invitations);
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_AMember_IsForbidden()
    {
        var list = await SharedListAsync(Member);
        await Kit.InviteAsync(list.Id, Invitee);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.CancelInvitationHandler().HandleAsync(Member, list.Id, Invitee));

        Assert.Equal(ErrorCodes.ListOwnerOnly, ex.Reason);
        Assert.True((await Kit.Lists.FindAsync(list.Id))!.IsInvited(Invitee));
    }
}

public sealed class AcceptMovieListInvitationHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_TheInvitee_JoinsAndGetsTheListAsAMember()
    {
        var list = await SharedListAsync(Member);
        await Kit.InviteAsync(list.Id, Invitee);
        Kit.Clock.Advance(TimeSpan.FromHours(1));

        var joined = await Kit.AcceptHandler().HandleAsync(Invitee, list.Id);

        Assert.Equal((list.Id, MovieListRole.Member, 3), (joined.Id, joined.Role, joined.MemberCount));
        Assert.Equal("Léa", joined.Owner.DisplayName);
        var stored = (await Kit.Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal(new MovieListMember(Invitee, Kit.Clock.Now), stored.Members[^1]);
        Assert.Contains((await Kit.ListHandler().HandleAsync(Invitee, null)).Items, summary => summary.Id == list.Id);
    }

    [Fact]
    public async Task HandleAsync_AlreadyAMember_GetsTheListAgain()
    {
        var list = await SharedListAsync(Member);

        var again = await Kit.AcceptHandler().HandleAsync(Member, list.Id);

        Assert.Equal(MovieListRole.Member, again.Role);
        Assert.Single((await Kit.Lists.FindAsync(list.Id))!.Members);
    }

    [Theory]
    [InlineData(Stranger)]
    [InlineData(Invitee)]
    public async Task HandleAsync_WithoutAPendingInvitation_IsNotFound(string caller)
    {
        var list = await SharedListAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.AcceptHandler().HandleAsync(caller, list.Id));

        Assert.Equal(ErrorCodes.ListInvitationNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnUnknownList_IsNotFoundTheSameWay()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.AcceptHandler().HandleAsync(Invitee, "missing"));

        Assert.Equal(ErrorCodes.ListInvitationNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnInvitationCancelledMeanwhile_IsNotFound()
    {
        var list = new MovieList { Id = "l1", OwnerId = Owner, Name = "Halloween", Invitations = [new MovieListInvitation(Invitee, Start)] };
        var lists = new Mock<IMovieListRepository>();
        lists.SetupSequence(r => r.FindAsync("l1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(list)
            .ReturnsAsync(list with { Invitations = [] });
        lists.Setup(r => r.AcceptInvitationAsync("l1", It.IsAny<MovieListMember>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var handler = new AcceptMovieListInvitationHandler(lists.Object, Kit.History, Kit.Users, Kit.Clock);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(Invitee, "l1"));

        Assert.Equal(ErrorCodes.ListInvitationNotFound, ex.Reason);
    }
}

public sealed class DeclineMovieListInvitationHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_TheInvitee_DropsTheInvitation_AndStaysOutside()
    {
        var list = await SharedListAsync();
        await Kit.InviteAsync(list.Id, Invitee);

        await Kit.DeclineHandler().HandleAsync(Invitee, list.Id);
        await Kit.DeclineHandler().HandleAsync(Invitee, list.Id);

        var stored = (await Kit.Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Empty(stored.Members);
    }

    [Fact]
    public async Task HandleAsync_AMember_StaysAMember()
    {
        var list = await SharedListAsync(Member);

        await Kit.DeclineHandler().HandleAsync(Member, list.Id);

        Assert.Single((await Kit.Lists.FindAsync(list.Id))!.Members);
    }
}
