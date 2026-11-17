using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence;

public abstract class MovieListMembershipContract
{
    protected static readonly DateTimeOffset Now = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    private static readonly DateTimeOffset Lapsed = Now.AddDays(-90);

    private const int Seats = MovieList.MaxMembers;

    protected abstract IMovieListRepository Lists { get; }

    protected static string NewUserId() => Guid.NewGuid().ToString("N")[..24];

    private Task<MovieList> CreateAsync(string owner, string name, DateTimeOffset? updatedAt = null, params MovieListItem[] items) =>
        Lists.AddAsync(new MovieList
        {
            OwnerId = owner,
            Name = name,
            Items = items,
            CreatedAt = Now,
            UpdatedAt = updatedAt ?? Now
        });

    private static MovieListItem Item(int tmdbId, string? addedBy = null) => new()
    {
        TmdbId = tmdbId,
        Title = $"Film {tmdbId}",
        Year = "1999",
        AddedAt = Now.AddMinutes(tmdbId),
        AddedByUserId = addedBy
    };

    private async Task<MovieList> SharedAsync(string owner, string name, params string[] members)
    {
        var list = await CreateAsync(owner, name);
        foreach (var member in members)
        {
            Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(member, Now), Seats));
            Assert.True(await Lists.AcceptInvitationAsync(list.Id, new MovieListMember(member, Now.AddMinutes(1))));
        }

        return (await Lists.FindAsync(list.Id))!;
    }

    [Fact]
    public async Task ListSummaries_HoldTheOwnedAndTheJoinedLists_ButNotThoseOnlyInvitedTo()
    {
        var me = NewUserId();
        var lea = NewUserId();
        var sam = NewUserId();
        var mine = await CreateAsync(me, "Mes films", Now.AddHours(1));
        var leas = await SharedAsync(lea, "Liste de Léa", me, sam);
        await Lists.AddItemAsync(lea, leas.Id, Item(603), MovieList.MaxItems);
        var sams = await CreateAsync(sam, "Liste de Sam");
        await Lists.AddInvitationAsync(sams.Id, new MovieListInvitation(me, Now), Seats);

        var summaries = await Lists.ListSummariesAsync(me);

        Assert.Equal([leas.Id, mine.Id], summaries.Select(summary => summary.Id));
        var joined = summaries[0];
        Assert.Equal(lea, joined.OwnerId);
        Assert.Equal(3, joined.MemberCount);
        Assert.Equal([lea, me, sam], joined.PreviewMemberIds);
        Assert.Equal([new MovieListTitle(603, MovieMediaType.Movie)], joined.Titles);
        Assert.Equal(1, summaries[1].MemberCount);
        Assert.Equal([me], summaries[1].PreviewMemberIds);
    }

    [Fact]
    public async Task Get_AdmitsTheOwnerAndTheMembers_WhileFindIgnoresWhoAsks()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var invitee = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);
        await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats);

        Assert.NotNull(await Lists.GetAsync(owner, list.Id));
        var seen = await Lists.GetAsync(member, list.Id);
        Assert.Equal(member, Assert.Single(seen!.Members).UserId);
        Assert.Equal(Now.AddMinutes(1), seen.Members[0].JoinedAt);
        Assert.Equal(invitee, Assert.Single(seen.Invitations).UserId);
        Assert.Null(await Lists.GetAsync(invitee, list.Id));
        Assert.Null(await Lists.GetAsync(NewUserId(), list.Id));
        Assert.Equal(list.Id, (await Lists.FindAsync(list.Id))!.Id);
        Assert.Null(await Lists.FindAsync("nope"));
    }

    [Fact]
    public async Task Items_AMemberAddsAndRemovesThem_WithTheirAuthor_AStrangerTouchesNothing()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var stranger = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);

        Assert.True(await Lists.AddItemAsync(member, list.Id, Item(603, member), MovieList.MaxItems));
        Assert.True(await Lists.AddItemAsync(owner, list.Id, Item(680, owner), MovieList.MaxItems));
        Assert.False(await Lists.AddItemAsync(stranger, list.Id, Item(550, stranger), MovieList.MaxItems));
        Assert.False(await Lists.RemoveItemAsync(stranger, list.Id, new MovieListTitle(603, MovieMediaType.Movie), Now));
        Assert.True(await Lists.RemoveItemAsync(member, list.Id, new MovieListTitle(680, MovieMediaType.Movie), Now));

        var stored = (await Lists.FindAsync(list.Id))!;
        var item = Assert.Single(stored.Items);
        Assert.Equal(603, item.TmdbId);
        Assert.Equal(member, item.AddedByUserId);
    }

    [Fact]
    public async Task OwnerOnlyWrites_IgnoreAMember()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);
        var link = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);

        Assert.Null(await Lists.UpdateDetailsAsync(member, list.Id, "Volée", null, isPublic: true, Now));
        Assert.False(await Lists.SetInviteLinkAsync(member, list.Id, link));
        Assert.False(await Lists.DisableInviteLinkAsync(member, list.Id));
        Assert.False(await Lists.DeleteAsync(member, list.Id));

        var kept = (await Lists.FindAsync(list.Id))!;
        Assert.Equal("Partagée", kept.Name);
        Assert.Null(kept.InviteLink);
    }

    [Fact]
    public async Task AddInvitation_RefusesTheOwnerAMemberAPendingInvitee_AndAFullList()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var invitee = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);

        Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats));
        Assert.False(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats));
        Assert.False(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(member, Now), Seats));
        Assert.False(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(owner, Now), Seats));
        Assert.False(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(NewUserId(), Now), maxSeats: 3));
        Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(NewUserId(), Now), maxSeats: 4));
        Assert.False(await Lists.AddInvitationAsync("nope", new MovieListInvitation(NewUserId(), Now), Seats));

        Assert.Equal(2, (await Lists.FindAsync(list.Id))!.Invitations.Count);
    }

    [Fact]
    public async Task AddInvitation_ALapsedInvitation_HoldsNoSeat_AndCanBeSentAgain()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Lapsed), Seats));
        foreach (var unanswered in Enumerable.Range(0, Seats - 2).Select(_ => NewUserId()))
            Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(unanswered, Lapsed), Seats));

        Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats));
        Assert.False(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats));
        Assert.True(await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(NewUserId(), Now), Seats));

        var stored = (await Lists.FindAsync(list.Id))!;
        Assert.Equal(Now, Assert.Single(stored.Invitations, invitation => invitation.UserId == invitee).InvitedAt);
        Assert.Equal(Seats, stored.Invitations.Count);
    }

    [Fact]
    public async Task AcceptInvitation_OfALapsedInvitation_IsRefused()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Lapsed), Seats);

        Assert.False(await Lists.AcceptInvitationAsync(list.Id, new MovieListMember(invitee, Now)));

        Assert.Empty((await Lists.FindAsync(list.Id))!.Members);
    }

    [Fact]
    public async Task JoinByInviteToken_LapsedInvitationsHoldNoSeat()
    {
        var owner = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        var link = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);
        await Lists.SetInviteLinkAsync(owner, list.Id, link);
        await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(NewUserId(), Lapsed), maxSeats: 2);
        var newcomer = NewUserId();

        Assert.True(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(newcomer, Now), Now, maxSeats: 2));

        Assert.Equal([newcomer], (await Lists.FindAsync(list.Id))!.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task AcceptInvitation_MovesTheInviteeToTheMembers_Once()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats);

        Assert.True(await Lists.AcceptInvitationAsync(list.Id, new MovieListMember(invitee, Now.AddHours(1))));
        Assert.False(await Lists.AcceptInvitationAsync(list.Id, new MovieListMember(invitee, Now.AddHours(2))));
        Assert.False(await Lists.AcceptInvitationAsync(list.Id, new MovieListMember(NewUserId(), Now)));

        var stored = (await Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal([new MovieListMember(invitee, Now.AddHours(1))], stored.Members);
    }

    [Fact]
    public async Task RemoveInvitationAndRemoveMember_TouchOnlyThatPerson()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var other = NewUserId();
        var invitee = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member, other);
        await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), Seats);

        Assert.False(await Lists.RemoveInvitationAsync(list.Id, member));
        Assert.True(await Lists.RemoveInvitationAsync(list.Id, invitee));
        Assert.False(await Lists.RemoveInvitationAsync(list.Id, invitee));
        Assert.True(await Lists.RemoveMemberAsync(list.Id, member, disableInviteLink: true));
        Assert.False(await Lists.RemoveMemberAsync(list.Id, member, disableInviteLink: true));
        Assert.False(await Lists.RemoveMemberAsync(list.Id, owner, disableInviteLink: true));

        var stored = (await Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal([other], stored.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task RemoveMember_DisablesTheInviteLink_SoTheRemovedMemberCannotComeBackThroughIt()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);
        var link = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);
        await Lists.SetInviteLinkAsync(owner, list.Id, link);

        Assert.False(await Lists.RemoveMemberAsync(list.Id, NewUserId(), disableInviteLink: true));
        Assert.Equal(link, (await Lists.FindAsync(list.Id))!.InviteLink);
        Assert.True(await Lists.RemoveMemberAsync(list.Id, member, disableInviteLink: true));

        Assert.Equal(link with { Disabled = true }, (await Lists.FindAsync(list.Id))!.InviteLink);
        Assert.False(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(member, Now), Now, Seats));
        Assert.Empty((await Lists.FindAsync(list.Id))!.Members);
    }

    [Fact]
    public async Task RemoveMember_ForAMemberLeaving_KeepsTheInviteLinkActive()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);
        var link = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);
        await Lists.SetInviteLinkAsync(owner, list.Id, link);

        Assert.True(await Lists.RemoveMemberAsync(list.Id, member, disableInviteLink: false));

        var stored = (await Lists.FindAsync(list.Id))!;
        Assert.Equal(link, stored.InviteLink);
        Assert.Empty(stored.Members);
    }

    [Fact]
    public async Task RemoveMember_OfAListWithoutInviteLink_CreatesNone()
    {
        var owner = NewUserId();
        var member = NewUserId();
        var list = await SharedAsync(owner, "Partagée", member);

        Assert.True(await Lists.RemoveMemberAsync(list.Id, member, disableInviteLink: true));

        var stored = (await Lists.FindAsync(list.Id))!;
        Assert.Null(stored.InviteLink);
        Assert.Empty(stored.Members);
    }

    [Fact]
    public async Task ListByIds_ReturnsTheKnownLists_WhoeverOwnsThem()
    {
        var lea = NewUserId();
        var sam = NewUserId();
        var first = await CreateAsync(lea, "Première");
        var second = await CreateAsync(sam, "Seconde");
        await CreateAsync(lea, "Pas demandée");

        var found = await Lists.ListByIdsAsync([first.Id, second.Id, "nope", first.Id]);

        Assert.Equal(
            new[] { first.Id, second.Id }.Order(StringComparer.Ordinal),
            found.Select(list => list.Id).Order(StringComparer.Ordinal));
        Assert.Empty(await Lists.ListByIdsAsync([]));
    }

    [Fact]
    public async Task InviteLink_IsReplacedOnDemand_FoundByItsToken_AndDisabledInPlace()
    {
        var owner = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        var first = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);
        var second = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(8), Disabled: false);

        Assert.True(await Lists.SetInviteLinkAsync(owner, list.Id, first));
        Assert.True(await Lists.SetInviteLinkAsync(owner, list.Id, second));

        Assert.Null(await Lists.FindByInviteTokenAsync(first.Token));
        Assert.Equal(list.Id, (await Lists.FindByInviteTokenAsync(second.Token))!.Id);
        Assert.Equal(second, (await Lists.FindAsync(list.Id))!.InviteLink);

        Assert.True(await Lists.DisableInviteLinkAsync(owner, list.Id));
        Assert.Equal(second with { Disabled = true }, (await Lists.FindAsync(list.Id))!.InviteLink);
    }

    [Fact]
    public async Task JoinByInviteToken_AddsAMember_OnlyThroughAnActiveToken()
    {
        var owner = NewUserId();
        var joiner = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        var link = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);
        await Lists.SetInviteLinkAsync(owner, list.Id, link);

        Assert.False(await Lists.JoinByInviteTokenAsync("unknown", new MovieListMember(joiner, Now), Now, Seats));
        Assert.False(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(joiner, Now), Now.AddDays(7), Seats));
        Assert.False(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(owner, Now), Now, Seats));
        Assert.True(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(joiner, Now), Now, Seats));
        Assert.False(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(joiner, Now), Now, Seats));

        await Lists.DisableInviteLinkAsync(owner, list.Id);
        Assert.False(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(NewUserId(), Now), Now, Seats));

        Assert.Equal([joiner], (await Lists.FindAsync(list.Id))!.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task JoinByInviteToken_AFullList_StillTakesThePersonItInvited()
    {
        var owner = NewUserId();
        var invitee = NewUserId();
        var list = await CreateAsync(owner, "Partagée");
        var link = new MovieListInviteLink(Guid.NewGuid().ToString("N"), Now.AddDays(7), Disabled: false);
        await Lists.SetInviteLinkAsync(owner, list.Id, link);
        await Lists.AddInvitationAsync(list.Id, new MovieListInvitation(invitee, Now), maxSeats: 2);

        Assert.False(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(NewUserId(), Now), Now, maxSeats: 2));
        Assert.True(await Lists.JoinByInviteTokenAsync(link.Token, new MovieListMember(invitee, Now), Now, maxSeats: 2));

        var stored = (await Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal([invitee], stored.Members.Select(m => m.UserId));
    }

    [Fact]
    public async Task JoinedInvitingAndPendingIds_DescribeWhereAUserStands()
    {
        var me = NewUserId();
        var lea = NewUserId();
        var joined = await SharedAsync(lea, "Rejointe", me);
        var inviting = await CreateAsync(lea, "En attente");
        var unrelated = await CreateAsync(lea, "Sans moi");
        var lapsed = await CreateAsync(lea, "Oubliée", Now.AddHours(-1));
        await Lists.AddInvitationAsync(inviting.Id, new MovieListInvitation(me, Now), Seats);
        await Lists.AddInvitationAsync(lapsed.Id, new MovieListInvitation(me, Lapsed), Seats);

        Assert.Equal([joined.Id], (await Lists.ListJoinedAsync(me)).Select(list => list.Id));
        Assert.Equal([inviting.Id, lapsed.Id], (await Lists.ListInvitingAsync(me)).Select(list => list.Id));
        Assert.Equal(
            [inviting.Id],
            await Lists.ListPendingInvitationIdsAsync(me, [joined.Id, inviting.Id, unrelated.Id, lapsed.Id, "nope"], Now));
        Assert.Empty(await Lists.ListPendingInvitationIdsAsync(me, [], Now));
    }

    [Fact]
    public async Task RemoveFromOthersLists_DropsTheMembershipsAndInvitations_ButKeepsTheirItems()
    {
        var leaving = NewUserId();
        var lea = NewUserId();
        var joined = await SharedAsync(lea, "Rejointe", leaving);
        await Lists.AddItemAsync(leaving, joined.Id, Item(603, leaving), MovieList.MaxItems);
        var inviting = await CreateAsync(lea, "En attente");
        await Lists.AddInvitationAsync(inviting.Id, new MovieListInvitation(leaving, Now), Seats);
        var own = await CreateAsync(leaving, "La sienne");

        Assert.Equal(2, await Lists.RemoveFromOthersListsAsync(leaving));

        var kept = (await Lists.FindAsync(joined.Id))!;
        Assert.Empty(kept.Members);
        Assert.Equal(leaving, Assert.Single(kept.Items).AddedByUserId);
        Assert.Empty((await Lists.FindAsync(inviting.Id))!.Invitations);
        Assert.NotNull(await Lists.FindAsync(own.Id));
    }
}
