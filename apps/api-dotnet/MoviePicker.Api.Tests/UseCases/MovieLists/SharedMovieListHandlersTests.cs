using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class SharedMovieListHandlersTests
{
    private readonly MovieListTestKit _kit = new();

    private async Task<MovieListSummaryResponse> SharedListAsync(params string[] members)
    {
        await _kit.PersonAsync(Owner, "Léa");
        await _kit.PersonAsync(Member, "Sam");
        await _kit.PersonAsync(Invitee, "Zoé");
        await _kit.PersonAsync(Stranger, "Intrus");
        var list = await _kit.CreateAsync("Halloween");
        await _kit.ShareAsync(list.Id, members.Length == 0 ? [Member] : members);
        return list;
    }

    [Fact]
    public async Task List_ShowsTheJoinedLists_AsAMember_WithTheirOwnerAndFirstMembers()
    {
        var shared = await SharedListAsync();
        await _kit.CreateAsync("Mes films", owner: Member);
        var other = await _kit.CreateAsync("Sans Sam", owner: Stranger);
        await _kit.InviteAsync(other.Id, Member);

        var lists = (await _kit.ListHandler().HandleAsync(Member, null)).Items;

        Assert.Equal(["Halloween", "Mes films"], lists.Select(list => list.Name).Order(StringComparer.Ordinal));
        var joined = lists.Single(list => list.Id == shared.Id);
        Assert.Equal(MovieListRole.Member, joined.Role);
        Assert.Equal((Owner, "Léa", "owner1", "avatar-owner-1"), (joined.Owner.UserId, joined.Owner.DisplayName, joined.Owner.Handle, joined.Owner.AvatarId));
        Assert.Equal(2, joined.MemberCount);
        Assert.Equal(["Léa", "Sam"], joined.MemberPreview.Select(person => person.DisplayName));
        var own = lists.Single(list => list.Name == "Mes films");
        Assert.Equal(MovieListRole.Owner, own.Role);
        Assert.Equal(1, own.MemberCount);
        Assert.Equal(["Sam"], own.MemberPreview.Select(person => person.DisplayName));
    }

    [Fact]
    public async Task List_ProbesTheJoinedListsToo_AndCountsWhatTheViewerWatched()
    {
        var shared = await SharedListAsync();
        await _kit.AddAsync(shared.Id, Title(603));
        await _kit.WatchElsewhereAsync(603, owner: Member);

        var joined = Assert.Single((await _kit.ListHandler().HandleAsync(Member, new MovieListTitle(603, MovieMediaType.Movie))).Items);
        var owned = Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null)).Items);

        Assert.True(joined.ContainsMovie);
        Assert.Equal(1, joined.WatchedCount);
        Assert.Equal(0, owned.WatchedCount);
    }

    [Fact]
    public async Task List_AMemberPreviewStopsAtThreePeople_AndHidesAPrivateHandle()
    {
        await _kit.PersonAsync("member-2", "Noé", isProfilePublic: false);
        await _kit.PersonAsync("member-3", "Ana");
        var shared = await SharedListAsync(Member, "member-2", "member-3");

        var summary = Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null)).Items);

        Assert.Equal(shared.Id, summary.Id);
        Assert.Equal(4, summary.MemberCount);
        Assert.Equal(["Léa", "Sam", "Noé"], summary.MemberPreview.Select(person => person.DisplayName));
        Assert.Null(summary.MemberPreview[2].Handle);
    }

    [Fact]
    public async Task Get_AMemberReadsTheList_WithTheAuthorOfEachItem()
    {
        var shared = await SharedListAsync();
        await _kit.Lists.AddItemAsync(Owner, shared.Id, new MovieListItem { TmdbId = 1, Title = "Sans auteur", AddedAt = Start }, MovieList.MaxItems);
        await _kit.AddAsync(shared.Id, Title(603), owner: Member);
        await _kit.AddAsync(shared.Id, Title(680), owner: Owner);

        var list = await _kit.GetHandler().HandleAsync(Member, shared.Id);

        Assert.Equal(MovieListRole.Member, list.Role);
        Assert.Equal("Léa", list.Owner.DisplayName);
        Assert.Equal(2, list.MemberCount);
        Assert.Equal(["Léa", "Sam", "Léa"], list.Items.Select(item => item.AddedBy!.DisplayName));
        Assert.Equal(Member, list.Items[1].AddedBy!.UserId);
    }

    [Fact]
    public async Task Get_AnItemByAnAuthorWhoIsGone_HasNoAuthor()
    {
        var shared = await SharedListAsync();
        await _kit.Lists.AddItemAsync(Owner, shared.Id, new MovieListItem { TmdbId = 1, Title = "Orphelin", AddedAt = Start, AddedByUserId = "gone-1" }, MovieList.MaxItems);

        var item = Assert.Single((await _kit.GetHandler().HandleAsync(Owner, shared.Id)).Items);

        Assert.Null(item.AddedBy);
    }

    [Theory]
    [InlineData(Invitee)]
    [InlineData(Stranger)]
    public async Task Get_SomeoneOutsideTheList_IsNotFound_EvenWhenInvited(string outsider)
    {
        var shared = await SharedListAsync();
        await _kit.InviteAsync(shared.Id, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.GetHandler().HandleAsync(outsider, shared.Id));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task AddItem_AMemberAddsATitle_SignedWithTheirName()
    {
        var shared = await SharedListAsync();

        var added = await _kit.AddAsync(shared.Id, Title(603), owner: Member);

        Assert.True(added.Created);
        Assert.Equal((Member, "Sam"), (added.Item.AddedBy!.UserId, added.Item.AddedBy.DisplayName));
        Assert.Equal(Member, (await _kit.Lists.FindAsync(shared.Id))!.Items.Single().AddedByUserId);
    }

    [Fact]
    public async Task AddItem_ATitleAnotherMemberAlreadyAdded_ReturnsItWithItsAuthor()
    {
        var shared = await SharedListAsync();
        await _kit.AddAsync(shared.Id, Title(603), owner: Owner);

        var again = await _kit.AddAsync(shared.Id, Title(603), owner: Member);

        Assert.False(again.Created);
        Assert.Equal("Léa", again.Item.AddedBy!.DisplayName);
        Assert.Single((await _kit.Lists.FindAsync(shared.Id))!.Items);
    }

    [Fact]
    public async Task AddItem_SomeoneOutsideTheList_IsNotFound()
    {
        var shared = await SharedListAsync();
        await _kit.InviteAsync(shared.Id, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.AddAsync(shared.Id, Title(603), owner: Invitee));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task RemoveItem_AMemberRemovesATitleSomeoneElseAdded()
    {
        var shared = await SharedListAsync();
        await _kit.AddAsync(shared.Id, Title(603), owner: Owner);

        await _kit.RemoveItemHandler().HandleAsync(Member, shared.Id, new MovieListTitle(603, MovieMediaType.Movie));

        Assert.Empty((await _kit.Lists.FindAsync(shared.Id))!.Items);
    }

    [Fact]
    public async Task Update_AMember_IsForbidden_AndAStrangerSeesNothing()
    {
        var shared = await SharedListAsync();
        var request = new UpdateMovieListRequest { Name = "Renommée" };

        var forbidden = await Assert.ThrowsAsync<ForbiddenException>(() => _kit.UpdateHandler().HandleAsync(Member, shared.Id, request));
        var hidden = await Assert.ThrowsAsync<NotFoundException>(() => _kit.UpdateHandler().HandleAsync(Stranger, shared.Id, request));

        Assert.Equal(ErrorCodes.ListOwnerOnly, forbidden.Reason);
        Assert.Equal(ErrorCodes.ListNotFound, hidden.Reason);
        Assert.Equal("Halloween", (await _kit.Lists.FindAsync(shared.Id))!.Name);
    }

    [Fact]
    public async Task Update_TheOwner_KeepsTheAudienceInTheAnswer()
    {
        var shared = await SharedListAsync();

        var updated = await _kit.UpdateHandler().HandleAsync(Owner, shared.Id, new UpdateMovieListRequest { Name = "Frissons" });

        Assert.Equal(MovieListRole.Owner, updated.Role);
        Assert.Equal(2, updated.MemberCount);
        Assert.Equal("Léa", updated.Owner.DisplayName);
    }

    [Fact]
    public async Task Create_AnswersWithTheCreatorAsOwnerAndOnlyMember()
    {
        await _kit.PersonAsync(Owner, "Léa");

        var created = await _kit.CreateAsync("Halloween", firstItem: Title(603));

        Assert.Equal(MovieListRole.Owner, created.Role);
        Assert.Equal(1, created.MemberCount);
        Assert.Equal(["Léa"], created.MemberPreview.Select(person => person.DisplayName));
        Assert.Equal(Owner, (await _kit.Lists.FindAsync(created.Id))!.Items.Single().AddedByUserId);
    }

    [Fact]
    public async Task Delete_AMember_IsForbidden_AndKeepsTheList()
    {
        var shared = await SharedListAsync();

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _kit.DeleteHandler().HandleAsync(Member, shared.Id));

        Assert.Equal(ErrorCodes.ListOwnerOnly, ex.Reason);
        Assert.NotNull(await _kit.Lists.FindAsync(shared.Id));
    }

    [Fact]
    public async Task Delete_TheOwner_RemovesItForTheMembers_AndDropsItsInvitationNotices()
    {
        var shared = await SharedListAsync();
        await _kit.Notifications.AddAsync(new UserNotification
        {
            UserId = Invitee,
            Type = UserNotificationType.ListInvitation,
            ListId = shared.Id,
            ListName = "Halloween",
            CreatedAt = Start
        });

        await _kit.DeleteHandler().HandleAsync(Owner, shared.Id);

        Assert.Empty((await _kit.ListHandler().HandleAsync(Member, null)).Items);
        Assert.Empty(await _kit.Notifications.ListByUserIdAsync(Invitee));
    }
}
