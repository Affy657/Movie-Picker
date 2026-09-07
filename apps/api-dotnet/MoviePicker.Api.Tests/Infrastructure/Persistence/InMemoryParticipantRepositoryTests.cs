using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence;

public sealed class InMemoryParticipantRepositoryTests
{
    private static Participant Part(string id, string eventId, string? userId, int minutesAgo) => new()
    {
        Id = id,
        EventId = eventId,
        UserId = userId,
        Pseudo = $"Pseudo {id}",
        CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-minutesAgo),
        UpdatedAt = DateTimeOffset.UtcNow,
    };

    private static async Task<InMemoryParticipantRepository> SeedAsync(params Participant[] participants)
    {
        var repo = new InMemoryParticipantRepository();
        foreach (var participant in participants)
            await repo.AddAsync(participant);
        return repo;
    }

    [Fact]
    public async Task ListByUserIdsAsync_ReturnsOnlyTheRequestedUsers()
    {
        var repo = await SeedAsync(
            Part("p1", "e1", "u1", 30),
            Part("p2", "e2", "u2", 20),
            Part("p3", "e3", "u3", 10));

        var result = await repo.ListByUserIdsAsync(["u1", "u3"]);

        Assert.Equal(["p3", "p1"], result.Select(p => p.Id).ToList());
    }

    [Fact]
    public async Task ListByUserIdsAsync_OrdersFromNewestToOldest()
    {
        var repo = await SeedAsync(
            Part("ancien", "e1", "u1", 90),
            Part("recent", "e2", "u1", 5),
            Part("median", "e3", "u1", 45));

        var result = await repo.ListByUserIdsAsync(["u1"]);

        Assert.Equal(["recent", "median", "ancien"], result.Select(p => p.Id).ToList());
    }

    [Fact]
    public async Task ListByUserIdsAsync_AppliesTheLimit()
    {
        var repo = await SeedAsync(
            Part("p1", "e1", "u1", 30),
            Part("p2", "e2", "u1", 20),
            Part("p3", "e3", "u1", 10));

        var result = await repo.ListByUserIdsAsync(["u1"], limit: 2);

        Assert.Equal(["p3", "p2"], result.Select(p => p.Id).ToList());
    }

    [Fact]
    public async Task ListByUserIdsAsync_IgnoresAnonymousParticipants()
    {
        var repo = await SeedAsync(
            Part("anonyme", "e1", null, 10),
            Part("identifie", "e2", "u1", 20));

        var result = await repo.ListByUserIdsAsync(["u1"]);

        Assert.Equal("identifie", Assert.Single(result).Id);
    }

    [Fact]
    public async Task ListByUserIdsAsync_WithoutUsableIds_ReturnsEmpty()
    {
        var repo = await SeedAsync(Part("p1", "e1", "u1", 10));

        Assert.Empty(await repo.ListByUserIdsAsync([]));
        Assert.Empty(await repo.ListByUserIdsAsync(["", "   "]));
    }
}
