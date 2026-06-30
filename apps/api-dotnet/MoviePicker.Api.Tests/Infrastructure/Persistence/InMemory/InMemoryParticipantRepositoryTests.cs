using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryParticipantRepositoryTests
{
    private readonly InMemoryParticipantRepository _repo = new();

    private static Participant Mk(
        string id = "",
        string eventId = "evt1",
        string pseudo = "Alice",
        string? userId = null,
        DateTimeOffset createdAt = default) => new()
        {
            Id = id,
            EventId = eventId,
            Pseudo = pseudo,
            UserId = userId,
            CreatedAt = createdAt == default ? DateTimeOffset.UtcNow : createdAt,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task AddAsync_GeneratesId_AndIndexesByPseudoAndUser()
    {
        var created = await _repo.AddAsync(Mk(pseudo: "Alice", userId: "u1"));

        Assert.Equal(24, created.Id.Length);
        Assert.NotNull(await _repo.FindByEventAndPseudoAsync("evt1", "Alice"));
        Assert.NotNull(await _repo.FindByEventAndUserIdAsync("evt1", "u1"));
    }

    [Fact]
    public async Task FindByEventAndPseudoAsync_TrimsInput_AndReturnsNullWhenUnknown()
    {
        await _repo.AddAsync(Mk(pseudo: "Alice"));

        Assert.NotNull(await _repo.FindByEventAndPseudoAsync("evt1", "  Alice  "));
        Assert.Null(await _repo.FindByEventAndPseudoAsync("evt1", "Bob"));
    }

    [Fact]
    public async Task FindByIdAndEventIdAsync_MatchesEvent()
    {
        var created = await _repo.AddAsync(Mk(eventId: "evt1"));

        Assert.NotNull(await _repo.FindByIdAndEventIdAsync(created.Id, "evt1"));
        Assert.Null(await _repo.FindByIdAndEventIdAsync(created.Id, "evt2"));
    }

    [Fact]
    public async Task FindByEventAndUserIdAsync_ReturnsNull_WhenUserIdBlank()
    {
        Assert.Null(await _repo.FindByEventAndUserIdAsync("evt1", ""));
    }

    [Fact]
    public async Task GetPseudosByIdsAsync_ReturnsKnownPseudos()
    {
        var a = await _repo.AddAsync(Mk(pseudo: "Alice"));
        var b = await _repo.AddAsync(Mk(pseudo: "Bob"));

        var map = await _repo.GetPseudosByIdsAsync([a.Id, b.Id, "ghost"]);

        Assert.Equal("Alice", map[a.Id]);
        Assert.Equal("Bob", map[b.Id]);
        Assert.False(map.ContainsKey("ghost"));
    }

    [Fact]
    public async Task ListByEventIdAsync_OrdersByCreatedAt()
    {
        var older = await _repo.AddAsync(Mk(pseudo: "Old", createdAt: DateTimeOffset.UtcNow.AddMinutes(-10)));
        var newer = await _repo.AddAsync(Mk(pseudo: "New", createdAt: DateTimeOffset.UtcNow));

        var list = await _repo.ListByEventIdAsync("evt1");

        Assert.Equal([older.Id, newer.Id], list.Select(p => p.Id));
    }

    [Fact]
    public async Task ListDistinctEventIdsByUserIdAsync_ReturnsDistinctEvents()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", userId: "u1"));
        await _repo.AddAsync(Mk(eventId: "evt2", pseudo: "Alice2", userId: "u1"));

        Assert.Empty(await _repo.ListDistinctEventIdsByUserIdAsync(""));
        var ids = await _repo.ListDistinctEventIdsByUserIdAsync("u1");
        Assert.Equal(2, ids.Count);
    }

    [Fact]
    public async Task ListByUserIdAsync_RespectsLimit()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", userId: "u1"));
        await _repo.AddAsync(Mk(eventId: "evt2", pseudo: "Alice2", userId: "u1"));

        Assert.Empty(await _repo.ListByUserIdAsync(""));
        Assert.Single(await _repo.ListByUserIdAsync("u1", limit: 1));
        Assert.Equal(2, (await _repo.ListByUserIdAsync("u1")).Count);
    }

    [Fact]
    public async Task CountByEventIdsAsync_ZeroFillsRequestedIds()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "A"));
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "B"));

        var map = await _repo.CountByEventIdsAsync(["evt1", "evt2"]);

        Assert.Equal(2, map["evt1"]);
        Assert.Equal(0, map["evt2"]);
    }

    [Fact]
    public async Task CountByEventIdAsync_CountsParticipants()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "A"));
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "B"));

        Assert.Equal(2, await _repo.CountByEventIdAsync("evt1"));
    }

    [Fact]
    public async Task DeleteAsync_RemovesAndClearsIndexes()
    {
        var created = await _repo.AddAsync(Mk(pseudo: "Alice", userId: "u1"));

        Assert.False(await _repo.DeleteAsync(created.Id, "wrong-event"));
        Assert.True(await _repo.DeleteAsync(created.Id, "evt1"));
        Assert.Null(await _repo.FindByEventAndPseudoAsync("evt1", "Alice"));
        Assert.Null(await _repo.FindByEventAndUserIdAsync("evt1", "u1"));
    }

    [Fact]
    public async Task DeleteByEventIdAsync_RemovesAll_AndReturnsCount()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "A", userId: "u1"));
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "B"));

        Assert.Equal(0L, await _repo.DeleteByEventIdAsync(" "));
        Assert.Equal(2L, await _repo.DeleteByEventIdAsync("evt1"));
        Assert.Equal(0, await _repo.CountByEventIdAsync("evt1"));
    }

    [Fact]
    public async Task AnonymizeByUserIdAsync_ClearsUserIdAndRenames()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "Alice", userId: "u1"));

        Assert.Equal(0L, await _repo.AnonymizeByUserIdAsync("", "Anonyme"));
        Assert.Equal(1L, await _repo.AnonymizeByUserIdAsync("u1", "Anonyme"));

        Assert.Null(await _repo.FindByEventAndUserIdAsync("evt1", "u1"));
        var renamed = await _repo.FindByEventAndPseudoAsync("evt1", "Anonyme");
        Assert.NotNull(renamed);
        Assert.Null(renamed!.UserId);
    }

    [Fact]
    public async Task AnonymizeByUserIdAsync_AvoidsPseudoCollision()
    {
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "Anonyme"));
        await _repo.AddAsync(Mk(eventId: "evt1", pseudo: "Alice", userId: "u1"));

        await _repo.AnonymizeByUserIdAsync("u1", "Anonyme");

        var still = await _repo.FindByEventAndPseudoAsync("evt1", "Anonyme");
        Assert.NotNull(still);
        Assert.Equal(2, await _repo.CountByEventIdAsync("evt1"));
    }
}
