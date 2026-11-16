using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.SavedLists.SavedListTestKit;

namespace MoviePicker.Api.Tests.UseCases.SavedLists;

public sealed class CopySavedListHandlerTests
{
    private readonly SavedListTestKit _kit = new();

    private Task<MovieListResponse> CopyAsync(string savedListId, string name) =>
        _kit.CopyHandler().HandleAsync(Owner, savedListId, new CopySavedListRequest { Name = name });

    [Fact]
    public async Task HandleAsync_CreatesAListHoldingTheFilmsOfTheSourceInItsOrder()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, Film(673, TmdbPoster(673)), Film(671), Film(672, mediaType: MovieMediaType.Tv));
        var saved = await _kit.SaveSagaAsync();
        await _kit.WatchElsewhereAsync(671);
        _kit.Clock.Advance(TimeSpan.FromHours(2));

        var copy = await CopyAsync(saved.Id, "  Ma saga Harry Potter  ");

        Assert.Equal(("Ma saga Harry Potter", (string?)null, _kit.Clock.Now, _kit.Clock.Now), (copy.Name, copy.Description, copy.CreatedAt, copy.UpdatedAt));
        Assert.Equal(
            [(673, MovieMediaType.Movie, false), (671, MovieMediaType.Movie, true), (672, MovieMediaType.Tv, false)],
            copy.Items.Select(item => (item.TmdbId, item.MediaType, item.IsWatched)));
        var first = copy.Items[0];
        Assert.Equal(
            ("Film 673", "2001", PublicPoster(TmdbPoster(673)), (double?)7.5, (int?)152, _kit.Clock.Now),
            (first.Title, first.Year, first.PosterPath, first.VoteAverage, first.RuntimeMinutes, first.CreatedAt));
        Assert.Equal([12, 14], first.GenreIds);
        var stored = await _kit.MovieLists.Lists.GetAsync(Owner, copy.Id);
        Assert.Equal([673, 671, 672], stored!.Items.Select(item => item.TmdbId));
        Assert.Single(await _kit.Saved.ListByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_TheCopyIsFrozen_WhileTheSavedListKeepsFollowingTheSource()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var saved = await _kit.SaveSagaAsync();
        var copy = await CopyAsync(saved.Id, "Ma saga");

        _kit.SagaFilmsAre(HarryPotter, [.. HarryPotterFilms(), Film(12445)]);

        Assert.Equal(5, (await _kit.MovieLists.Lists.GetAsync(Owner, copy.Id))!.Items.Count);
        Assert.Equal(6, (await _kit.GetHandler().HandleAsync(Owner, saved.Id)).ItemCount);
    }

    [Fact]
    public async Task HandleAsync_KeepsATitleTheSourceRepeatsOnlyOnce()
    {
        _kit.ThemeHas(Frissons, Film(694), Film(539), Film(694));
        var saved = await _kit.SaveAsync(ListSourceType.ExplorerTheme, Frissons);

        var copy = await CopyAsync(saved.Id, "Frissons à moi");

        Assert.Equal([694, 539], copy.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task HandleAsync_ASourceBeyondTheItemLimit_KeepsItsFirstFilms()
    {
        var films = Enumerable.Range(1, MovieList.MaxItems + 20).Select(id => Film(id)).ToArray();
        _kit.ThemeHas(Frissons, films);
        var saved = await _kit.SaveAsync(ListSourceType.ExplorerTheme, Frissons);

        var copy = await CopyAsync(saved.Id, "Tout Frissons");

        Assert.Equal(MovieList.MaxItems, copy.Items.Count);
        Assert.Equal(MovieList.MaxItems, copy.Items[^1].TmdbId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_BlankName_IsAValidationError(string name)
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var saved = await _kit.SaveSagaAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => CopyAsync(saved.Id, name));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Theory]
    [InlineData("Films cultes")]
    [InlineData("À voir")]
    public async Task HandleAsync_NameTakenOrReserved_IsAConflict(string name)
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var saved = await _kit.SaveSagaAsync();
        await _kit.MovieLists.CreateAsync("Films cultes");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => CopyAsync(saved.Id, name));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
        Assert.Equal(1, await _kit.MovieLists.Lists.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_BeyondTheListLimit_IsAConflict()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var saved = await _kit.SaveSagaAsync();
        for (var index = 1; index <= MovieList.MaxPerOwner; index++)
            await _kit.MovieLists.CreateAsync($"Liste {index}");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => CopyAsync(saved.Id, "Une de trop"));

        Assert.Equal(ErrorCodes.ListLimitReached, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnUnavailableSource_IsUnavailable_AndCreatesNothing()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var saved = await _kit.SaveSagaAsync();
        _kit.SagaFails(HarryPotter, new HttpRequestException("TMDB down"));

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => CopyAsync(saved.Id, "Ma saga"));

        Assert.Equal(ErrorCodes.ListSourceUnavailable, ex.Reason);
        Assert.Equal(0, await _kit.MovieLists.Lists.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesSavedList_IsNotFound()
    {
        _kit.SagaHas(HarryPotter, HarryPotterName, HarryPotterFilms());
        var foreign = await _kit.SaveSagaAsync(Stranger);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => CopyAsync(foreign.Id, "Ma saga"));

        Assert.Equal(ErrorCodes.SavedListNotFound, ex.Reason);
        Assert.Equal(0, await _kit.MovieLists.Lists.CountByOwnerAsync(Owner));
    }
}
