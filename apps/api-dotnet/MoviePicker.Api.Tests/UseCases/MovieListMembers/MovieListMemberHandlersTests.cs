using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieListMembers;

public sealed class GetMovieListMembersHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_TheOwner_SeesTheMembersOwnerFirst_ThePendingInvitations_AndTheLink()
    {
        var list = await SharedListAsync();
        Kit.Clock.Advance(TimeSpan.FromHours(1));
        await Kit.ShareAsync(list.Id, Member);
        await Kit.InviteAsync(list.Id, Invitee);
        await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        var members = await Kit.MembersHandler().HandleAsync(Owner, list.Id);

        Assert.Equal(MovieList.MaxMembers, members.MaxMembers);
        Assert.Equal(
            [(Owner, "Léa", true, Start), (Member, "Sam", false, Kit.Clock.Now)],
            members.Members.Select(m => (m.UserId, m.DisplayName, m.IsOwner, m.JoinedAt)));
        Assert.Equal("member1", members.Members[1].Handle);
        var pending = Assert.Single(members.Invitations!);
        Assert.Equal((Invitee, "Zoé", Kit.Clock.Now), (pending.UserId, pending.DisplayName, pending.InvitedAt));
        Assert.NotNull(members.InviteLink);
        Assert.True(members.InviteLink!.Active);
    }

    [Fact]
    public async Task HandleAsync_AMember_SeesTheMembersOnly()
    {
        var list = await SharedListAsync(Member);
        await Kit.InviteAsync(list.Id, Invitee);
        await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        var members = await Kit.MembersHandler().HandleAsync(Member, list.Id);

        Assert.Equal([Owner, Member], members.Members.Select(m => m.UserId));
        Assert.Null(members.Invitations);
        Assert.Null(members.InviteLink);
    }

    [Theory]
    [InlineData(Invitee)]
    [InlineData(Stranger)]
    public async Task HandleAsync_SomeoneOutside_IsNotFound(string outsider)
    {
        var list = await SharedListAsync(Member);
        await Kit.InviteAsync(list.Id, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.MembersHandler().HandleAsync(outsider, list.Id));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }
}

public sealed class RemoveMovieListMemberHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_TheOwner_RemovesAMember_WhoseTitlesStay()
    {
        var list = await SharedListAsync(Member);
        await Kit.AddAsync(list.Id, Title(603), owner: Member);

        await Kit.RemoveMemberHandler().HandleAsync(Owner, list.Id, Member);
        await Kit.RemoveMemberHandler().HandleAsync(Owner, list.Id, Member);

        var stored = (await Kit.Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Members);
        Assert.Equal(Member, Assert.Single(stored.Items).AddedByUserId);
        Assert.Null(await Kit.Lists.GetAsync(Member, list.Id));
    }

    [Fact]
    public async Task HandleAsync_TheRemovedMember_CannotComeBackThroughTheOldLink()
    {
        var list = await SharedListAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);
        await Kit.JoinHandler().HandleAsync(Member, link.Token);

        await Kit.RemoveMemberHandler().HandleAsync(Owner, list.Id, Member);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Member, link.Token));
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, ex.Reason);
        Assert.Null(await Kit.Lists.GetAsync(Member, list.Id));
        Assert.False((await Kit.MembersHandler().HandleAsync(Owner, list.Id)).InviteLink!.Active);
    }

    [Fact]
    public async Task HandleAsync_TheOwnerThemself_CannotBeRemoved()
    {
        var list = await SharedListAsync(Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.RemoveMemberHandler().HandleAsync(Owner, list.Id, Owner));

        Assert.Equal(ErrorCodes.ListOwnerCannotLeave, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AMember_CannotRemoveAnother()
    {
        var list = await SharedListAsync(Member, Invitee);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.RemoveMemberHandler().HandleAsync(Member, list.Id, Invitee));

        Assert.Equal(ErrorCodes.ListOwnerOnly, ex.Reason);
        Assert.Equal(2, (await Kit.Lists.FindAsync(list.Id))!.Members.Count);
    }
}

public sealed class LeaveMovieListHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_AMember_Leaves_AndTheirTitlesStay()
    {
        var list = await SharedListAsync(Member);
        await Kit.AddAsync(list.Id, Title(603), owner: Member);

        await Kit.LeaveHandler().HandleAsync(Member, list.Id);

        var stored = (await Kit.Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Members);
        Assert.Single(stored.Items);
        Assert.Empty((await Kit.ListHandler().HandleAsync(Member, null)).Items);
    }

    [Fact]
    public async Task HandleAsync_AMemberLeaving_KeepsTheOwnersInviteLinkActive()
    {
        var list = await SharedListAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);
        await Kit.JoinHandler().HandleAsync(Member, link.Token);

        await Kit.LeaveHandler().HandleAsync(Member, list.Id);

        Assert.True((await Kit.MembersHandler().HandleAsync(Owner, list.Id)).InviteLink!.Active);
    }

    [Fact]
    public async Task HandleAsync_TheOwner_CannotLeaveTheirOwnList()
    {
        var list = await SharedListAsync(Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.LeaveHandler().HandleAsync(Owner, list.Id));

        Assert.Equal(ErrorCodes.ListOwnerCannotLeave, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_SomeoneOutside_IsNotFound()
    {
        var list = await SharedListAsync(Member);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.LeaveHandler().HandleAsync(Stranger, list.Id));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }
}

public sealed class ListMovieListInvitableUsersHandlerTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task HandleAsync_ListsTheFollowedAccounts_ButNeitherMembersNorInvitees()
    {
        var list = await SharedListAsync(Member);
        await Kit.PersonAsync("follow-1", "Ana Lopez");
        await Kit.PersonAsync("follow-2", "Élodie");
        await Kit.InviteAsync(list.Id, Invitee);
        foreach (var followed in new[] { Member, Invitee, "follow-1", "follow-2", "gone-1" })
            await Kit.Follows.FollowAsync(Owner, followed);

        var invitable = await Kit.InvitableHandler().HandleAsync(Owner, list.Id, null);

        Assert.Equal(["follow-1", "follow-2"], invitable.Users.Select(user => user.UserId).Order(StringComparer.Ordinal));
        var ana = invitable.Users.Single(user => user.UserId == "follow-1");
        Assert.Equal(("follow1", "Ana Lopez", "avatar-follow-1"), (ana.Handle, ana.DisplayName, ana.AvatarId));
    }

    [Theory]
    [InlineData("elo", "follow-2")]
    [InlineData("ÉLO", "follow-2")]
    [InlineData("follow1", "follow-1")]
    [InlineData("  lop ", "follow-1")]
    public async Task HandleAsync_FiltersOnTheNameOrTheHandle_IgnoringCaseAndAccents(string query, string expected)
    {
        var list = await SharedListAsync();
        await Kit.PersonAsync("follow-1", "Ana Lopez");
        await Kit.PersonAsync("follow-2", "Élodie");
        await Kit.Follows.FollowAsync(Owner, "follow-1");
        await Kit.Follows.FollowAsync(Owner, "follow-2");

        var invitable = await Kit.InvitableHandler().HandleAsync(Owner, list.Id, query);

        Assert.Equal([expected], invitable.Users.Select(user => user.UserId));
    }

    [Fact]
    public async Task HandleAsync_AMember_IsForbidden()
    {
        var list = await SharedListAsync(Member);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.InvitableHandler().HandleAsync(Member, list.Id, null));

        Assert.Equal(ErrorCodes.ListOwnerOnly, ex.Reason);
    }
}
