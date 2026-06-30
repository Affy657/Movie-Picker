using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryPushSubscriptionRepositoryTests
{
    private readonly InMemoryPushSubscriptionRepository _repo = new();

    private static PushSubscription Mk(
        string userId = "u1",
        string endpoint = "https://push.example/abc") => new()
        {
            UserId = userId,
            Endpoint = endpoint,
            P256dh = "key",
            Auth = "auth",
            CreatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task UpsertAsync_IsIdempotentPerUserAndEndpoint()
    {
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e1"));
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e1"));

        Assert.Single(await _repo.ListByUserIdAsync("u1"));
    }

    [Fact]
    public async Task ListByUserIdAsync_ReturnsOnlyOwnSubscriptions()
    {
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e1"));
        await _repo.UpsertAsync(Mk(userId: "u2", endpoint: "e2"));

        Assert.Single(await _repo.ListByUserIdAsync("u1"));
        Assert.Empty(await _repo.ListByUserIdAsync("u9"));
    }

    [Fact]
    public async Task DeleteByEndpointAsync_RemovesSingleSubscription()
    {
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e1"));
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e2"));

        await _repo.DeleteByEndpointAsync("u1", "e1");

        var remaining = await _repo.ListByUserIdAsync("u1");
        Assert.Equal("e2", remaining.Single().Endpoint);
    }

    [Fact]
    public async Task ListByUserIdsAsync_ReturnsForAllRequestedUsers()
    {
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e1"));
        await _repo.UpsertAsync(Mk(userId: "u2", endpoint: "e2"));
        await _repo.UpsertAsync(Mk(userId: "u3", endpoint: "e3"));

        var list = await _repo.ListByUserIdsAsync(["u1", "u2"]);

        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task DeleteByUserIdAsync_RemovesAllForUser()
    {
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e1"));
        await _repo.UpsertAsync(Mk(userId: "u1", endpoint: "e2"));
        await _repo.UpsertAsync(Mk(userId: "u2", endpoint: "e3"));

        Assert.Equal(2L, await _repo.DeleteByUserIdAsync("u1"));
        Assert.Empty(await _repo.ListByUserIdAsync("u1"));
        Assert.Single(await _repo.ListByUserIdAsync("u2"));
    }
}
