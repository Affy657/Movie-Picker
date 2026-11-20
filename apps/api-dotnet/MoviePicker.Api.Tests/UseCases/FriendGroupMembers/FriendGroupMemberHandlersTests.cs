using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.FriendGroups;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.FriendGroups.FriendGroupTestKit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroupMembers;

public sealed class GetFriendGroupMembersHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_TheOwner_SeesTheMembersOwnerFirst_ThePendingInvitations_AndTheLink()
    {
        var group = await SharedGroupAsync();
        Kit.Clock.Advance(TimeSpan.FromHours(1));
        await Kit.ShareAsync(group.Id, Member);
        await Kit.InviteAsync(group.Id, Invitee);
        await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        var members = await Kit.MembersHandler().HandleAsync(Owner, group.Id);

        Assert.Equal(FriendGroup.MaxMembers, members.MaxMembers);
        Assert.Equal(
            [(Owner, "Léa", FriendGroupRole.Owner, Start), (Member, "Sam", FriendGroupRole.Member, Kit.Clock.Now)],
            members.Members.Select(m => (m.UserId, m.DisplayName, m.Role, m.JoinedAt)));
        Assert.Equal("member1", members.Members[1].Handle);
        var pending = Assert.Single(members.Invitations!);
        Assert.Equal((Invitee, "Zoé", Kit.Clock.Now), (pending.UserId, pending.DisplayName, pending.InvitedAt));
        Assert.NotNull(members.InviteLink);
        Assert.True(members.InviteLink!.Active);
    }

    [Fact]
    public async Task HandleAsync_TheOwner_NoLongerSeesAnInvitationPastItsLifetime()
    {
        var group = await SharedGroupAsync();
        await Kit.InviteAsync(group.Id, Invitee);
        Kit.Clock.Advance(FriendGroupInvitation.Lifetime);

        var members = await Kit.MembersHandler().HandleAsync(Owner, group.Id);

        Assert.Empty(members.Invitations!);
    }

    [Fact]
    public async Task HandleAsync_AMember_SeesTheMembersOnly()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);
        await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        var members = await Kit.MembersHandler().HandleAsync(Member, group.Id);

        Assert.Equal([Owner, Member], members.Members.Select(m => m.UserId));
        Assert.Null(members.Invitations);
        Assert.Null(members.InviteLink);
    }

    [Theory]
    [InlineData(Invitee)]
    [InlineData(Stranger)]
    public async Task HandleAsync_SomeoneOutside_IsNotFound(string outsider)
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.MembersHandler().HandleAsync(outsider, group.Id));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }
}

public sealed class RemoveFriendGroupMemberHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_TheOwner_RemovesAMember_Idempotently()
    {
        var group = await SharedGroupAsync(Member);

        await Kit.RemoveMemberHandler().HandleAsync(Owner, group.Id, Member);
        await Kit.RemoveMemberHandler().HandleAsync(Owner, group.Id, Member);

        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Members);
        Assert.Null(await Kit.Groups.GetAsync(Member, group.Id));
    }

    [Fact]
    public async Task HandleAsync_TheRemovedMember_CannotComeBackThroughTheOldLink()
    {
        var group = await SharedGroupAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);
        await Kit.JoinHandler().HandleAsync(Member, link.Token);

        await Kit.RemoveMemberHandler().HandleAsync(Owner, group.Id, Member);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Member, link.Token));
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, ex.Reason);
        Assert.Null(await Kit.Groups.GetAsync(Member, group.Id));
        Assert.False((await Kit.MembersHandler().HandleAsync(Owner, group.Id)).InviteLink!.Active);
    }

    [Fact]
    public async Task HandleAsync_TheOwnerThemself_CannotBeRemoved()
    {
        var group = await SharedGroupAsync(Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.RemoveMemberHandler().HandleAsync(Owner, group.Id, Owner));

        Assert.Equal(ErrorCodes.GroupOwnerCannotLeave, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AMember_CannotRemoveAnother()
    {
        var group = await SharedGroupAsync(Member, Invitee);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.RemoveMemberHandler().HandleAsync(Member, group.Id, Invitee));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, ex.Reason);
        Assert.Equal(2, (await Kit.Groups.FindAsync(group.Id))!.Members.Count);
    }
}

public sealed class LeaveFriendGroupHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_AMember_Leaves_AndTheGroupLeavesTheirList()
    {
        var group = await SharedGroupAsync(Member);

        await Kit.LeaveHandler().HandleAsync(Member, group.Id);

        Assert.Empty((await Kit.Groups.FindAsync(group.Id))!.Members);
        Assert.Empty((await Kit.ListHandler().HandleAsync(Member)).Groups);
    }

    [Fact]
    public async Task HandleAsync_AMemberLeaving_KeepsTheOwnersInviteLinkActive()
    {
        var group = await SharedGroupAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);
        await Kit.JoinHandler().HandleAsync(Member, link.Token);

        await Kit.LeaveHandler().HandleAsync(Member, group.Id);

        Assert.True((await Kit.MembersHandler().HandleAsync(Owner, group.Id)).InviteLink!.Active);
    }

    [Fact]
    public async Task HandleAsync_TheOwner_CannotLeaveTheirOwnGroup()
    {
        var group = await SharedGroupAsync(Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.LeaveHandler().HandleAsync(Owner, group.Id));

        Assert.Equal(ErrorCodes.GroupOwnerCannotLeave, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_SomeoneOutside_IsNotFound()
    {
        var group = await SharedGroupAsync(Member);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.LeaveHandler().HandleAsync(Stranger, group.Id));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }
}

public sealed class ListFriendGroupInvitableUsersHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_ListsTheFollowedAccounts_ButNeitherMembersNorInvitees()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.PersonAsync("follow-1", "Ana Lopez");
        await Kit.PersonAsync("follow-2", "Élodie");
        await Kit.InviteAsync(group.Id, Invitee);
        foreach (var followed in new[] { Member, Invitee, "follow-1", "follow-2", "gone-1" })
            await Kit.Follows.FollowAsync(Owner, followed);

        var invitable = await Kit.InvitableHandler().HandleAsync(Owner, group.Id, null);

        Assert.Equal(["follow-1", "follow-2"], invitable.Users.Select(user => user.UserId).Order(StringComparer.Ordinal));
        var ana = invitable.Users.Single(user => user.UserId == "follow-1");
        Assert.Equal(("follow1", "Ana Lopez", "avatar-follow-1"), (ana.Handle, ana.DisplayName, ana.AvatarId));
    }

    [Fact]
    public async Task HandleAsync_OffersAgainAnInviteeWhoseInvitationLapsed()
    {
        var group = await SharedGroupAsync();
        await Kit.InviteAsync(group.Id, Invitee);
        await Kit.Follows.FollowAsync(Owner, Invitee);
        Kit.Clock.Advance(FriendGroupInvitation.Lifetime);

        var invitable = await Kit.InvitableHandler().HandleAsync(Owner, group.Id, null);

        Assert.Equal([Invitee], invitable.Users.Select(user => user.UserId));
    }

    [Theory]
    [InlineData("elo", "follow-2")]
    [InlineData("ÉLO", "follow-2")]
    [InlineData("follow1", "follow-1")]
    [InlineData("  lop ", "follow-1")]
    public async Task HandleAsync_FiltersOnTheNameOrTheHandle_IgnoringCaseAndAccents(string query, string expected)
    {
        var group = await SharedGroupAsync();
        await Kit.PersonAsync("follow-1", "Ana Lopez");
        await Kit.PersonAsync("follow-2", "Élodie");
        await Kit.Follows.FollowAsync(Owner, "follow-1");
        await Kit.Follows.FollowAsync(Owner, "follow-2");

        var invitable = await Kit.InvitableHandler().HandleAsync(Owner, group.Id, query);

        Assert.Equal([expected], invitable.Users.Select(user => user.UserId));
    }

    [Fact]
    public async Task HandleAsync_NobodyLeftToInvite_IsAnEmptyList()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.Follows.FollowAsync(Owner, Member);

        var invitable = await Kit.InvitableHandler().HandleAsync(Owner, group.Id, null);

        Assert.Empty(invitable.Users);
    }

    [Fact]
    public async Task HandleAsync_AMember_IsForbidden()
    {
        var group = await SharedGroupAsync(Member);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.InvitableHandler().HandleAsync(Member, group.Id, null));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, ex.Reason);
    }
}
