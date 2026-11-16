using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class ListMovieListsHandlerTests
{
    private readonly MovieListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_ReturnsOnlyTheCallersLists_MostRecentlyUpdatedFirst()
    {
        var cult = await _kit.CreateAsync("Films cultes");
        _kit.Clock.Advance(TimeSpan.FromMinutes(1));
        await _kit.CreateAsync("Halloween");
        _kit.Clock.Advance(TimeSpan.FromMinutes(1));
        await _kit.CreateAsync("Ghibli", owner: Stranger);
        await _kit.AddAsync(cult.Id, Title(603));

        var lists = (await _kit.ListHandler().HandleAsync(Owner, null)).Items;

        Assert.Equal(["Films cultes", "Halloween"], lists.Select(list => list.Name));
        Assert.Equal(_kit.Clock.Now, lists[0].UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_NoList_IsEmpty()
    {
        Assert.Empty((await _kit.ListHandler().HandleAsync(Owner, null)).Items);
    }

    [Fact]
    public async Task HandleAsync_WithAProbe_FlagsOnlyTheListsHoldingThatTitle()
    {
        var movie = await _kit.CreateAsync("Films", firstItem: Title(603));
        var series = await _kit.CreateAsync("Séries", firstItem: Title(603, mediaType: MovieMediaType.Tv));
        var empty = await _kit.CreateAsync("Vide");

        var probed = (await _kit.ListHandler().HandleAsync(Owner, new MovieListTitle(603, MovieMediaType.Movie))).Items;
        var unprobed = (await _kit.ListHandler().HandleAsync(Owner, null)).Items;

        Assert.True(probed.Single(list => list.Id == movie.Id).ContainsMovie);
        Assert.False(probed.Single(list => list.Id == series.Id).ContainsMovie);
        Assert.False(probed.Single(list => list.Id == empty.Id).ContainsMovie);
        Assert.All(unprobed, list => Assert.False(list.ContainsMovie));
    }

    [Fact]
    public async Task HandleAsync_CountsTheItems_AndShowsTheThreeLatestPosters()
    {
        var list = await _kit.CreateAsync("Films cultes");
        await _kit.AddAsync(list.Id, Title(1, Poster(1)));
        await _kit.AddAsync(list.Id, Title(2, Poster(2)));
        await _kit.AddAsync(list.Id, Title(3, Poster(3)));
        await _kit.AddAsync(list.Id, Title(4, Poster(4)));
        await _kit.AddAsync(list.Id, Title(5));

        var summary = Assert.Single((await _kit.ListHandler().HandleAsync(Owner, null)).Items);

        Assert.Equal(5, summary.ItemCount);
        Assert.Equal([Poster(4), Poster(3), Poster(2)], summary.PosterPaths);
    }
}

public sealed class GetMovieListHandlerTests
{
    private readonly MovieListTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_ReturnsTheListWithItsItemsInInsertionOrder()
    {
        var created = await _kit.CreateAsync("Films cultes", description: "Les incontournables");
        await _kit.AddAsync(created.Id, Title(680, Poster(680), title: "Pulp Fiction"));
        _kit.Clock.Advance(TimeSpan.FromMinutes(5));
        await _kit.AddAsync(created.Id, Title(603, title: "Matrix"));

        var list = await _kit.GetHandler().HandleAsync(Owner, created.Id);

        Assert.Equal(created.Id, list.Id);
        Assert.Equal("Films cultes", list.Name);
        Assert.Equal("Les incontournables", list.Description);
        Assert.Equal(Start, list.CreatedAt);
        Assert.Equal(_kit.Clock.Now, list.UpdatedAt);
        Assert.Equal(["Pulp Fiction", "Matrix"], list.Items.Select(item => item.Title));
        Assert.Equal(Poster(680), list.Items[0].PosterPath);
        Assert.Equal(Start, list.Items[0].CreatedAt);
        Assert.Equal(_kit.Clock.Now, list.Items[1].CreatedAt);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesList_IsNotFound()
    {
        var foreign = await _kit.CreateAsync("Films cultes", owner: Stranger);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.GetHandler().HandleAsync(Owner, foreign.Id));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_UnknownList_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.GetHandler().HandleAsync(Owner, "missing"));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }
}
