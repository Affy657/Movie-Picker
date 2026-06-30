using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryPasswordResetTokenRepositoryTests
{
    private readonly InMemoryPasswordResetTokenRepository _repo = new();

    private static PasswordResetToken Mk(
        string userId = "u1",
        string tokenHash = "hash1",
        DateTimeOffset? expiresAtUtc = null,
        DateTimeOffset? consumedAt = null,
        DateTimeOffset createdAt = default) => new()
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAtUtc ?? DateTimeOffset.UtcNow.AddHours(1),
            ConsumedAt = consumedAt,
            CreatedAt = createdAt == default ? DateTimeOffset.UtcNow : createdAt
        };

    [Fact]
    public async Task AddAsync_AssignsId()
    {
        var created = await _repo.AddAsync(Mk());

        Assert.False(string.IsNullOrEmpty(created.Id));
    }

    [Fact]
    public async Task GetByTokenHashAsync_ReturnsActiveToken()
    {
        await _repo.AddAsync(Mk(tokenHash: "active"));

        Assert.NotNull(await _repo.GetByTokenHashAsync("active"));
        Assert.Null(await _repo.GetByTokenHashAsync("nope"));
    }

    [Fact]
    public async Task GetByTokenHashAsync_IgnoresExpiredToken()
    {
        await _repo.AddAsync(Mk(tokenHash: "expired", expiresAtUtc: DateTimeOffset.UtcNow.AddHours(-1)));

        Assert.Null(await _repo.GetByTokenHashAsync("expired"));
    }

    [Fact]
    public async Task GetByTokenHashAsync_IgnoresConsumedToken()
    {
        await _repo.AddAsync(Mk(tokenHash: "consumed", consumedAt: DateTimeOffset.UtcNow));

        Assert.Null(await _repo.GetByTokenHashAsync("consumed"));
    }

    [Fact]
    public async Task MarkConsumedAsync_MakesTokenUnusable()
    {
        var created = await _repo.AddAsync(Mk(tokenHash: "tok"));

        await _repo.MarkConsumedAsync(created.Id, DateTimeOffset.UtcNow);

        Assert.Null(await _repo.GetByTokenHashAsync("tok"));
    }

    [Fact]
    public async Task InvalidateActiveForUserAsync_ConsumesAllActiveTokens()
    {
        await _repo.AddAsync(Mk(userId: "u1", tokenHash: "t1"));
        await _repo.AddAsync(Mk(userId: "u1", tokenHash: "t2"));
        await _repo.AddAsync(Mk(userId: "u2", tokenHash: "t3"));

        await _repo.InvalidateActiveForUserAsync("u1", DateTimeOffset.UtcNow);

        Assert.Null(await _repo.GetByTokenHashAsync("t1"));
        Assert.Null(await _repo.GetByTokenHashAsync("t2"));
        Assert.NotNull(await _repo.GetByTokenHashAsync("t3"));
    }

    [Fact]
    public async Task GetMostRecentForUserAsync_ReturnsLatestByCreatedAt()
    {
        await _repo.AddAsync(Mk(userId: "u1", tokenHash: "old", createdAt: DateTimeOffset.UtcNow.AddHours(-2)));
        await _repo.AddAsync(Mk(userId: "u1", tokenHash: "new", createdAt: DateTimeOffset.UtcNow));

        var recent = await _repo.GetMostRecentForUserAsync("u1");

        Assert.Equal("new", recent!.TokenHash);
        Assert.Null(await _repo.GetMostRecentForUserAsync("absent"));
    }

    [Fact]
    public async Task DeleteByUserIdAsync_RemovesAllForUser()
    {
        await _repo.AddAsync(Mk(userId: "u1", tokenHash: "t1"));
        await _repo.AddAsync(Mk(userId: "u1", tokenHash: "t2"));
        await _repo.AddAsync(Mk(userId: "u2", tokenHash: "t3"));

        Assert.Equal(2L, await _repo.DeleteByUserIdAsync("u1"));
        Assert.NotNull(await _repo.GetByTokenHashAsync("t3"));
    }
}
