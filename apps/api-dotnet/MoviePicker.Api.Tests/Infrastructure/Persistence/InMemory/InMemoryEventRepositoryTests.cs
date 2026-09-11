using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryEventRepositoryTests
{
    private readonly InMemoryEventRepository _repo = new();

    private static Event Mk(
        string id = "",
        string title = "Soirée",
        string slug = "soiree",
        string? creatorUserId = "u1",
        string? winnerMovieId = null,
        DateTimeOffset? closedAt = null,
        DateTimeOffset updatedAt = default) => new()
        {
            Id = id,
            Title = title,
            Date = "2030-01-01",
            Time = "20:00",
            HostToken = "ht",
            Slug = slug,
            CreatorUserId = creatorUserId,
            Winners = TestWinners.Won(winnerMovieId),
            ClosedAt = closedAt,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = updatedAt == default ? DateTimeOffset.UtcNow : updatedAt
        };

    [Fact]
    public async Task AddAsync_GeneratesId_AndIndexesBySlug()
    {
        var created = await _repo.AddAsync(Mk(slug: "soiree"));

        Assert.Equal(24, created.Id.Length);
        Assert.Equal(created.Id, (await _repo.GetByIdOrSlugAsync("soiree"))!.Id);
    }

    [Fact]
    public async Task GetByIdOrSlugAsync_ResolvesByIdOrSlug_AndNullWhenBlank()
    {
        var created = await _repo.AddAsync(Mk(slug: "soiree"));

        Assert.NotNull(await _repo.GetByIdOrSlugAsync(created.Id));
        Assert.NotNull(await _repo.GetByIdOrSlugAsync("soiree"));
        Assert.Null(await _repo.GetByIdOrSlugAsync("  "));
        Assert.Null(await _repo.GetByIdOrSlugAsync("unknown"));
    }

    [Fact]
    public async Task UpdateAsync_PersistsChanges()
    {
        var created = await _repo.AddAsync(Mk(title: "Soirée"));

        await _repo.UpdateAsync(created with { Title = "Renommée" });

        Assert.Equal("Renommée", (await _repo.GetByIdOrSlugAsync(created.Id))!.Title);
    }

    [Fact]
    public async Task ListByCreatorUserIdAsync_OrdersByUpdatedDesc_AndRespectsLimit()
    {
        await _repo.AddAsync(Mk(slug: "a", creatorUserId: "u1", updatedAt: DateTimeOffset.UtcNow.AddMinutes(-5)));
        var recent = await _repo.AddAsync(Mk(slug: "b", creatorUserId: "u1", updatedAt: DateTimeOffset.UtcNow));

        Assert.Empty(await _repo.ListByCreatorUserIdAsync("u1", 0));
        Assert.Empty(await _repo.ListByCreatorUserIdAsync("", 10));

        var list = await _repo.ListByCreatorUserIdAsync("u1", 10);
        Assert.Equal(recent.Id, list[0].Id);
        Assert.Single(await _repo.ListByCreatorUserIdAsync("u1", 1));
    }

    [Fact]
    public async Task FindByCreatorAndTitleAsync_MatchesExactTitle()
    {
        await _repo.AddAsync(Mk(title: "Soirée", creatorUserId: "u1"));

        Assert.NotNull(await _repo.FindByCreatorAndTitleAsync("u1", "Soirée"));
        Assert.Null(await _repo.FindByCreatorAndTitleAsync("u1", "soirée"));
        Assert.Null(await _repo.FindByCreatorAndTitleAsync("", "Soirée"));
    }

    [Fact]
    public async Task ListByIdsAsync_ReturnsKnown_AndSkipsBlanks()
    {
        var a = await _repo.AddAsync(Mk(slug: "a"));
        var b = await _repo.AddAsync(Mk(slug: "b"));

        Assert.Empty(await _repo.ListByIdsAsync([]));
        var list = await _repo.ListByIdsAsync([a.Id, "", b.Id, "ghost"]);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task CountByWinnerMovieIdsAsync_CountsMatches()
    {
        await _repo.AddAsync(Mk(slug: "a", winnerMovieId: "mov1"));
        await _repo.AddAsync(Mk(slug: "b", winnerMovieId: "mov1"));
        await _repo.AddAsync(Mk(slug: "c", winnerMovieId: null));

        Assert.Equal(0, await _repo.CountByWinnerMovieIdsAsync([]));
        Assert.Equal(0, await _repo.CountByWinnerMovieIdsAsync(["  "]));
        Assert.Equal(2, await _repo.CountByWinnerMovieIdsAsync(["mov1"]));
    }

    [Fact]
    public async Task DeleteAsync_RemovesAndClearsSlug()
    {
        var created = await _repo.AddAsync(Mk(slug: "soiree"));

        Assert.False(await _repo.DeleteAsync(" "));
        Assert.False(await _repo.DeleteAsync("ghost"));
        Assert.True(await _repo.DeleteAsync(created.Id));
        Assert.Null(await _repo.GetByIdOrSlugAsync("soiree"));
    }

    [Fact]
    public async Task ListOpenEventsAsync_ExcludesClosed()
    {
        await _repo.AddAsync(Mk(slug: "open", closedAt: null));
        await _repo.AddAsync(Mk(slug: "closed", closedAt: DateTimeOffset.UtcNow));

        var open = await _repo.ListOpenEventsAsync();

        Assert.Single(open);
        Assert.Equal("open", open[0].Slug);
    }

    [Fact]
    public async Task AnonymizeCreatorAsync_ClearsCreatorUserId()
    {
        var created = await _repo.AddAsync(Mk(slug: "soiree", creatorUserId: "u1"));

        Assert.Equal(0L, await _repo.AnonymizeCreatorAsync(""));
        Assert.Equal(1L, await _repo.AnonymizeCreatorAsync("u1"));

        var reloaded = await _repo.GetByIdOrSlugAsync(created.Id);
        Assert.Null(reloaded!.CreatorUserId);
        Assert.Empty(await _repo.ListByCreatorUserIdAsync("u1", 10));
    }
}
