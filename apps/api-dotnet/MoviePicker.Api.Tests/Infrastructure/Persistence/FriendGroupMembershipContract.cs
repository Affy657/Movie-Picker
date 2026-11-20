using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence;

public abstract class FriendGroupMembershipContract
{
    protected static readonly DateTimeOffset Now = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    private static readonly DateTimeOffset Lapsed = Now.AddDays(-90);

    private const int Seats = FriendGroup.MaxMembers;

    protected abstract IFriendGroupRepository Groups { get; }

    protected static string NewUserId() => Guid.NewGuid().ToString("N")[..24];

    private Task<FriendGroup> CreateAsync(string owner, string name, DateTimeOffset? updatedAt = null) =>
        Groups.AddAsync(new FriendGroup
        {
            OwnerId = owner,
            Name = name,
            CreatedAt = Now,
            UpdatedAt = updatedAt ?? Now
        });

    private async Task<FriendGroup> SharedAsync(string owner, string name, params string[] members)
    {
        var group = await CreateAsync(owner, name);
        foreach (var member in members)
        {
            Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(member, Now), Seats));
            Assert.True(await Groups.AcceptInvitationAsync(group.Id, new FriendGroupMember(member, Now.AddMinutes(1))));
        }

        return (await Groups.FindAsync(group.Id))!;
    }

    private static FriendGroupInviteLink NewLink(int days = 7) =>
        new(Guid.NewGuid().ToString("N"), Now.AddDays(days), Disabled: false);

    [Fact]
    public async Task Add_StoresTheGroupUnderANewId_WithItsDates()
    {
        var owner = NewUserId();

        var created = await CreateAsync(owner, "Les cinéphiles", Now.AddMinutes(5));

        Assert.False(string.IsNullOrEmpty(created.Id));
        var stored = (await Groups.FindAsync(created.Id))!;
        Assert.Equal((owner, "Les cinéphiles", Now, Now.AddMinutes(5)), (stored.OwnerId, stored.Name, stored.CreatedAt, stored.UpdatedAt));
        Assert.Empty(stored.Members);
        Assert.Empty(stored.Invitations);
        Assert.Null(stored.InviteLink);
    }

    [Fact]
    public async Task ListAdmitting_HoldsTheOwnedAndTheJoinedGroups_LatestUpdatedFirst_ButNotThoseOnlyInvitedTo()
    {
        var me = NewUserId();
        var lea = NewUserId();
        var sam = NewUserId();
        var mine = await CreateAsync(me, "Les miens", Now.AddHours(1));
        var leas = await SharedAsync(lea, "Le groupe de Léa", me, sam);
        await Groups.RenameAsync(lea, leas.Id, "Le groupe de Léa", Now.AddHours(2));
        var sams = await CreateAsync(sam, "Le groupe de Sam");
        await Groups.AddInvitationAsync(sams.Id, new FriendGroupInvitation(me, Now), Seats);

        var groups = await Groups.ListAdmittingAsync(me);

        Assert.Equal([leas.Id, mine.Id], groups.Select(group => group.Id));
        Assert.Equal([me, sam], groups[0].Members.Select(member => member.UserId));
    }

    [Fact]
    public async Task Get_AdmitsTheOwnerAndTheMembers_WhileFindIgnoresWhoAsks()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var invitee = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member);
        await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats);

        Assert.NotNull(await Groups.GetAsync(owner, group.Id));
        var seen = await Groups.GetAsync(member, group.Id);
        Assert.Equal(member, Assert.Single(seen!.Members).UserId);
        Assert.Equal(Now.AddMinutes(1), seen.Members[0].JoinedAt);
        Assert.Equal(invitee, Assert.Single(seen.Invitations).UserId);
        Assert.Null(await Groups.GetAsync(invitee, group.Id));
        Assert.Null(await Groups.GetAsync(NewUserId(), group.Id));
        Assert.Equal(group.Id, (await Groups.FindAsync(group.Id))!.Id);
        Assert.Null(await Groups.FindAsync("nope"));
        Assert.Null(await Groups.GetAsync(owner, "nope"));
    }

    [Fact]
    public async Task CountByOwner_CountsOnlyTheGroupsTheyOwn()
    {
        var owner = NewUserId();
        var other = NewUserId();
        await CreateAsync(owner, "Un");
        await CreateAsync(owner, "Deux");
        await SharedAsync(other, "Celui des autres", owner);

        Assert.Equal(2, await Groups.CountByOwnerAsync(owner));
        Assert.Equal(1, await Groups.CountByOwnerAsync(other));
        Assert.Equal(0, await Groups.CountByOwnerAsync(NewUserId()));
    }

    [Fact]
    public async Task Rename_ChangesTheNameAndTheUpdateDate_ForTheOwnerOnly()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var group = await SharedAsync(owner, "Avant", member);

        Assert.Null(await Groups.RenameAsync(member, group.Id, "Volé", Now.AddHours(1)));
        var renamed = await Groups.RenameAsync(owner, group.Id, "Après", Now.AddHours(2));

        Assert.Equal(("Après", Now.AddHours(2), Now), (renamed!.Name, renamed.UpdatedAt, renamed.CreatedAt));
        Assert.Equal([member], renamed.Members.Select(m => m.UserId));
        Assert.Equal("Après", (await Groups.FindAsync(group.Id))!.Name);
        Assert.Null(await Groups.RenameAsync(owner, "nope", "Rien", Now));
    }

    [Fact]
    public async Task OwnerOnlyWrites_IgnoreAMember()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member);

        Assert.False(await Groups.SetInviteLinkAsync(member, group.Id, NewLink()));
        Assert.False(await Groups.DisableInviteLinkAsync(member, group.Id));
        Assert.False(await Groups.DeleteAsync(member, group.Id));

        var kept = (await Groups.FindAsync(group.Id))!;
        Assert.Equal("Partagé", kept.Name);
        Assert.Null(kept.InviteLink);
    }

    [Fact]
    public async Task Delete_RemovesTheGroupOfItsOwner()
    {
        var owner = NewUserId();
        var group = await CreateAsync(owner, "Éphémère");

        Assert.True(await Groups.DeleteAsync(owner, group.Id));
        Assert.False(await Groups.DeleteAsync(owner, group.Id));

        Assert.Null(await Groups.FindAsync(group.Id));
    }

    [Fact]
    public async Task AddInvitation_RefusesTheOwnerAMemberAPendingInvitee_AndAFullGroup()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var invitee = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member);

        Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats));
        Assert.False(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats));
        Assert.False(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(member, Now), Seats));
        Assert.False(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(owner, Now), Seats));
        Assert.False(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(NewUserId(), Now), maxSeats: 3));
        Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(NewUserId(), Now), maxSeats: 4));
        Assert.False(await Groups.AddInvitationAsync("nope", new FriendGroupInvitation(NewUserId(), Now), Seats));

        Assert.Equal(2, (await Groups.FindAsync(group.Id))!.Invitations.Count);
    }

    [Fact]
    public async Task AddInvitation_ALapsedInvitation_HoldsNoSeat_AndCanBeSentAgain()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Lapsed), Seats));
        foreach (var unanswered in Enumerable.Range(0, Seats - 2).Select(_ => NewUserId()))
            Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(unanswered, Lapsed), Seats));

        Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats));
        Assert.False(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats));
        Assert.True(await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(NewUserId(), Now), Seats));

        var stored = (await Groups.FindAsync(group.Id))!;
        Assert.Equal(Now, Assert.Single(stored.Invitations, invitation => invitation.UserId == invitee).InvitedAt);
        Assert.Equal(Seats, stored.Invitations.Count);
    }

    [Fact]
    public async Task AcceptInvitation_OfALapsedInvitation_IsRefused()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Lapsed), Seats);

        Assert.False(await Groups.AcceptInvitationAsync(group.Id, new FriendGroupMember(invitee, Now)));

        Assert.Empty((await Groups.FindAsync(group.Id))!.Members);
    }

    [Fact]
    public async Task AcceptInvitation_MovesTheInviteeToTheMembers_Once()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats);

        Assert.True(await Groups.AcceptInvitationAsync(group.Id, new FriendGroupMember(invitee, Now.AddHours(1))));
        Assert.False(await Groups.AcceptInvitationAsync(group.Id, new FriendGroupMember(invitee, Now.AddHours(2))));
        Assert.False(await Groups.AcceptInvitationAsync(group.Id, new FriendGroupMember(NewUserId(), Now)));

        var stored = (await Groups.FindAsync(group.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal([new FriendGroupMember(invitee, Now.AddHours(1))], stored.Members);
    }

    [Fact]
    public async Task RemoveInvitationAndRemoveMember_TouchOnlyThatPerson()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var other = NewUserId();
        var invitee = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member, other);
        await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), Seats);

        Assert.False(await Groups.RemoveInvitationAsync(group.Id, member));
        Assert.True(await Groups.RemoveInvitationAsync(group.Id, invitee));
        Assert.False(await Groups.RemoveInvitationAsync(group.Id, invitee));
        Assert.True(await Groups.RemoveMemberAsync(group.Id, member, disableInviteLink: true));
        Assert.False(await Groups.RemoveMemberAsync(group.Id, member, disableInviteLink: true));
        Assert.False(await Groups.RemoveMemberAsync(group.Id, owner, disableInviteLink: true));

        var stored = (await Groups.FindAsync(group.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal([other], stored.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task RemoveMember_DisablesTheInviteLink_SoTheRemovedMemberCannotComeBackThroughIt()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member);
        var link = NewLink();
        await Groups.SetInviteLinkAsync(owner, group.Id, link);

        Assert.False(await Groups.RemoveMemberAsync(group.Id, NewUserId(), disableInviteLink: true));
        Assert.Equal(link, (await Groups.FindAsync(group.Id))!.InviteLink);
        Assert.True(await Groups.RemoveMemberAsync(group.Id, member, disableInviteLink: true));

        Assert.Equal(link with { Disabled = true }, (await Groups.FindAsync(group.Id))!.InviteLink);
        Assert.False(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(member, Now), Now, Seats));
        Assert.Empty((await Groups.FindAsync(group.Id))!.Members);
    }

    [Fact]
    public async Task RemoveMember_ForAMemberLeaving_KeepsTheInviteLinkActive()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member);
        var link = NewLink();
        await Groups.SetInviteLinkAsync(owner, group.Id, link);

        Assert.True(await Groups.RemoveMemberAsync(group.Id, member, disableInviteLink: false));

        var stored = (await Groups.FindAsync(group.Id))!;
        Assert.Equal(link, stored.InviteLink);
        Assert.Empty(stored.Members);
    }

    [Fact]
    public async Task RemoveMember_OfAGroupWithoutInviteLink_CreatesNone()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var group = await SharedAsync(owner, "Partagé", member);

        Assert.True(await Groups.RemoveMemberAsync(group.Id, member, disableInviteLink: true));

        var stored = (await Groups.FindAsync(group.Id))!;
        Assert.Null(stored.InviteLink);
        Assert.Empty(stored.Members);
    }

    [Fact]
    public async Task InviteLink_IsReplacedOnDemand_FoundByItsToken_AndDisabledInPlace()
    {
        var owner = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        var first = NewLink();
        var second = NewLink(days: 8);

        Assert.True(await Groups.SetInviteLinkAsync(owner, group.Id, first));
        Assert.True(await Groups.SetInviteLinkAsync(owner, group.Id, second));

        Assert.Null(await Groups.FindByInviteTokenAsync(first.Token));
        Assert.Equal(group.Id, (await Groups.FindByInviteTokenAsync(second.Token))!.Id);
        Assert.Equal(second, (await Groups.FindAsync(group.Id))!.InviteLink);

        Assert.True(await Groups.DisableInviteLinkAsync(owner, group.Id));
        Assert.Equal(second with { Disabled = true }, (await Groups.FindAsync(group.Id))!.InviteLink);
    }

    [Fact]
    public async Task JoinByInviteToken_AddsAMember_OnlyThroughAnActiveToken()
    {
        var owner = NewUserId();
        var joiner = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        var link = NewLink();
        await Groups.SetInviteLinkAsync(owner, group.Id, link);

        Assert.False(await Groups.JoinByInviteTokenAsync("unknown", new FriendGroupMember(joiner, Now), Now, Seats));
        Assert.False(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(joiner, Now), Now.AddDays(7), Seats));
        Assert.False(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(owner, Now), Now, Seats));
        Assert.True(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(joiner, Now), Now, Seats));
        Assert.False(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(joiner, Now), Now, Seats));

        await Groups.DisableInviteLinkAsync(owner, group.Id);
        Assert.False(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(NewUserId(), Now), Now, Seats));

        Assert.Equal([joiner], (await Groups.FindAsync(group.Id))!.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task JoinByInviteToken_AFullGroup_StillTakesThePersonItInvited()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        var link = NewLink();
        await Groups.SetInviteLinkAsync(owner, group.Id, link);
        await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(invitee, Now), maxSeats: 2);

        Assert.False(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(NewUserId(), Now), Now, maxSeats: 2));
        Assert.True(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(invitee, Now), Now, maxSeats: 2));

        var stored = (await Groups.FindAsync(group.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal([invitee], stored.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task JoinByInviteToken_LapsedInvitationsHoldNoSeat()
    {
        var owner = NewUserId();
        var group = await CreateAsync(owner, "Partagé");
        var link = NewLink();
        await Groups.SetInviteLinkAsync(owner, group.Id, link);
        await Groups.AddInvitationAsync(group.Id, new FriendGroupInvitation(NewUserId(), Lapsed), maxSeats: 2);
        var newcomer = NewUserId();

        Assert.True(await Groups.JoinByInviteTokenAsync(link.Token, new FriendGroupMember(newcomer, Now), Now, maxSeats: 2));

        Assert.Equal([newcomer], (await Groups.FindAsync(group.Id))!.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task OwnedJoinedInvitingAndPendingIds_DescribeWhereAUserStands()
    {
        var me = NewUserId();
        var lea = NewUserId();
        var own = await CreateAsync(me, "Le mien");
        var joined = await SharedAsync(lea, "Rejoint", me);
        var inviting = await CreateAsync(lea, "En attente");
        var unrelated = await CreateAsync(lea, "Sans moi");
        var lapsed = await CreateAsync(lea, "Oublié", Now.AddHours(-1));
        await Groups.AddInvitationAsync(inviting.Id, new FriendGroupInvitation(me, Now), Seats);
        await Groups.AddInvitationAsync(lapsed.Id, new FriendGroupInvitation(me, Lapsed), Seats);

        Assert.Equal([own.Id], (await Groups.ListByOwnerAsync(me)).Select(group => group.Id));
        Assert.Equal([joined.Id], (await Groups.ListJoinedAsync(me)).Select(group => group.Id));
        Assert.Equal([inviting.Id, lapsed.Id], (await Groups.ListInvitingAsync(me)).Select(group => group.Id));
        Assert.Equal(
            [inviting.Id],
            await Groups.ListPendingInvitationIdsAsync(me, [joined.Id, inviting.Id, unrelated.Id, lapsed.Id, "nope"], Now));
        Assert.Empty(await Groups.ListPendingInvitationIdsAsync(me, [], Now));
    }

    [Fact]
    public async Task DeleteAllForOwner_DropsOnlyTheirGroups()
    {
        var leaving = NewUserId();
        var lea = NewUserId();
        await CreateAsync(leaving, "Un");
        await CreateAsync(leaving, "Deux");
        var kept = await SharedAsync(lea, "Celui de Léa", leaving);

        Assert.Equal(2, await Groups.DeleteAllForOwnerAsync(leaving));

        Assert.Empty(await Groups.ListByOwnerAsync(leaving));
        Assert.NotNull(await Groups.FindAsync(kept.Id));
    }

    [Fact]
    public async Task RemoveFromOthersGroups_DropsTheMembershipsAndInvitations()
    {
        var leaving = NewUserId();
        var lea = NewUserId();
        var sam = NewUserId();
        var joined = await SharedAsync(lea, "Rejoint", leaving, sam);
        var inviting = await CreateAsync(lea, "En attente");
        await Groups.AddInvitationAsync(inviting.Id, new FriendGroupInvitation(leaving, Now), Seats);
        var own = await CreateAsync(leaving, "Le sien");

        Assert.Equal(2, await Groups.RemoveFromOthersGroupsAsync(leaving));

        Assert.Equal([sam], (await Groups.FindAsync(joined.Id))!.Members.Select(m => m.UserId));
        Assert.Empty((await Groups.FindAsync(inviting.Id))!.Invitations);
        Assert.NotNull(await Groups.FindAsync(own.Id));
    }
}
