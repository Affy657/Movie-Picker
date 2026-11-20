using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroupMembers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.FriendGroups;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.FriendGroups.FriendGroupTestKit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroupMembers;

public sealed class InviteToFriendGroupHandlerTests : FriendGroupTestBase
{
    private Task<FriendGroupPendingInvitationResponse> InviteAsync(string groupId, string target, string by = Owner) =>
        Kit.InviteHandler().HandleAsync(by, groupId, new InviteToFriendGroupRequest { UserId = target });

    [Fact]
    public async Task HandleAsync_AFollowedAccount_IsInvited_AndNotifiedInTheInboxAndByPush()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await Kit.PushSubscriptions.UpsertAsync(new PushSubscription
        {
            Id = string.Empty,
            UserId = Invitee,
            Endpoint = "https://push.test/zoe",
            P256dh = "key",
            Auth = "auth"
        });

        var invitation = await InviteAsync(group.Id, $"  {Invitee} ");

        Assert.Equal((Invitee, "Zoé", "invitee1", Start), (invitation.UserId, invitation.DisplayName, invitation.Handle, invitation.InvitedAt));
        Assert.True((await Kit.Groups.FindAsync(group.Id))!.IsInvited(Invitee, Kit.Clock.Now));
        var notice = Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
        Assert.Equal(UserNotificationType.GroupInvitation, notice.Type);
        Assert.Equal((group.Id, "Les cinéphiles"), (notice.GroupId, notice.GroupName));
        Assert.Null(notice.ListId);
        Assert.Equal(("owner1", "Léa", "avatar-owner-1"), (notice.ActorHandle, notice.ActorDisplayName, notice.ActorAvatarId));
        Assert.False(notice.IsRead);
        Kit.Push.Verify(
            p => p.SendAsync(
                It.Is<PushSubscription>(s => s.UserId == Invitee),
                It.Is<PushMessage>(m => m.Body == "Léa vous invite à rejoindre le groupe « Les cinéphiles »"
                    && m.Url == "/groupes"
                    && m.Tag == $"group-invite-{group.Id}"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AnInviteeWhoTurnedTheTypeOff_GetsAWithheldNotice_AndNoPush()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        var zoe = (await Kit.Users.GetByIdAsync(Invitee))!;
        await Kit.Users.UpdateAsync(zoe with
        {
            NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.GroupInvitation] = false }
        });
        await Kit.PushSubscriptions.UpsertAsync(new PushSubscription { Id = string.Empty, UserId = Invitee, Endpoint = "https://push.test/zoe", P256dh = "k", Auth = "a" });

        await InviteAsync(group.Id, Invitee);

        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
        Assert.True((await Kit.Groups.FindAsync(group.Id))!.IsInvited(Invitee, Kit.Clock.Now));
        Kit.Push.Verify(p => p.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AnAccountThatCannotBeRead_LeavesNoOrphanInvitation()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        var users = new Mock<IUserRepository>();
        users
            .Setup(u => u.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("users unreachable"));
        var handler = new InviteToFriendGroupHandler(
            Kit.Groups, Kit.Follows, users.Object, Kit.Notifications, Kit.PushSubscriptions, Kit.Push.Object, Kit.Quota, Kit.Clock);

        await Assert.ThrowsAsync<TimeoutException>(
            () => handler.HandleAsync(Owner, group.Id, new InviteToFriendGroupRequest { UserId = Invitee }));

        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Invitations);
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_ANoticeThatCannotBeWritten_WithdrawsTheInvitation()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        var notifications = new Mock<IUserNotificationRepository>();
        notifications
            .Setup(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("notifications unreachable"));
        var handler = new InviteToFriendGroupHandler(
            Kit.Groups, Kit.Follows, Kit.Users, notifications.Object, Kit.PushSubscriptions, Kit.Push.Object, Kit.Quota, Kit.Clock);

        await Assert.ThrowsAsync<TimeoutException>(
            () => handler.HandleAsync(Owner, group.Id, new InviteToFriendGroupRequest { UserId = Invitee }));

        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Invitations);
    }

    [Fact]
    public async Task HandleAsync_AnAccountTheOwnerDoesNotFollow_IsRefused()
    {
        var group = await SharedGroupAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => InviteAsync(group.Id, Invitee));

        Assert.Equal(ErrorCodes.InviteOnlyFollowed, ex.Reason);
        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Invitations);
    }

    [Fact]
    public async Task HandleAsync_AMember_IsAlreadyThere()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.Follows.FollowAsync(Owner, Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(group.Id, Member));

        Assert.Equal(ErrorCodes.GroupAlreadyMember, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TheOwnerThemself_IsAlreadyThere()
    {
        var group = await SharedGroupAsync();

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(group.Id, Owner));

        Assert.Equal(ErrorCodes.GroupAlreadyMember, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_APendingInvitee_IsNotInvitedTwice()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await InviteAsync(group.Id, Invitee);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(group.Id, Invitee));

        Assert.Equal(ErrorCodes.GroupInvitationAlreadySent, ex.Reason);
        Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_TwentySeatsTaken_PendingInvitationsIncluded_IsAConflict()
    {
        var group = await SharedGroupAsync(Member);
        await FillAsync(group.Id, 17);
        await Kit.InviteAsync(group.Id, Stranger);
        await Kit.Follows.FollowAsync(Owner, Invitee);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => InviteAsync(group.Id, Invitee));

        Assert.Equal(ErrorCodes.GroupMembersLimitReached, ex.Reason);
        Assert.Equal(FriendGroup.MaxMembers, ex.Parameters!["max"]);
    }

    [Fact]
    public async Task HandleAsync_NineteenSeatsTaken_LeavesRoomForOneMore()
    {
        var group = await SharedGroupAsync(Member);
        await FillAsync(group.Id, 17);
        await Kit.Follows.FollowAsync(Owner, Invitee);

        await InviteAsync(group.Id, Invitee);

        Assert.Equal(FriendGroup.MaxMembers, (await Kit.Groups.FindAsync(group.Id))!.SeatsTaken(Kit.Clock.Now));
    }

    [Fact]
    public async Task HandleAsync_AnInvitationUnansweredPastItsLifetime_CanBeSentAgain_AndHoldsNoSeat()
    {
        var group = await SharedGroupAsync(Member);
        await FillAsync(group.Id, 17);
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await InviteAsync(group.Id, Invitee);
        Kit.Clock.Advance(FriendGroupInvitation.Lifetime);

        var again = await InviteAsync(group.Id, Invitee);

        Assert.Equal(Kit.Clock.Now, again.InvitedAt);
        var stored = (await Kit.Groups.FindAsync(group.Id))!;
        Assert.Equal(Kit.Clock.Now, Assert.Single(stored.Invitations).InvitedAt);
        Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_AMember_CannotInvite()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.Follows.FollowAsync(Member, Invitee);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => InviteAsync(group.Id, Invitee, by: Member));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AStranger_SeesNoGroup()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Stranger, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => InviteAsync(group.Id, Invitee, by: Stranger));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_BeyondTheDailyQuotaOfThePair_IsRefused_WithoutInviting()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        Kit.Quota.Allows = false;

        var ex = await Assert.ThrowsAsync<TooManyRequestsException>(() => InviteAsync(group.Id, Invitee));

        Assert.Equal(ErrorCodes.InvitationLimitReached, ex.Reason);
        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Invitations);
        var call = Assert.Single(Kit.Quota.Calls);
        Assert.Equal((InviteToFriendGroupHandler.PairQuotaScope, $"{Owner}|{Invitee}", 5, TimeSpan.FromHours(24)), (call.Scope, call.Subject, call.Limit, call.Window));
    }

    [Fact]
    public async Task HandleAsync_AnInvitationAgainAfterACancel_ReplacesTheOldNotice()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await InviteAsync(group.Id, Invitee);
        await Kit.Groups.RemoveInvitationAsync(group.Id, Invitee);

        await InviteAsync(group.Id, Invitee);

        Assert.Single(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_ARefusalFromTheStore_SaysWhy()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        var current = (await Kit.Groups.FindAsync(group.Id))!;
        var groups = new Mock<IFriendGroupRepository>();
        groups.Setup(r => r.GetAsync(Owner, group.Id, It.IsAny<CancellationToken>())).ReturnsAsync(current);
        groups.SetupSequence(r => r.FindAsync(group.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(current with { Members = [new FriendGroupMember(Invitee, Start)] })
            .ReturnsAsync(current with { Invitations = [new FriendGroupInvitation(Invitee, Start)] })
            .ReturnsAsync((FriendGroup?)null)
            .ReturnsAsync(current);
        groups.Setup(r => r.AddInvitationAsync(group.Id, It.IsAny<FriendGroupInvitation>(), FriendGroup.MaxMembers, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var handler = new InviteToFriendGroupHandler(
            groups.Object, Kit.Follows, Kit.Users, Kit.Notifications, Kit.PushSubscriptions, Kit.Push.Object, Kit.Quota, Kit.Clock);
        var request = new InviteToFriendGroupRequest { UserId = Invitee };

        var joinedMeanwhile = await Assert.ThrowsAsync<ConflictException>(() => handler.HandleAsync(Owner, group.Id, request));
        var invitedMeanwhile = await Assert.ThrowsAsync<ConflictException>(() => handler.HandleAsync(Owner, group.Id, request));
        var deletedMeanwhile = await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(Owner, group.Id, request));
        var raced = await Assert.ThrowsAsync<ConflictException>(() => handler.HandleAsync(Owner, group.Id, request));

        Assert.Equal(ErrorCodes.GroupAlreadyMember, joinedMeanwhile.Reason);
        Assert.Equal(ErrorCodes.GroupInvitationAlreadySent, invitedMeanwhile.Reason);
        Assert.Equal(ErrorCodes.GroupNotFound, deletedMeanwhile.Reason);
        Assert.Equal(ErrorCodes.ConcurrentUpdate, raced.Reason);
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }
}

public sealed class CancelFriendGroupInvitationHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_TheOwner_WithdrawsTheInvitationAndItsNotice()
    {
        var group = await SharedGroupAsync();
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await Kit.InviteHandler().HandleAsync(Owner, group.Id, new InviteToFriendGroupRequest { UserId = Invitee });

        await Kit.CancelInvitationHandler().HandleAsync(Owner, group.Id, Invitee);
        await Kit.CancelInvitationHandler().HandleAsync(Owner, group.Id, Invitee);

        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Invitations);
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_AMember_IsForbidden()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.CancelInvitationHandler().HandleAsync(Member, group.Id, Invitee));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, ex.Reason);
        Assert.True((await Kit.Groups.FindAsync(group.Id))!.IsInvited(Invitee, Kit.Clock.Now));
    }
}

public sealed class AcceptFriendGroupInvitationHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_TheInvitee_JoinsAndGetsTheGroupAsAMember()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);
        Kit.Clock.Advance(TimeSpan.FromHours(1));

        var joined = await Kit.AcceptHandler().HandleAsync(Invitee, group.Id);

        Assert.Equal((group.Id, FriendGroupRole.Member, 3), (joined.Id, joined.Role, joined.MemberCount));
        Assert.Equal("Léa", joined.OwnerDisplayName);
        var stored = (await Kit.Groups.FindAsync(group.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal(new FriendGroupMember(Invitee, Kit.Clock.Now), stored.Members[^1]);
        Assert.Contains((await Kit.ListHandler().HandleAsync(Invitee)).Groups, summary => summary.Id == group.Id);
    }

    [Fact]
    public async Task HandleAsync_AlreadyAMember_GetsTheGroupAgain()
    {
        var group = await SharedGroupAsync(Member);

        var again = await Kit.AcceptHandler().HandleAsync(Member, group.Id);

        Assert.Equal(FriendGroupRole.Member, again.Role);
        Assert.Single((await Kit.Groups.FindAsync(group.Id))!.Members);
    }

    [Theory]
    [InlineData(Stranger)]
    [InlineData(Invitee)]
    public async Task HandleAsync_WithoutAPendingInvitation_IsNotFound(string caller)
    {
        var group = await SharedGroupAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.AcceptHandler().HandleAsync(caller, group.Id));

        Assert.Equal(ErrorCodes.GroupInvitationNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnInvitationPastItsLifetime_IsNotFound()
    {
        var group = await SharedGroupAsync();
        await Kit.InviteAsync(group.Id, Invitee);
        Kit.Clock.Advance(FriendGroupInvitation.Lifetime);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.AcceptHandler().HandleAsync(Invitee, group.Id));

        Assert.Equal(ErrorCodes.GroupInvitationNotFound, ex.Reason);
        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Members);
    }

    [Fact]
    public async Task HandleAsync_AnUnknownGroup_IsNotFoundTheSameWay()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.AcceptHandler().HandleAsync(Invitee, "missing"));

        Assert.Equal(ErrorCodes.GroupInvitationNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnInvitationCancelledMeanwhile_IsNotFound()
    {
        var group = new FriendGroup { Id = "g1", OwnerId = Owner, Name = "Les cinéphiles", Invitations = [new FriendGroupInvitation(Invitee, Start)] };
        var groups = new Mock<IFriendGroupRepository>();
        groups.Setup(r => r.FindAsync("g1", It.IsAny<CancellationToken>())).ReturnsAsync(group);
        groups.Setup(r => r.AcceptInvitationAsync("g1", It.IsAny<FriendGroupMember>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        groups.Setup(r => r.GetAsync(Invitee, "g1", It.IsAny<CancellationToken>())).ReturnsAsync((FriendGroup?)null);
        var handler = new AcceptFriendGroupInvitationHandler(groups.Object, Kit.Users, Kit.Clock);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(Invitee, "g1"));

        Assert.Equal(ErrorCodes.GroupInvitationNotFound, ex.Reason);
    }
}

public sealed class DeclineFriendGroupInvitationHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_TheInvitee_DropsTheInvitation_AndStaysOutside()
    {
        var group = await SharedGroupAsync();
        await Kit.InviteAsync(group.Id, Invitee);

        await Kit.DeclineHandler().HandleAsync(Invitee, group.Id);
        await Kit.DeclineHandler().HandleAsync(Invitee, group.Id);

        var stored = (await Kit.Groups.FindAsync(group.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Empty(stored.Members);
        Assert.Empty((await Kit.ListHandler().HandleAsync(Invitee)).Invitations);
    }

    [Fact]
    public async Task HandleAsync_AMember_StaysAMember()
    {
        var group = await SharedGroupAsync(Member);

        await Kit.DeclineHandler().HandleAsync(Member, group.Id);

        Assert.Single((await Kit.Groups.FindAsync(group.Id))!.Members);
    }
}
