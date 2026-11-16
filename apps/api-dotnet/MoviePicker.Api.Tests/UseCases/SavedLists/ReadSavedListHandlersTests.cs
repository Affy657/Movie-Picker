using Moq;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.SavedLists.SavedListTestKit;

namespace MoviePicker.Api.Tests.UseCases.SavedLists;

public sealed class ListSavedListsHandlerTests
{
    private readonly SavedListTestKit _kit = new();

    private async Task SaveHarryPotterThenFrissonsAsync()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        _kit.ThemeHas(Frissons, Film(694, TmdbPoster(694)), Film(539), Film(671));
        await _kit.SaveSagaAsync();
        _kit.Clock.Advance(TimeSpan.FromMinutes(1));
        await _kit.SaveAsync(ListSourceType.ExplorerTheme, Frissons);
    }

    [Fact]
    public async Task HandleAsync_ListsTheCallersSavedLists_NewestFirst_ReadFromTheirSource()
    {
        await SaveHarryPotterThenFrissonsAsync();
        _kit.SagaHas(10, "Star Wars - Saga", Film(11));
        await _kit.SaveAsync(ListSourceType.TmdbCollection, "10", Stranger);
        await _kit.WatchElsewhereAsync(671);
        await _kit.WatchElsewhereAsync(694);
        await _kit.WatchElsewhereAsync(672, owner: Stranger);

        var lists = (await _kit.ListHandler().HandleAsync(Owner, null, null)).Items;

        Assert.Equal(
            [(ListSourceType.ExplorerTheme, Frissons, Frissons, 3, 2), (ListSourceType.TmdbCollection, "1241", HarryPotterName, 5, 1)],
            lists.Select(list => (list.SourceType, list.SourceId, list.Name, list.ItemCount, list.WatchedCount)));
        Assert.Equal([PublicPoster(TmdbPoster(694))], lists[0].PosterPaths);
        Assert.Equal(Start.AddMinutes(1), lists[0].CreatedAt);
        Assert.All(lists, list => Assert.False(list.Unavailable));
    }

    [Fact]
    public async Task HandleAsync_ReadsTheWatchedHistoryOnceForTheWholeBatch()
    {
        await SaveHarryPotterThenFrissonsAsync();
        _kit.WatchedReads.Invocations.Clear();

        await _kit.ListHandler().HandleAsync(Owner, null, null);

        _kit.WatchedReads.Verify(w => w.ListTitlesByOwnerAsync(Owner, It.IsAny<CancellationToken>()), Times.Once);
        _kit.WatchedReads.Verify(w => w.ListByOwnerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_FollowsTheFilmsOfTheSourceAsItChanges()
    {
        await SaveHarryPotterThenFrissonsAsync();
        _kit.SagaFilmsAre(HarryPotter, [.. HarryPotterFilms(), Film(12445)]);

        var saga = (await _kit.ListHandler().HandleAsync(Owner, null, null)).Items.Single(list => list.SourceId == "1241");

        Assert.Equal(6, saga.ItemCount);
    }

    [Fact]
    public async Task HandleAsync_NamesASagaAfterItsSourceToday_RatherThanItsSavedName()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        await _kit.SavedSagaAsync("Ancien nom");

        var saga = Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null, null)).Items);

        Assert.Equal(HarryPotterName, saga.Name);
    }

    [Fact]
    public async Task HandleAsync_AnUnavailableSource_FallsBackOnItsSavedName_WithoutFailingTheOthers()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName);
        _kit.SagaFails(HarryPotter, new HttpRequestException("TMDB down"));
        _kit.ThemeHas(Frissons, Film(694));
        await _kit.SavedSagaAsync("Ancien nom");
        await _kit.SaveAsync(ListSourceType.ExplorerTheme, Frissons);
        await _kit.WatchElsewhereAsync(671);

        var lists = (await _kit.ListHandler().HandleAsync(Owner, null, null)).Items;

        var saga = lists.Single(list => list.SourceId == "1241");
        Assert.Equal(("Ancien nom", true, 0, 0), (saga.Name, saga.Unavailable, saga.ItemCount, saga.WatchedCount));
        Assert.Empty(saga.PosterPaths);
        Assert.False(saga.CopyAvailable);
        var selection = lists.Single(list => list.SourceId == Frissons);
        Assert.False(selection.Unavailable);
        Assert.True(selection.CopyAvailable);
    }

    [Fact]
    public async Task HandleAsync_ASagaWhoseNameCannotBeRead_KeepsItsSavedName_AndItsFilms()
    {
        _kit.SagaFilmsAre(HarryPotter, HarryPotterFilms());
        _kit.Tmdb
            .Setup(t => t.GetCollectionAsync(HarryPotter, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB down"));
        await _kit.SavedSagaAsync("Ancien nom");

        var saga = Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null, null)).Items);

        Assert.Equal(("Ancien nom", false, 5), (saga.Name, saga.Unavailable, saga.ItemCount));
    }

    [Fact]
    public async Task HandleAsync_NothingSaved_IsEmpty_WithoutReadingAnySource()
    {
        var lists = await _kit.ListHandler().HandleAsync(Owner, null, null);

        Assert.Empty(lists.Items);
        _kit.VerifySourceReads(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_FilteredOnASource_AnswersOnlyThatOne_AndReadsOnlyThatSource()
    {
        await SaveHarryPotterThenFrissonsAsync();
        _kit.Showcase.Invocations.Clear();

        var found = (await _kit.ListHandler().HandleAsync(Owner, "explorerTheme", "Frissons")).Items;

        Assert.Equal(Frissons, Assert.Single(found).SourceId);
        _kit.VerifySourceReads(Times.Once());
    }

    [Theory]
    [InlineData("tmdbCollection", "10")]
    [InlineData("explorerTheme", "theme-retire")]
    public async Task HandleAsync_FilteredOnASourceNotSaved_IsEmpty(string type, string id)
    {
        await SaveHarryPotterThenFrissonsAsync();

        Assert.Empty((await _kit.ListHandler().HandleAsync(Owner, type, id)).Items);
    }

    [Theory]
    [InlineData("trending", "1241")]
    [InlineData("tmdbCollection", null)]
    [InlineData(null, "1241")]
    public async Task HandleAsync_FilteredOnSomethingThatCannotBeSaved_IsRefused(string? type, string? id)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _kit.ListHandler().HandleAsync(Owner, type, id));

        Assert.Equal(ErrorCodes.ListSourceNotSavable, ex.Reason);
    }
}

public sealed class GetSavedListHandlerTests
{
    private readonly SavedListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_AnswersTheSummaryAndTheFilmsInTheSourceOrder_FlaggingTheWatchedOnes()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, Film(673, TmdbPoster(673)), Film(671), Film(672, mediaType: MovieMediaType.Tv));
        var saved = await _kit.SaveSagaAsync();
        await _kit.WatchElsewhereAsync(671);
        await _kit.WatchElsewhereAsync(672);

        var detail = await _kit.GetHandler().HandleAsync(Owner, saved.Id);

        Assert.Equal(
            (saved.Id, ListSourceType.TmdbCollection, "1241", HarryPotterName, 3, 1, Start, false),
            (detail.Id, detail.SourceType, detail.SourceId, detail.Name, detail.ItemCount, detail.WatchedCount, detail.CreatedAt, detail.Unavailable));
        Assert.Equal([PublicPoster(TmdbPoster(673))], detail.PosterPaths);
        Assert.Equal(
            [(673, MovieMediaType.Movie, false), (671, MovieMediaType.Movie, true), (672, MovieMediaType.Tv, false)],
            detail.Items.Select(item => (item.TmdbId, item.MediaType, item.IsWatched)));
        var first = detail.Items[0];
        Assert.Equal(
            ("Film 673", "2001", PublicPoster(TmdbPoster(673)), (double?)7.5, (int?)152, Start),
            (first.Title, first.Year, first.PosterPath, first.VoteAverage, first.RuntimeMinutes, first.CreatedAt));
        Assert.Equal([12, 14], first.GenreIds);
    }

    [Fact]
    public async Task HandleAsync_AnUnavailableSource_AnswersTheSavedNameWithoutFilms()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName);
        _kit.SagaFails(HarryPotter, Errors.ShowcaseUnavailable());
        var saved = await _kit.SavedSagaAsync("Ancien nom");

        var detail = await _kit.GetHandler().HandleAsync(Owner, saved.Id);

        Assert.Equal(("Ancien nom", true, 0), (detail.Name, detail.Unavailable, detail.ItemCount));
        Assert.Empty(detail.Items);
        Assert.False(detail.CopyAvailable);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesOrAnUnknownList_IsNotFound()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var foreign = await _kit.SaveSagaAsync(Stranger);

        var stranger = await Assert.ThrowsAsync<NotFoundException>(() => _kit.GetHandler().HandleAsync(Owner, foreign.Id));
        var unknown = await Assert.ThrowsAsync<NotFoundException>(() => _kit.GetHandler().HandleAsync(Owner, "missing"));

        Assert.Equal(ErrorCodes.SavedListNotFound, stranger.Reason);
        Assert.Equal(ErrorCodes.SavedListNotFound, unknown.Reason);
    }
}

public sealed class UnsaveListHandlerTests
{
    private readonly SavedListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_ForgetsTheSavedList_AndAgainIsANoOp()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var saved = await _kit.SaveSagaAsync();

        await _kit.UnsaveHandler().HandleAsync(Owner, saved.Id);
        await _kit.UnsaveHandler().HandleAsync(Owner, saved.Id);
        await _kit.UnsaveHandler().HandleAsync(Owner, "missing");

        Assert.Empty(await _kit.Saved.ListByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesList_StaysSaved()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var foreign = await _kit.SaveSagaAsync(Stranger);

        await _kit.UnsaveHandler().HandleAsync(Owner, foreign.Id);

        Assert.Single(await _kit.Saved.ListByOwnerAsync(Stranger));
    }
}
