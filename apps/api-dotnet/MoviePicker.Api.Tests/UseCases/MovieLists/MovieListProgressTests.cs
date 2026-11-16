using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class MovieListProgressTests
{
    private readonly MovieListTestKit _kit = new();

    [Fact]
    public async Task List_CountsPerListTheTitlesTheCallerWatched_EitherWay()
    {
        var halloween = await _kit.CreateAsync("Halloween", firstItem: Title(1));
        await _kit.AddAsync(halloween.Id, Title(2));
        await _kit.AddAsync(halloween.Id, Title(3));
        var cult = await _kit.CreateAsync("Films cultes", firstItem: Title(3));
        await _kit.AddAsync(cult.Id, Title(4));
        var empty = await _kit.CreateAsync("Ghibli");
        await _kit.WatchElsewhereAsync(1);
        await _kit.Watching.WinNightAsync(3, "2026-03-14", owner: Owner);
        await _kit.WatchElsewhereAsync(2, owner: Stranger);
        await _kit.WatchElsewhereAsync(4, MovieMediaType.Tv);

        var lists = (await _kit.ListHandler().HandleAsync(Owner, null)).Items;

        Assert.Equal(2, lists.Single(list => list.Id == halloween.Id).WatchedCount);
        Assert.Equal(1, lists.Single(list => list.Id == cult.Id).WatchedCount);
        Assert.Equal(0, lists.Single(list => list.Id == empty.Id).WatchedCount);
    }

    [Fact]
    public async Task Get_FlagsEachWatchedTitle()
    {
        var list = await _kit.CreateAsync("Mélange", firstItem: Title(1));
        await _kit.AddAsync(list.Id, Title(2));
        await _kit.AddAsync(list.Id, Title(3, mediaType: MovieMediaType.Tv));
        await _kit.WatchElsewhereAsync(1);
        await _kit.WatchElsewhereAsync(3, MovieMediaType.Tv);

        var detail = await _kit.GetHandler().HandleAsync(Owner, list.Id);

        Assert.Equal([(1, true), (2, false), (3, true)], detail.Items.Select(item => (item.TmdbId, item.IsWatched)));
    }

    [Fact]
    public async Task AddItem_FlagsTheTitleWhenTheCallerWatchedIt()
    {
        var list = await _kit.CreateAsync("Films cultes");
        await _kit.WatchElsewhereAsync(603);

        var watched = await _kit.AddAsync(list.Id, Title(603));
        var again = await _kit.AddAsync(list.Id, Title(603));
        var unwatched = await _kit.AddAsync(list.Id, Title(680));

        Assert.True(watched.Item.IsWatched);
        Assert.True(again.Item.IsWatched);
        Assert.False(unwatched.Item.IsWatched);
    }

    [Fact]
    public async Task CreateAndUpdate_AnswerTheWatchedCountOfTheList()
    {
        await _kit.WatchElsewhereAsync(603);

        var created = await _kit.CreateAsync("Films cultes", firstItem: Title(603));
        await _kit.AddAsync(created.Id, Title(680));
        var renamed = await _kit.UpdateHandler().HandleAsync(Owner, created.Id, new UpdateMovieListRequest { Name = "Classiques" });
        var bare = await _kit.CreateAsync("Vide");

        Assert.Equal(1, created.WatchedCount);
        Assert.Equal(1, renamed.WatchedCount);
        Assert.Equal(0, bare.WatchedCount);
    }
}
