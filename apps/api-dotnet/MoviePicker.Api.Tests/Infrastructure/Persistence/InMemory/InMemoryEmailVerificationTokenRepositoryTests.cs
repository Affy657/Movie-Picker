using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryEmailVerificationTokenRepositoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 25, 9, 0, 0, TimeSpan.Zero);

    private readonly InMemoryEmailVerificationTokenRepository _repo = new();

    private static EmailVerificationToken Mk(string userId = "u1", string tokenHash = "hash1", DateTimeOffset? createdAt = null) => new()
    {
        UserId = userId,
        TokenHash = tokenHash,
        CreatedAt = createdAt ?? Now,
        ExpiresAtUtc = (createdAt ?? Now).AddHours(48)
    };

    [Fact]
    public async Task FindUnexpiredAsync_FindsATokenUntilItExpires_ConsumedOrNot()
    {
        var created = await _repo.AddAsync(Mk());
        await _repo.ConsumeAllForUserAsync("u1", Now.AddMinutes(1));

        var found = await _repo.FindUnexpiredAsync("hash1", Now.AddHours(47));

        Assert.Equal(created.Id, found!.Id);
        Assert.Equal(Now.AddMinutes(1), found.ConsumedAt);
        Assert.Null(await _repo.FindUnexpiredAsync("hash1", Now.AddHours(48)));
        Assert.Null(await _repo.FindUnexpiredAsync("other", Now));
    }

    [Fact]
    public async Task ConsumeAllForUserAsync_KeepsTheFirstConsumptionAndSparesOtherAccounts()
    {
        await _repo.AddAsync(Mk(tokenHash: "a"));
        await _repo.AddAsync(Mk(userId: "u2", tokenHash: "b"));

        await _repo.ConsumeAllForUserAsync("u1", Now.AddMinutes(1));
        await _repo.ConsumeAllForUserAsync("u1", Now.AddMinutes(2));

        Assert.Equal(Now.AddMinutes(1), (await _repo.FindUnexpiredAsync("a", Now))!.ConsumedAt);
        Assert.Null((await _repo.FindUnexpiredAsync("b", Now))!.ConsumedAt);
    }

    [Fact]
    public async Task GetLatestForUserAsync_ReturnsTheMostRecentlyIssuedToken()
    {
        await _repo.AddAsync(Mk(tokenHash: "old", createdAt: Now.AddHours(-2)));
        await _repo.AddAsync(Mk(tokenHash: "new", createdAt: Now));
        await _repo.AddAsync(Mk(userId: "u2", tokenHash: "other", createdAt: Now.AddHours(1)));

        Assert.Equal("new", (await _repo.GetLatestForUserAsync("u1"))!.TokenHash);
        Assert.Null(await _repo.GetLatestForUserAsync("u3"));
    }

    [Fact]
    public async Task DeleteByUserIdAsync_RemovesOnlyTheTokensOfThatAccount()
    {
        await _repo.AddAsync(Mk(tokenHash: "a"));
        await _repo.AddAsync(Mk(tokenHash: "b"));
        await _repo.AddAsync(Mk(userId: "u2", tokenHash: "c"));

        Assert.Equal(2, await _repo.DeleteByUserIdAsync("u1"));
        Assert.Null(await _repo.GetLatestForUserAsync("u1"));
        Assert.NotNull(await _repo.GetLatestForUserAsync("u2"));
    }
}
