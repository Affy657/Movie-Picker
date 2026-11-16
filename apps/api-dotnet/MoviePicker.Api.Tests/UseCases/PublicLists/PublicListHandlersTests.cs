using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.PublicLists.PublicListsTestKit;

namespace MoviePicker.Api.Tests.UseCases.PublicLists;

public sealed class PublicListHandlersTests
{
    private readonly PublicListsTestKit _kit = new();

    private Task<PublicListsResponse> ListAsync(string handle = CreatorHandle, string? viewerId = null) =>
        _kit.Saved.ListPublicHandler().HandleAsync(handle, viewerId);

    private Task<PublicListResponse> GetAsync(string listId, string handle = CreatorHandle, string? viewerId = null) =>
        _kit.Saved.GetPublicHandler().HandleAsync(handle, listId, viewerId);

    private Task<MovieListResponse> CopyAsync(string listId, string name, string handle = CreatorHandle, string userId = Viewer) =>
        _kit.Saved.CopyPublicHandler().HandleAsync(userId, handle, listId, new CopySavedListRequest { Name = name });

    [Fact]
    public async Task List_AnswersOnlyThePublicListsOfTheMember_LatestFirst_WithoutAnythingPrivate()
    {
        await _kit.PeopleAsync();
        var older = await _kit.ListAsync("Ciné coréen", tmdbIds: [496243, 670]);
        await _kit.ListAsync("Pour plus tard", isPublic: false, tmdbIds: [438631]);
        var newer = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426, 567, 213]);
        await _kit.Lists.ShareAsync(newer.Id, Member);
        await _kit.ListAsync("Celle de Sam", owner: Member, tmdbIds: [550]);

        var lists = (await ListAsync()).Items;

        Assert.Equal([newer.Id, older.Id], lists.Select(list => list.Id));
        var hitchcock = lists[0];
        Assert.Equal(
            ("Hitchcock", "À propos de Hitchcock", 4, 2, (int?)null),
            (hitchcock.Name, hitchcock.Description, hitchcock.ItemCount, hitchcock.MemberCount, hitchcock.WatchedCount));
        Assert.Equal(
            [StoredPoster(213), StoredPoster(567), StoredPoster(426)],
            hitchcock.PosterPaths);
        Assert.True(hitchcock.UpdatedAt > hitchcock.CreatedAt);
    }

    [Fact]
    public async Task List_CountsTheFilmsTheViewerWatched_OnEachList()
    {
        await _kit.PeopleAsync();
        await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426, 567]);
        await _kit.Lists.WatchElsewhereAsync(426, owner: Viewer);
        await _kit.Lists.WatchElsewhereAsync(539, owner: Creator);

        var seenByTheViewer = Assert.Single((await ListAsync(viewerId: Viewer)).Items);
        var seenByTheCreator = Assert.Single((await ListAsync(viewerId: Creator)).Items);

        Assert.Equal(1, seenByTheViewer.WatchedCount);
        Assert.Equal(1, seenByTheCreator.WatchedCount);
    }

    [Fact]
    public async Task List_OfAMemberWithoutPublicList_IsEmpty()
    {
        await _kit.PeopleAsync();
        await _kit.ListAsync("Pour plus tard", isPublic: false);

        Assert.Empty((await ListAsync(viewerId: Viewer)).Items);
    }

    [Theory]
    [InlineData(CreatorHandle, false)]
    [InlineData("personne", true)]
    public async Task List_OfAPrivateProfileOrAnUnknownHandle_IsNotFound(string handle, bool creatorProfileIsPublic)
    {
        await _kit.PeopleAsync(creatorProfileIsPublic);
        await _kit.ListAsync("Hitchcock", tmdbIds: [539]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => ListAsync(handle, Creator));

        Assert.Equal(ErrorCodes.ProfileNotFound, ex.Reason);
    }

    [Fact]
    public async Task Get_AnswersTheFilmsInTheOrderTheyWereAdded_WithTheCreator_AndNoMemberIdentity()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [567, 539]);
        await _kit.Lists.ShareAsync(created.Id, Member);
        await _kit.Lists.AddAsync(created.Id, MovieListTestKit.Title(426), Member);

        var list = await GetAsync(created.Id);

        Assert.Equal(
            (created.Id, "Hitchcock", "À propos de Hitchcock", 3, 2, (int?)null, (MovieListRole?)null),
            (list.Id, list.Name, list.Description, list.ItemCount, list.MemberCount, list.WatchedCount, list.ViewerRole));
        Assert.Equal((CreatorHandle, "Léa", "avatar-owner-1"), (list.Creator.Handle, list.Creator.DisplayName, list.Creator.AvatarId));
        Assert.Equal([567, 539, 426], list.Items.Select(item => item.TmdbId));
        Assert.All(list.Items, item => Assert.Null(item.AddedBy));
        Assert.All(list.Items, item => Assert.False(item.IsWatched));
    }

    [Theory]
    [InlineData(Creator, MovieListRole.Owner)]
    [InlineData(Member, MovieListRole.Member)]
    [InlineData(Viewer, null)]
    public async Task Get_TellsTheViewerTheirRole_AndWhatTheyWatched(string viewerId, MovieListRole? expectedRole)
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [567, 539]);
        await _kit.Lists.ShareAsync(created.Id, Member);
        await _kit.Lists.WatchElsewhereAsync(539, owner: viewerId);

        var list = await GetAsync(created.Id, viewerId: viewerId);

        Assert.Equal(expectedRole, list.ViewerRole);
        Assert.Equal(1, list.WatchedCount);
        Assert.Equal([false, true], list.Items.Select(item => item.IsWatched));
    }

    [Fact]
    public async Task Get_APrivateList_IsNotFound_EvenForItsCreator()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Pour plus tard", isPublic: false, tmdbIds: [438631]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => GetAsync(created.Id, viewerId: Creator));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task Get_APublicListUnderTheHandleOfSomeoneElse_IsNotFound()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Celle de Sam", owner: Member, tmdbIds: [550]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => GetAsync(created.Id));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task Get_AnUnknownList_IsNotFound()
    {
        await _kit.PeopleAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => GetAsync("unknown"));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task Get_APublicListOfAPrivateProfile_IsNotFound()
    {
        await _kit.PeopleAsync(creatorProfileIsPublic: false);
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => GetAsync(created.Id, viewerId: Creator));

        Assert.Equal(ErrorCodes.ProfileNotFound, ex.Reason);
    }

    [Fact]
    public async Task Copy_CreatesAPrivateListOfTheViewer_WithTheFilmsInTheirOrder_AndNothingOfTheMembers()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [567, 539]);
        await _kit.Lists.ShareAsync(created.Id, Member);
        await _kit.Lists.AddAsync(created.Id, MovieListTestKit.Title(426), Member);
        await _kit.Lists.WatchElsewhereAsync(539, owner: Viewer);
        _kit.Lists.Clock.Advance(TimeSpan.FromHours(1));

        var copy = await CopyAsync(created.Id, "  Mon Hitchcock  ");

        Assert.Equal(("Mon Hitchcock", (string?)null, false, MovieListRole.Owner, 1), (copy.Name, copy.Description, copy.IsPublic, copy.Role, copy.MemberCount));
        Assert.Equal([567, 539, 426], copy.Items.Select(item => item.TmdbId));
        Assert.Equal([false, true, false], copy.Items.Select(item => item.IsWatched));
        Assert.All(copy.Items, item => Assert.Equal(_kit.Lists.Clock.Now, item.CreatedAt));
        var stored = (await _kit.Lists.Lists.GetAsync(Viewer, copy.Id))!;
        Assert.All(stored.Items, item => Assert.Null(item.AddedByUserId));
        Assert.Equal(StoredPoster(567), stored.Items[0].PosterPath);
        Assert.Equal(3, (await _kit.Lists.Lists.FindAsync(created.Id))!.Items.Count);
    }

    [Fact]
    public async Task Copy_FollowsTheRulesOfCreatedLists()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        await _kit.ListAsync("Mon Hitchcock", owner: Viewer);

        var taken = await Assert.ThrowsAsync<ConflictException>(() => CopyAsync(created.Id, "mon HITCHCOCK"));
        var blank = await Assert.ThrowsAsync<BadRequestException>(() => CopyAsync(created.Id, "   "));

        Assert.Equal(ErrorCodes.ListNameTaken, taken.Reason);
        Assert.Equal(ErrorCodes.ValidationFailed, blank.Reason);
    }

    [Fact]
    public async Task Copy_OnceTheViewerHasAsManyListsAsAllowed_IsRefused()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        for (var index = 0; index < MovieList.MaxPerOwner; index++)
            await _kit.ListAsync($"Liste {index}", isPublic: false, owner: Viewer);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => CopyAsync(created.Id, "Mon Hitchcock"));

        Assert.Equal(ErrorCodes.ListLimitReached, ex.Reason);
    }

    [Fact]
    public async Task Copy_OfAPrivateList_IsNotFound_AndCreatesNothing()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Pour plus tard", isPublic: false, tmdbIds: [438631]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => CopyAsync(created.Id, "Volée"));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
        Assert.Equal(0, await _kit.Lists.Lists.CountByOwnerAsync(Viewer));
    }

    [Fact]
    public async Task Copy_OfItsOwnPublicList_IsADuplicate()
    {
        await _kit.PeopleAsync();
        var created = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);

        var copy = await CopyAsync(created.Id, "Hitchcock bis", userId: Creator);

        Assert.Equal([539, 426], copy.Items.Select(item => item.TmdbId));
        Assert.Equal(2, await _kit.Lists.Lists.CountByOwnerAsync(Creator));
    }
}
