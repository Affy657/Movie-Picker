using Moq;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.SavedLists.SavedListTestKit;

namespace MoviePicker.Api.Tests.UseCases.SavedLists;

public sealed class SaveListHandlerTests
{
    private readonly SavedListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_ASaga_KeepsOnlyItsReference_AndAnswersItsSummary()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        await _kit.WatchElsewhereAsync(671);
        await _kit.WatchElsewhereAsync(673);
        _kit.Clock.Advance(TimeSpan.FromTicks(4_321));

        var saving = await _kit.SaveHandler().HandleAsync(Owner, Request(ListSourceType.TmdbCollection, "1241"));

        Assert.True(saving.Created);
        var summary = saving.Summary;
        Assert.False(string.IsNullOrEmpty(summary.Id));
        Assert.Equal(
            (ListSourceType.TmdbCollection, "1241", HarryPotterName, 5, 2, Start, false),
            (summary.SourceType, summary.SourceId, summary.Name, summary.ItemCount, summary.WatchedCount, summary.CreatedAt, summary.Unavailable));
        Assert.Equal([PublicPoster(TmdbPoster(671)), PublicPoster(TmdbPoster(673)), PublicPoster(TmdbPoster(674))], summary.PosterPaths);
        var stored = Assert.Single(await _kit.Saved.ListByOwnerAsync(Owner));
        Assert.Equal(
            (summary.Id, Owner, ListSourceType.TmdbCollection, "1241", HarryPotterName, Start),
            (stored.Id, stored.OwnerId, stored.SourceType, stored.SourceId, stored.Name, stored.CreatedAt));
    }

    [Fact]
    public async Task HandleAsync_ASelection_IsNamedByItsKey()
    {
        _kit.ThemeHas(Frissons, Film(694), Film(539));

        var summary = await _kit.SaveAsync(ListSourceType.ExplorerTheme, " Frissons ");

        Assert.Equal((ListSourceType.ExplorerTheme, Frissons, Frissons, 2), (summary.SourceType, summary.SourceId, summary.Name, summary.ItemCount));
    }

    [Fact]
    public async Task HandleAsync_TheSameSourceTwice_KeepsTheFirstSave()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var first = await _kit.SaveSagaAsync();
        _kit.Clock.Advance(TimeSpan.FromDays(1));

        var again = await _kit.SaveHandler().HandleAsync(Owner, Request(ListSourceType.TmdbCollection, "1241"));

        Assert.False(again.Created);
        Assert.Equal((first.Id, Start), (again.Summary.Id, again.Summary.CreatedAt));
        Assert.Single(await _kit.Saved.ListByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_TheSameSourceForAnotherOwner_IsTheirOwnSave()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var mine = await _kit.SaveSagaAsync();

        var theirs = await _kit.SaveSagaAsync(Stranger);

        Assert.NotEqual(mine.Id, theirs.Id);
        Assert.Single(await _kit.Saved.ListByOwnerAsync(Stranger));
    }

    [Fact]
    public async Task HandleAsync_FiftyFirstSource_IsAConflict_ButAnAlreadySavedOneIsStillAnswered()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        await _kit.SaveSagaAsync();
        for (var index = 1; index < SavedList.MaxPerOwner; index++)
        {
            _kit.SagaHas(index, $"Saga {index}", Film(index));
            await _kit.SaveAsync(ListSourceType.TmdbCollection, index.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
        _kit.ThemeHas(Frissons, Film(694));

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.SaveAsync(ListSourceType.ExplorerTheme, Frissons));
        var again = await _kit.SaveSagaAsync();

        Assert.Equal(ErrorCodes.SavedListLimitReached, ex.Reason);
        Assert.Equal(HarryPotterName, again.Name);
        Assert.Equal(SavedList.MaxPerOwner, await _kit.Saved.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_TheLimitIsPerOwner()
    {
        for (var index = 1; index <= SavedList.MaxPerOwner; index++)
        {
            _kit.SagaHas(index, $"Saga {index}", Film(index));
            await _kit.SaveAsync(ListSourceType.TmdbCollection, index.ToString(System.Globalization.CultureInfo.InvariantCulture), Stranger);
        }
        _kit.ThemeHas(Frissons, Film(694));

        var summary = await _kit.SaveAsync(ListSourceType.ExplorerTheme, Frissons);

        Assert.Equal(Frissons, summary.SourceId);
    }

    [Theory]
    [InlineData("trending", "1241")]
    [InlineData("tmdbCollection", "harry-potter")]
    public async Task HandleAsync_ASourceThatCannotBeSaved_IsRefused_AndKeepsNothing(string type, string id)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _kit.SaveHandler().HandleAsync(Owner, new() { SourceType = type, SourceId = id }));

        Assert.Equal(ErrorCodes.ListSourceNotSavable, ex.Reason);
        Assert.Empty(await _kit.Saved.ListByOwnerAsync(Owner));
    }

    [Theory]
    [InlineData(ListSourceType.TmdbCollection, "999999")]
    [InlineData(ListSourceType.ExplorerTheme, "theme-retire")]
    public async Task HandleAsync_AnUnknownSource_IsNotFound_AndKeepsNothing(ListSourceType type, string id)
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.SaveAsync(type, id));

        Assert.Equal(ErrorCodes.ListSourceNotFound, ex.Reason);
        Assert.Empty(await _kit.Saved.ListByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_WhileTmdbIsDown_IsUnavailable_AndKeepsNothing()
    {
        _kit.Tmdb
            .Setup(t => t.GetCollectionAsync(HarryPotter, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB down"));

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => _kit.SaveSagaAsync());

        Assert.Equal(ErrorCodes.ListSourceUnavailable, ex.Reason);
        Assert.Empty(await _kit.Saved.ListByOwnerAsync(Owner));
    }
}
