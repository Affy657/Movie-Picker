using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMovieListRepositoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    private readonly InMemoryMovieListRepository _sut = new();

    private Task<MovieList> AddAsync(string owner, string name, params MovieListItem[] items) =>
        _sut.AddAsync(new MovieList { OwnerId = owner, Name = name, Items = items, CreatedAt = Now, UpdatedAt = Now });

    private static MovieListItem Item(int tmdbId) => new() { TmdbId = tmdbId, Title = $"Film {tmdbId}", AddedAt = Now.AddMinutes(tmdbId) };

    [Fact]
    public async Task AddAsync_SameNameKeyForTheSameOwner_IsRejectedLikeTheUniqueIndex()
    {
        await AddAsync("u1", "Été");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => AddAsync("u1", " ete "));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
        Assert.NotNull(await AddAsync("u2", "Été"));
    }

    [Fact]
    public async Task UpdateDetailsAsync_ToTheNameKeyOfAnotherList_IsRejected_ButItsOwnIsKept()
    {
        await AddAsync("u1", "Halloween");
        var list = await AddAsync("u1", "Films cultes");

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.UpdateDetailsAsync("u1", list.Id, "HALLOWEEN", null, isPublic: false, Now));
        var renamed = await _sut.UpdateDetailsAsync("u1", list.Id, "films CULTES", "Desc", isPublic: false, Now.AddHours(1));

        Assert.Equal(ErrorCodes.ListNameTaken, ex.Reason);
        Assert.Equal("films CULTES", renamed!.Name);
        Assert.Equal(Now.AddHours(1), renamed.UpdatedAt);
    }

    [Fact]
    public async Task UpdateDetailsAsync_SomeoneElsesList_ReturnsNothing()
    {
        var list = await AddAsync("u1", "Films cultes");

        Assert.Null(await _sut.UpdateDetailsAsync("u2", list.Id, "Volée", null, isPublic: true, Now));
    }

    [Fact]
    public async Task AddItemAsync_RefusesADuplicate_AndAnItemBeyondTheCap()
    {
        var list = await AddAsync("u1", "Films cultes", Item(1));

        Assert.False(await _sut.AddItemAsync("u1", list.Id, Item(1), maxItems: 3));
        Assert.True(await _sut.AddItemAsync("u1", list.Id, Item(2), maxItems: 3));
        Assert.True(await _sut.AddItemAsync("u1", list.Id, Item(3), maxItems: 3));
        Assert.False(await _sut.AddItemAsync("u1", list.Id, Item(4), maxItems: 3));
        Assert.False(await _sut.AddItemAsync("u2", list.Id, Item(5), maxItems: 3));

        var stored = (await _sut.GetAsync("u1", list.Id))!;
        Assert.Equal([1, 2, 3], stored.Items.Select(item => item.TmdbId));
        Assert.Equal(Item(3).AddedAt, stored.UpdatedAt);
    }

    [Fact]
    public async Task RemoveItemAsync_OnlyRemovesTheMatchingMediaType()
    {
        var list = await AddAsync("u1", "Mélange", Item(1), Item(1) with { MediaType = MovieMediaType.Tv });

        Assert.True(await _sut.RemoveItemAsync("u1", list.Id, new MovieListTitle(1, MovieMediaType.Tv), Now));
        Assert.False(await _sut.RemoveItemAsync("u1", list.Id, new MovieListTitle(1, MovieMediaType.Tv), Now));

        var left = Assert.Single((await _sut.GetAsync("u1", list.Id))!.Items);
        Assert.Equal(MovieMediaType.Movie, left.MediaType);
    }

    [Fact]
    public async Task DeleteAllForOwnerAsync_RemovesOnlyThatOwnersLists()
    {
        await AddAsync("u1", "Une");
        await AddAsync("u1", "Deux");
        await AddAsync("u2", "Autre");

        Assert.Equal(2, await _sut.DeleteAllForOwnerAsync("u1"));

        Assert.Empty(await _sut.ListByOwnerAsync("u1"));
        Assert.Single(await _sut.ListByOwnerAsync("u2"));
    }

    [Fact]
    public async Task DeleteAsync_SomeoneElsesList_KeepsIt()
    {
        var list = await AddAsync("u1", "Films cultes");

        Assert.False(await _sut.DeleteAsync("u2", list.Id));
        Assert.True(await _sut.DeleteAsync("u1", list.Id));
        Assert.Null(await _sut.GetAsync("u1", list.Id));
    }

    [Fact]
    public async Task PublicLists_AreListedLatestFirst_AndCounted_PerCreator()
    {
        var older = await _sut.AddAsync(new MovieList { OwnerId = "u1", Name = "Coréen", IsPublic = true, Items = [Item(670)], CreatedAt = Now, UpdatedAt = Now });
        await AddAsync("u1", "Pour plus tard", Item(1));
        var newer = await _sut.AddAsync(new MovieList { OwnerId = "u1", Name = "Hitchcock", IsPublic = true, CreatedAt = Now, UpdatedAt = Now.AddHours(1) });
        await _sut.AddAsync(new MovieList { OwnerId = "u2", Name = "Autre", IsPublic = true, CreatedAt = Now, UpdatedAt = Now });

        var summaries = await _sut.ListPublicSummariesAsync("u1");

        Assert.Equal([newer.Id, older.Id], summaries.Select(summary => summary.Id));
        Assert.All(summaries, summary => Assert.True(summary.IsPublic));
        Assert.Equal([new MovieListTitle(670, MovieMediaType.Movie)], summaries[1].Titles);
        Assert.Equal(2, await _sut.CountPublicByOwnerAsync("u1"));
        Assert.Equal(0, await _sut.CountPublicByOwnerAsync("u3"));
    }

    [Fact]
    public async Task UpdateDetailsAsync_SetsTheVisibility()
    {
        var list = await AddAsync("u1", "Films cultes");

        var shown = await _sut.UpdateDetailsAsync("u1", list.Id, "Films cultes", null, isPublic: true, Now);
        var publicCount = await _sut.CountPublicByOwnerAsync("u1");
        var hidden = await _sut.UpdateDetailsAsync("u1", list.Id, "Films cultes", null, isPublic: false, Now);

        Assert.True(shown!.IsPublic);
        Assert.Equal(1, publicCount);
        Assert.False(hidden!.IsPublic);
        Assert.Empty(await _sut.ListPublicSummariesAsync("u1"));
    }
}
