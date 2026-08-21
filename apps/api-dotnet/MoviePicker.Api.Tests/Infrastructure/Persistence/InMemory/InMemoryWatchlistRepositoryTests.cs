using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryWatchlistRepositoryTests
{
    private readonly InMemoryWatchlistRepository _sut = new();

    private static WatchlistItem Item(
        string userId = "u1",
        int tmdbId = 42,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string title = "Matrix",
        DateTimeOffset createdAt = default) => new()
        {
            Id = string.Empty,
            UserId = userId,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = title,
            Year = "1999",
            CreatedAt = createdAt
        };

    [Fact]
    public async Task AddAsync_NewItem_ReturnsTrue()
    {
        var added = await _sut.AddAsync(Item());

        Assert.True(added);
    }

    [Fact]
    public async Task AddAsync_DuplicateKey_ReturnsFalse()
    {
        await _sut.AddAsync(Item());

        var added = await _sut.AddAsync(Item());

        Assert.False(added);
    }

    [Fact]
    public async Task AddAsync_SameTmdbId_DifferentMediaType_BothPersist()
    {
        await _sut.AddAsync(Item(mediaType: MovieMediaType.Movie));
        var addedTv = await _sut.AddAsync(Item(mediaType: MovieMediaType.Tv));

        Assert.True(addedTv);
        var items = await _sut.ListByUserIdAsync("u1");
        Assert.Equal(2, items.Count);
    }

    [Fact]
    public async Task AddAsync_NoCreatedAtProvided_DefaultsToNow()
    {
        await _sut.AddAsync(Item());

        var stored = await _sut.GetOneAsync("u1", 42, MovieMediaType.Movie);

        Assert.NotNull(stored);
        Assert.True(stored!.CreatedAt > DateTimeOffset.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task GetOneAsync_Missing_ReturnsNull()
    {
        var result = await _sut.GetOneAsync("u1", 42, MovieMediaType.Movie);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetOneAsync_Present_ReturnsStoredItem()
    {
        await _sut.AddAsync(Item(title: "Matrix"));

        var result = await _sut.GetOneAsync("u1", 42, MovieMediaType.Movie);

        Assert.NotNull(result);
        Assert.Equal("Matrix", result!.Title);
    }

    [Fact]
    public async Task ListByUserIdAsync_OnlyReturnsItemsForGivenUser()
    {
        await _sut.AddAsync(Item(userId: "u1", tmdbId: 1));
        await _sut.AddAsync(Item(userId: "u2", tmdbId: 2));

        var result = await _sut.ListByUserIdAsync("u1");

        var only = Assert.Single(result);
        Assert.Equal(1, only.TmdbId);
    }

    [Fact]
    public async Task ListByUserIdAsync_OrdersByCreatedAtDescending()
    {
        var older = DateTimeOffset.UtcNow.AddDays(-1);
        var newer = DateTimeOffset.UtcNow;
        await _sut.AddAsync(Item(tmdbId: 1, createdAt: older));
        await _sut.AddAsync(Item(tmdbId: 2, createdAt: newer));

        var result = await _sut.ListByUserIdAsync("u1");

        Assert.Equal(2, result[0].TmdbId);
        Assert.Equal(1, result[1].TmdbId);
    }

    [Fact]
    public async Task ListByUserIdAsync_RespectsLimit()
    {
        for (var i = 0; i < 5; i++)
            await _sut.AddAsync(Item(tmdbId: i, createdAt: DateTimeOffset.UtcNow.AddSeconds(i)));

        var result = await _sut.ListByUserIdAsync("u1", limit: 2);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task RemoveAsync_ExistingItem_ReturnsTrue_AndRemovesIt()
    {
        await _sut.AddAsync(Item());

        var removed = await _sut.RemoveAsync("u1", 42, MovieMediaType.Movie);

        Assert.True(removed);
        Assert.Empty(await _sut.ListByUserIdAsync("u1"));
    }

    [Fact]
    public async Task RemoveAsync_MissingItem_ReturnsFalse()
    {
        var removed = await _sut.RemoveAsync("u1", 42, MovieMediaType.Movie);

        Assert.False(removed);
    }

    [Fact]
    public async Task RemoveForUsersAsync_RemovesMatchingItemsAcrossUsers_ReturnsCount()
    {
        await _sut.AddAsync(Item(userId: "u1"));
        await _sut.AddAsync(Item(userId: "u2"));
        await _sut.AddAsync(Item(userId: "u3", tmdbId: 99));

        var removed = await _sut.RemoveForUsersAsync(["u1", "u2", "u3"], 42, MovieMediaType.Movie);

        Assert.Equal(2, removed);
        Assert.Single(await _sut.ListByUserIdAsync("u3"));
    }

    [Fact]
    public async Task RemoveForUsersAsync_EmptyUserIds_ReturnsZero()
    {
        var removed = await _sut.RemoveForUsersAsync([], 42, MovieMediaType.Movie);

        Assert.Equal(0, removed);
    }

    [Fact]
    public async Task DeleteAllForUserAsync_RemovesAllItemsForUser_KeepsOtherUsers()
    {
        await _sut.AddAsync(Item(userId: "u1", tmdbId: 1));
        await _sut.AddAsync(Item(userId: "u1", tmdbId: 2, mediaType: MovieMediaType.Tv));
        await _sut.AddAsync(Item(userId: "u2", tmdbId: 3));

        var removed = await _sut.DeleteAllForUserAsync("u1");

        Assert.Equal(2, removed);
        Assert.Empty(await _sut.ListByUserIdAsync("u1"));
        Assert.Single(await _sut.ListByUserIdAsync("u2"));
    }

    [Fact]
    public async Task UpdateGenresAsync_ExistingItem_UpdatesGenres()
    {
        await _sut.AddAsync(Item());
        var stored = await _sut.GetOneAsync("u1", 42, MovieMediaType.Movie);

        await _sut.UpdateGenresAsync(stored!.Id, [28, 878]);

        var updated = await _sut.GetOneAsync("u1", 42, MovieMediaType.Movie);
        Assert.Equal(new[] { 28, 878 }, updated!.GenreIds);
    }

    [Fact]
    public async Task UpdateGenresAsync_MissingItem_DoesNothing()
    {
        await _sut.UpdateGenresAsync("missing-id", [28]);

        Assert.Empty(await _sut.ListByUserIdAsync("u1"));
    }

    [Fact]
    public async Task ListMissingGenresAsync_ReturnsOnlyItemsWithoutGenres()
    {
        await _sut.AddAsync(Item(tmdbId: 1));
        await _sut.AddAsync(Item(tmdbId: 2));
        var withGenres = await _sut.GetOneAsync("u1", 2, MovieMediaType.Movie);
        await _sut.UpdateGenresAsync(withGenres!.Id, [28]);

        var missing = await _sut.ListMissingGenresAsync(10);

        var only = Assert.Single(missing);
        Assert.Equal(1, only.TmdbId);
    }

    [Fact]
    public async Task ListMissingGenresAsync_LimitZeroOrLess_ReturnsEmpty()
    {
        await _sut.AddAsync(Item());

        var missing = await _sut.ListMissingGenresAsync(0);

        Assert.Empty(missing);
    }
}
