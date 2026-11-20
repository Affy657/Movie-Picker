using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.SavedLists.SavedListTestKit;

namespace MoviePicker.Api.Tests.UseCases.SavedLists;

public sealed class SavedProfileListTests
{
    private const string Member = MovieListTestKit.Member;
    private const string MemberHandle = "member1";

    private readonly SavedListTestKit _kit = new();

    private static UserProposedMovieItem Proposed(int tmdbId) => new()
    {
        TmdbId = tmdbId,
        Title = $"Film {tmdbId}",
        Year = "2019",
        PosterPath = $"/posters/{tmdbId}.jpg",
        VoteAverage = 7.1,
        RuntimeMinutes = 120,
        GenreIds = [27],
        LastProposedAt = Start,
        ProposalCount = 1
    };

    private static UserWatchedMovieItem Watched(int tmdbId) => new()
    {
        TmdbId = tmdbId,
        Title = $"Film {tmdbId}",
        Year = "2001",
        PosterPath = $"/posters/{tmdbId}.jpg",
        WatchedAt = Start,
        Source = WatchedSource.Night
    };

    private async Task<User> MemberAsync(bool isProfilePublic = true, bool isWatchedPublic = true)
    {
        var member = await _kit.MovieLists.PersonAsync(Member, "Léa Moreau", isProfilePublic);
        return await _kit.MovieLists.Users.UpdateAsync(member with { IsWatchedPublic = isWatchedPublic });
    }

    private void MemberProposed(params int[] tmdbIds) =>
        _kit.MemberProposals
            .Setup(h => h.HandleForUserAsync(Member, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserProposedMoviesResponse { Items = [.. tmdbIds.Select(Proposed)] });

    private void MemberWon(params int[] tmdbIds) =>
        _kit.MemberProposals
            .Setup(h => h.HandleForUserAsync(Member, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserProposedMoviesResponse { Items = [.. tmdbIds.Select(Proposed)] });

    private void MemberWatched(params int[] tmdbIds) =>
        _kit.MemberWatched
            .Setup(h => h.HandleNightsForUserAsync(Member, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserWatchedMoviesResponse { Items = [.. tmdbIds.Select(Watched)], Total = tmdbIds.Length });

    private void MemberHasEverything()
    {
        MemberProposed(530385, 25237);
        MemberWon(25237);
        MemberWatched(603, 680, 27205);
    }

    private async Task<SavedListSummaryResponse> ListedAsync(string savedListId) =>
        (await _kit.ListHandler().HandleAsync(Owner, null, null)).Items.Single(list => list.Id == savedListId);

    [Theory]
    [InlineData("memberWatched", " Member1 ", ListSourceType.MemberWatched)]
    [InlineData("MEMBERPROPOSALS", "member1", ListSourceType.MemberProposals)]
    [InlineData("memberWinningProposals", "MEMBER1", ListSourceType.MemberWinningProposals)]
    public void Parse_AProfileList_KeepsTheHandleInLowerCase(string type, string handle, ListSourceType expected)
    {
        Assert.Equal(new ListSource(expected, MemberHandle), ListSourceReader.Parse(type, handle));
    }

    [Theory]
    [InlineData("")]
    [InlineData("lea moreau")]
    [InlineData("../lists")]
    [InlineData("a")]
    public void Parse_AProfileListWithoutAHandle_IsNotSavable(string handle)
    {
        var ex = Assert.Throws<BadRequestException>(() => ListSourceReader.Parse("memberProposals", handle));

        Assert.Equal(ErrorCodes.ListSourceNotSavable, ex.Reason);
    }

    [Theory]
    [InlineData(ListSourceType.MemberWatched, new[] { 603, 680, 27205 })]
    [InlineData(ListSourceType.MemberProposals, new[] { 530385, 25237 })]
    [InlineData(ListSourceType.MemberWinningProposals, new[] { 25237 })]
    public async Task Save_AProfileListOfAMember_FollowsItUnderTheirName_ByTheirAccount(ListSourceType type, int[] expected)
    {
        await MemberAsync();
        MemberHasEverything();
        await _kit.WatchElsewhereAsync(expected[0]);

        var saved = await _kit.SaveAsync(type, MemberHandle);

        Assert.Equal(
            (type, Member, "Léa Moreau", expected.Length, 1, false),
            (saved.SourceType, saved.SourceId, saved.Name, saved.ItemCount, saved.WatchedCount, saved.Unavailable));
        Assert.Equal((MemberHandle, "Léa Moreau"), (saved.Creator!.Handle, saved.Creator.DisplayName));
        Assert.Equal($"/posters/{expected[0]}.jpg", saved.PosterPaths[0]);
        var stored = Assert.Single(await _kit.Saved.ListByOwnerAsync(Owner));
        Assert.Equal((Member, Member, "Léa Moreau"), (stored.SourceId, stored.SourceOwnerId, stored.Name));
        var detail = await _kit.GetHandler().HandleAsync(Owner, saved.Id);
        Assert.Equal(expected, detail.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task Save_TheSameProfileListAgain_AnswersTheFirstSave()
    {
        await MemberAsync();
        MemberHasEverything();
        var first = await _kit.SaveAsync(ListSourceType.MemberProposals, MemberHandle);

        var again = await _kit.SaveHandler().HandleAsync(Owner, Request(ListSourceType.MemberProposals, "Member1"));

        Assert.False(again.Created);
        Assert.Equal(first.Id, again.Summary.Id);
    }

    [Fact]
    public async Task Save_ItsOwnProfileList_IsRefusedAsItsOwn()
    {
        await MemberAsync();
        MemberHasEverything();

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.SaveAsync(ListSourceType.MemberProposals, MemberHandle, Member));

        Assert.Equal(ErrorCodes.ListAlreadyYours, ex.Reason);
    }

    [Fact]
    public async Task Save_AnUnknownHandle_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync(ListSourceType.MemberProposals, "nobody"));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
    }

    [Theory]
    [InlineData(ListSourceType.MemberWatched)]
    [InlineData(ListSourceType.MemberProposals)]
    [InlineData(ListSourceType.MemberWinningProposals)]
    public async Task Save_AProfileListOfAPrivateProfile_IsNotFound(ListSourceType type)
    {
        await MemberAsync(isProfilePublic: false);
        MemberHasEverything();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync(type, MemberHandle));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
        Assert.Empty(await _kit.Saved.ListByOwnerAsync(Owner));
    }

    [Theory]
    [InlineData(ListSourceType.MemberWatched)]
    [InlineData(ListSourceType.MemberWinningProposals)]
    public async Task Save_TheWatchedFilmsOrWinsOfAMemberHidingTheirWatchedFilms_IsNotFound(ListSourceType type)
    {
        await MemberAsync(isWatchedPublic: false);
        MemberHasEverything();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync(type, MemberHandle));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
    }

    [Fact]
    public async Task Save_TheProposalsOfAMemberHidingTheirWatchedFilms_StaysPossible()
    {
        await MemberAsync(isWatchedPublic: false);
        MemberHasEverything();

        var saved = await _kit.SaveAsync(ListSourceType.MemberProposals, MemberHandle);

        Assert.Equal((2, false), (saved.ItemCount, saved.Unavailable));
    }

    [Fact]
    public async Task ListBySource_FindsTheSavedListFromTheHandle_EvenAfterTheMemberRenamedIt()
    {
        var member = await MemberAsync();
        MemberHasEverything();
        var saved = await _kit.SaveAsync(ListSourceType.MemberWatched, MemberHandle);
        await _kit.MovieLists.Users.UpdateAsync(member with { Handle = "leamoreau" });

        var byNewHandle = await _kit.ListHandler().HandleAsync(Owner, "memberWatched", "leamoreau");
        var byOldHandle = await _kit.ListHandler().HandleAsync(Owner, "memberWatched", MemberHandle);

        var found = Assert.Single(byNewHandle.Items);
        Assert.Equal((saved.Id, "leamoreau"), (found.Id, found.Creator!.Handle));
        Assert.Empty(byOldHandle.Items);
    }

    [Fact]
    public async Task Read_OnceTheMemberHidesTheirWatchedFilms_IsPrivate_AndKeepsWhatTheViewerSaw()
    {
        var member = await MemberAsync();
        MemberHasEverything();
        var saved = await _kit.SaveAsync(ListSourceType.MemberWatched, MemberHandle);
        await _kit.GetHandler().HandleAsync(Owner, saved.Id);
        await _kit.MovieLists.Users.UpdateAsync(member with { IsWatchedPublic = false });

        var listed = await ListedAsync(saved.Id);

        Assert.Equal(
            (true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Private, "Léa Moreau", true),
            (listed.Unavailable, listed.UnavailableReason, listed.Name, listed.CopyAvailable));
        Assert.Equal([603, 680, 27205], (await _kit.Saved.GetAsync(Owner, saved.Id))!.Snapshot.Select(title => title.TmdbId));
    }

    [Fact]
    public async Task Read_OnceTheMemberDeletedTheirAccount_IsDeleted()
    {
        await MemberAsync();
        MemberHasEverything();
        var saved = await _kit.SaveAsync(ListSourceType.MemberProposals, MemberHandle);
        await _kit.MovieLists.Users.DeleteAsync(Member);

        var listed = await ListedAsync(saved.Id);

        Assert.Equal(
            (true, (ListSourceUnavailableReason?)ListSourceUnavailableReason.Deleted),
            (listed.Unavailable, listed.UnavailableReason));
    }

    [Fact]
    public async Task Copy_OfAProfileListGoneWithNothingSeen_IsRefusedAsAGoneMemberList()
    {
        var member = await MemberAsync();
        MemberHasEverything();
        var saved = await _kit.SaveAsync(ListSourceType.MemberProposals, MemberHandle);
        await _kit.MovieLists.Users.UpdateAsync(member with { IsProfilePublic = false });

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => _kit.CopyHandler().HandleAsync(Owner, saved.Id, new CopySavedListRequest { Name = "Copie" }));

        Assert.Equal(ErrorCodes.SavedListCopyUnavailable, ex.Reason);
    }
}
