using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.PublicLists;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.PublicLists.PublicListsTestKit;

namespace MoviePicker.Api.Tests.UseCases.PublicLists;

public sealed class SavedMemberListTests
{
    private readonly PublicListsTestKit _kit = new();

    private Task<SavedListResponse> ReadAsync(string savedListId) =>
        _kit.Saved.GetHandler().HandleAsync(Viewer, savedListId);

    private async Task<SavedListSummaryResponse> ListedAsync(string savedListId) =>
        (await _kit.Saved.ListHandler().HandleAsync(Viewer, null, null)).Items.Single(list => list.Id == savedListId);

    private Task<MovieListResponse> CopyAsync(string savedListId, string name) =>
        _kit.Saved.CopyHandler().HandleAsync(Viewer, savedListId, new CopySavedListRequest { Name = name });

    private async Task<SavedList> StoredAsync(string savedListId) =>
        (await _kit.Saved.Saved.GetAsync(Viewer, savedListId))!;

    [Theory]
    [InlineData("memberList", "abc123", "abc123")]
    [InlineData("MEMBERLIST", " ABC123 ", "abc123")]
    public void Parse_AMemberList_KeepsItsIdInLowerCase(string type, string id, string expectedId)
    {
        Assert.Equal(new ListSource(ListSourceType.MemberList, expectedId), ListSourceReader.Parse(type, id));
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc-123")]
    [InlineData("../lists")]
    [InlineData("0123456789012345678901234567890123456789012345678901234567890123x")]
    public void Parse_AMemberListIdThatCannotBeOne_IsNotSavable(string id)
    {
        var ex = Assert.Throws<BadRequestException>(() => ListSourceReader.Parse("memberList", id));

        Assert.Equal(ErrorCodes.ListSourceNotSavable, ex.Reason);
    }

    [Fact]
    public async Task Save_ThePublicListOfAMember_FollowsItUnderItsName_WithItsCreator()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426, 567]);
        await _kit.Lists.WatchElsewhereAsync(426, owner: Viewer);

        var saved = await _kit.SaveAsync(list.Id);

        Assert.Equal(
            (ListSourceType.MemberList, list.Id, "Hitchcock", "À propos de Hitchcock", 3, 1, false, (ListSourceUnavailableReason?)null),
            (saved.SourceType, saved.SourceId, saved.Name, saved.Description, saved.ItemCount, saved.WatchedCount, saved.Unavailable, saved.UnavailableReason));
        Assert.Equal((CreatorHandle, "Léa", "avatar-owner-1"), (saved.Creator!.Handle, saved.Creator.DisplayName, saved.Creator.AvatarId));
        Assert.Equal([StoredPoster(567), StoredPoster(426), StoredPoster(539)], saved.PosterPaths);
        Assert.True(saved.CopyAvailable);
        var stored = await StoredAsync(saved.Id);
        Assert.Empty(stored.Snapshot);
        Assert.Equal(Creator, stored.SourceOwnerId);
    }

    [Fact]
    public async Task ReadingTheDetail_KeepsTheFilmsTheViewerSaw()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426, 567]);
        var saved = await _kit.SaveAsync(list.Id);

        var detail = await ReadAsync(saved.Id);

        Assert.True(detail.CopyAvailable);
        var stored = await StoredAsync(saved.Id);
        Assert.Equal([539, 426, 567], stored.Snapshot.Select(title => title.TmdbId));
        Assert.Equal(("Film 539", "1999", StoredPoster(539)), (stored.Snapshot[0].Title, stored.Snapshot[0].Year, stored.Snapshot[0].PosterPath));
    }

    [Fact]
    public async Task Save_TheSameListAgain_AnswersTheFirstSave()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var first = await _kit.SaveAsync(list.Id);

        var again = await _kit.Saved.SaveHandler().HandleAsync(Viewer, SavedListTestKitRequest(list.Id));

        Assert.False(again.Created);
        Assert.Equal(first.Id, again.Summary.Id);
    }

    [Theory]
    [InlineData(Creator)]
    [InlineData(Member)]
    public async Task Save_ItsOwnListOrAListItBelongsTo_IsRefused(string userId)
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        await _kit.Lists.ShareAsync(list.Id, Member);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.SaveAsync(list.Id, userId));

        Assert.Equal(ErrorCodes.ListAlreadyYours, ex.Reason);
        Assert.Empty(await _kit.Saved.Saved.ListByOwnerAsync(userId));
    }

    [Fact]
    public async Task Save_ItsOwnPrivateList_IsRefusedAsItsOwn()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Pour plus tard", isPublic: false);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.SaveAsync(list.Id, Creator));

        Assert.Equal(ErrorCodes.ListAlreadyYours, ex.Reason);
    }

    [Fact]
    public async Task Save_APrivateList_IsNotFound()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Pour plus tard", isPublic: false, tmdbIds: [438631]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync(list.Id));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
        Assert.Empty(await _kit.Saved.Saved.ListByOwnerAsync(Viewer));
    }

    [Fact]
    public async Task Save_APublicListOfAPrivateProfile_IsNotFound()
    {
        await _kit.PeopleAsync(creatorProfileIsPublic: false);
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync(list.Id));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
    }

    [Fact]
    public async Task Save_AnUnknownList_IsNotFound()
    {
        await _kit.PeopleAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync("abcdef0123456789"));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
    }

    [Fact]
    public async Task Read_FollowsTheList_AndRefreshesTheSnapshotOfTheLastFilmsSeen()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var saved = await _kit.SaveAsync(list.Id);
        await _kit.Lists.AddAsync(list.Id, MovieListTestKit.Title(426), Creator);
        await _kit.Lists.UpdateHandler().HandleAsync(Creator, list.Id, new UpdateMovieListRequest { Name = "Tout Hitchcock" });

        var detail = await ReadAsync(saved.Id);

        Assert.Equal(("Tout Hitchcock", 2, false), (detail.Name, detail.ItemCount, detail.Unavailable));
        Assert.Equal([539, 426], detail.Items.Select(item => item.TmdbId));
        var stored = await StoredAsync(saved.Id);
        Assert.Equal("Tout Hitchcock", stored.Name);
        Assert.Equal([539, 426], stored.Snapshot.Select(title => title.TmdbId));
    }

    [Fact]
    public async Task Read_ThroughTheListOfSavedLists_LeavesTheSnapshotAsTheViewerLastSawIt()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var saved = await _kit.SaveAsync(list.Id);
        await ReadAsync(saved.Id);
        await _kit.Lists.AddAsync(list.Id, MovieListTestKit.Title(426), Creator);
        await _kit.Lists.UpdateHandler().HandleAsync(Creator, list.Id, new UpdateMovieListRequest { Name = "Tout Hitchcock", IsPublic = true });

        var listed = await ListedAsync(saved.Id);

        Assert.Equal(("Tout Hitchcock", 2, false, true), (listed.Name, listed.ItemCount, listed.Unavailable, listed.CopyAvailable));
        var stored = await StoredAsync(saved.Id);
        Assert.Equal("Hitchcock", stored.Name);
        Assert.Equal([539], stored.Snapshot.Select(title => title.TmdbId));
    }

    [Fact]
    public async Task AListMadePrivate_IsUnavailable_WithoutItsFilmsNorItsCreator()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var saved = await _kit.SaveAsync(list.Id);
        await ReadAsync(saved.Id);
        await _kit.MakePrivateAsync(list.Id);

        var listed = await ListedAsync(saved.Id);
        var detail = await ReadAsync(saved.Id);

        Assert.Equal(
            ("Hitchcock", true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Private, 0),
            (listed.Name, listed.Unavailable, listed.UnavailableReason, listed.ItemCount));
        Assert.Null(listed.Creator);
        Assert.Null(listed.Description);
        Assert.Empty(listed.PosterPaths);
        Assert.Equal((true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Private), (detail.Unavailable, detail.UnavailableReason));
        Assert.Empty(detail.Items);
        Assert.True(listed.CopyAvailable);
        Assert.True(detail.CopyAvailable);
        Assert.Equal([539, 426], (await StoredAsync(saved.Id)).Snapshot.Select(title => title.TmdbId));
    }

    [Fact]
    public async Task AListOfAProfileTurnedPrivate_IsUnavailableAsPrivate()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var saved = await _kit.SaveAsync(list.Id);
        await _kit.HideProfileAsync(Creator);

        var listed = await ListedAsync(saved.Id);

        Assert.Equal((true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Private), (listed.Unavailable, listed.UnavailableReason));
    }

    [Fact]
    public async Task ADeletedList_IsUnavailableAsDeleted_UnderItsLastKnownName()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var saved = await _kit.SaveAsync(list.Id);
        await _kit.Lists.UpdateHandler().HandleAsync(Creator, list.Id, new UpdateMovieListRequest { Name = "Tout Hitchcock" });
        await ReadAsync(saved.Id);
        await _kit.Lists.DeleteHandler().HandleAsync(Creator, list.Id);

        var detail = await ReadAsync(saved.Id);

        Assert.Equal(
            ("Tout Hitchcock", true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Deleted),
            (detail.Name, detail.Unavailable, detail.UnavailableReason));
        Assert.Empty(detail.Items);
    }

    [Fact]
    public async Task AListWhoseCreatorLeft_IsUnavailableAsDeleted()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var saved = await _kit.SaveAsync(list.Id);
        await _kit.Lists.Users.DeleteAsync(Creator);

        var listed = await ListedAsync(saved.Id);

        Assert.Equal((true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Deleted), (listed.Unavailable, listed.UnavailableReason));
    }

    [Fact]
    public async Task Copy_OfAnUnavailableList_KeepsTheLastFilmsSeen()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var saved = await _kit.SaveAsync(list.Id);
        await _kit.Lists.AddAsync(list.Id, MovieListTestKit.Title(567, MovieListTestKit.Poster(567)), Creator);
        await ReadAsync(saved.Id);
        await _kit.Lists.WatchElsewhereAsync(426, owner: Viewer);
        await _kit.MakePrivateAsync(list.Id);
        await _kit.Lists.AddAsync(list.Id, MovieListTestKit.Title(213), Creator);

        var copy = await CopyAsync(saved.Id, "Mon Hitchcock");

        Assert.Equal("Mon Hitchcock", copy.Name);
        Assert.Equal([539, 426, 567], copy.Items.Select(item => item.TmdbId));
        Assert.Equal([false, true, false], copy.Items.Select(item => item.IsWatched));
        Assert.Equal(StoredPoster(567), copy.Items[2].PosterPath);
        Assert.Equal(("Film 539", "1999"), (copy.Items[0].Title, copy.Items[0].Year));
    }

    [Fact]
    public async Task Copy_OfADeletedList_KeepsTheLastFilmsSeen()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var saved = await _kit.SaveAsync(list.Id);
        await ReadAsync(saved.Id);
        await _kit.Lists.DeleteHandler().HandleAsync(Creator, list.Id);

        var copy = await CopyAsync(saved.Id, "Mon Hitchcock");

        Assert.Equal([539, 426], copy.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task Copy_OfAnAvailableList_TakesItsCurrentFilms()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var saved = await _kit.SaveAsync(list.Id);
        await _kit.Lists.AddAsync(list.Id, MovieListTestKit.Title(426), Creator);

        var copy = await CopyAsync(saved.Id, "Mon Hitchcock");

        Assert.Equal([539, 426], copy.Items.Select(item => item.TmdbId));
        Assert.Empty((await StoredAsync(saved.Id)).Snapshot);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AnUnavailableListNeverOpened_CannotBeCopied(bool deleted)
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var saved = await _kit.SaveAsync(list.Id);
        await ListedAsync(saved.Id);
        if (deleted)
            await _kit.Lists.DeleteHandler().HandleAsync(Creator, list.Id);
        else
            await _kit.MakePrivateAsync(list.Id);

        var listed = await ListedAsync(saved.Id);
        var detail = await ReadAsync(saved.Id);
        var ex = await Assert.ThrowsAsync<ConflictException>(() => CopyAsync(saved.Id, "Mon Hitchcock"));

        Assert.True(listed.Unavailable);
        Assert.False(listed.CopyAvailable);
        Assert.False(detail.CopyAvailable);
        Assert.Equal(ErrorCodes.SavedListCopyUnavailable, ex.Reason);
        Assert.Equal(0, await _kit.Lists.Lists.CountByOwnerAsync(Viewer));
    }

    [Fact]
    public async Task AListForgottenWithTheAccountOfItsCreator_IsDeleted_Unnamed_AndCannotBeCopied()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var saved = await _kit.SaveAsync(list.Id);
        await ReadAsync(saved.Id);
        await _kit.Lists.Lists.DeleteAllForOwnerAsync(Creator);
        await _kit.Saved.Saved.ForgetListsOfCreatorAsync(Creator);

        var listed = await ListedAsync(saved.Id);
        var detail = await ReadAsync(saved.Id);
        var ex = await Assert.ThrowsAsync<ConflictException>(() => CopyAsync(saved.Id, "Mon Hitchcock"));

        Assert.Equal(
            ((string?)null, true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Deleted, false),
            (listed.Name, listed.Unavailable, listed.UnavailableReason, listed.CopyAvailable));
        Assert.Equal(((string?)null, false), (detail.Name, detail.CopyAvailable));
        Assert.Equal(ErrorCodes.SavedListCopyUnavailable, ex.Reason);
    }

    [Fact]
    public async Task TheListOfSavedLists_ReadsTheMemberListsAndTheirCreators_InOneQueryEach()
    {
        await _kit.PeopleAsync();
        await _kit.Lists.PersonAsync("creator-2", "Sam");
        var hitchcock = await _kit.ListAsync("Hitchcock", tmdbIds: [539]);
        var korean = await _kit.ListAsync("Coréen", tmdbIds: [670, 671]);
        var kubrick = await _kit.ListAsync("Kubrick", tmdbIds: [62], owner: "creator-2");
        var hidden = await _kit.ListAsync("Pour plus tard", tmdbIds: [1]);
        foreach (var list in new[] { hitchcock, korean, kubrick, hidden })
            await _kit.SaveAsync(list.Id);
        await _kit.MakePrivateAsync(hidden.Id);
        var lists = new Mock<IMovieListRepository>();
        lists
            .Setup(l => l.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns((IReadOnlyCollection<string> ids, CancellationToken ct) => _kit.Lists.Lists.ListByIdsAsync(ids, ct));
        var users = new Mock<IUserRepository>();
        users
            .Setup(u => u.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns((IReadOnlyCollection<string> ids, CancellationToken ct) => _kit.Lists.Users.ListCardsByIdsAsync(ids, ct));
        var handler = new ListSavedListsHandler(
            _kit.Saved.Saved, _kit.Saved.Reader(new PublicListReader(lists.Object, users.Object)), _kit.Saved.History);

        var listed = await handler.HandleAsync(Viewer, null, null);

        Assert.Equal(
            [("Coréen", 2, "Léa", false), ("Hitchcock", 1, "Léa", false), ("Kubrick", 1, "Sam", false), ("Pour plus tard", 0, (string?)null, true)],
            listed.Items
                .Select(item => (item.Name, item.ItemCount, item.Creator?.DisplayName, item.Unavailable))
                .OrderBy(item => item.Name, StringComparer.Ordinal));
        lists.Verify(l => l.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Once);
        lists.Verify(l => l.FindAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        users.Verify(u => u.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AListDeletedBeforeItsCreatorLeft_IsForgottenWithTheirAccount_LikeTheOthers()
    {
        await _kit.PeopleAsync();
        var deleted = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var kept = await _kit.ListAsync("Coréen", tmdbIds: [670]);
        var savedDeleted = await _kit.SaveAsync(deleted.Id);
        var savedKept = await _kit.SaveAsync(kept.Id);
        await ReadAsync(savedDeleted.Id);
        await ReadAsync(savedKept.Id);
        await _kit.Lists.DeleteHandler().HandleAsync(Creator, deleted.Id);

        Assert.Equal(2, await _kit.Saved.Saved.ForgetListsOfCreatorAsync(Creator));

        foreach (var id in new[] { savedDeleted.Id, savedKept.Id })
        {
            var stored = await StoredAsync(id);
            Assert.Equal((string.Empty, 0, (string?)null), (stored.Name, stored.Snapshot.Count, stored.SourceOwnerId));
        }
        Assert.Equal(0, await _kit.Saved.Saved.ForgetListsOfCreatorAsync(Creator));
    }

    [Fact]
    public async Task ReadingTheDetail_WhileItsCreatorLeaves_DoesNotBringTheForgottenSnapshotBack()
    {
        await _kit.PeopleAsync();
        var list = await _kit.ListAsync("Hitchcock", tmdbIds: [539, 426]);
        var saved = await _kit.SaveAsync(list.Id);
        var readBeforeTheDeletion = await StoredAsync(saved.Id);
        await _kit.Saved.Saved.ForgetListsOfCreatorAsync(Creator);

        await _kit.Saved.Reader().ReadAndKeepWhatIsSeenAsync(readBeforeTheDeletion);

        var stored = await StoredAsync(saved.Id);
        Assert.Equal(string.Empty, stored.Name);
        Assert.Empty(stored.Snapshot);
    }

    private static SaveListRequest SavedListTestKitRequest(string listId) =>
        new() { SourceType = ListSourceNames.MemberList, SourceId = listId };
}
