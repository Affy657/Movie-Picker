using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoKnownDeviceRepositoryTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoKnownDeviceRepositoryTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private MongoKnownDeviceRepository Repository() =>
        new(_factory.Services.GetRequiredService<MongoCollectionFactory>());

    private static KnownDevice Device(string userId, string tokenHash, DateTimeOffset seenAt) => new()
    {
        UserId = userId,
        TokenHash = tokenHash,
        Browser = "Firefox",
        OperatingSystem = "Linux",
        Kind = DeviceKind.Desktop,
        FirstSeenAt = seenAt,
        LastSeenAt = seenAt
    };

    [Fact]
    public async Task AddedDevice_IsFoundByItsAccountAndHash()
    {
        var repository = Repository();
        var userId = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow;

        var added = await repository.TryAddAsync(Device(userId, "hash-1", now));
        var found = await repository.FindAsync(userId, "hash-1", now);

        Assert.NotNull(added);
        Assert.Equal(added!.Id, found!.Id);
        Assert.Equal("Firefox", found.Browser);
        Assert.Equal(DeviceKind.Desktop, found.Kind);
        Assert.Null(await repository.FindAsync("another-account", "hash-1", now));
        Assert.True(await repository.AnyForUserAsync(userId, now));
    }

    [Fact]
    public async Task SameDeviceTwice_IsAddedOnce()
    {
        var repository = Repository();
        var userId = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow;
        await repository.TryAddAsync(Device(userId, "hash-1", now));

        Assert.Null(await repository.TryAddAsync(Device(userId, "hash-1", now)));
        Assert.Single(await repository.ListByUserIdAsync(userId));
    }

    [Fact]
    public async Task ForgottenDevice_IsNoLongerKnownAndCanBeAddedAgain()
    {
        var repository = Repository();
        var userId = Guid.NewGuid().ToString("N");
        var longAgo = DateTimeOffset.UtcNow - KnownDevice.Retention - TimeSpan.FromDays(1);
        await repository.TryAddAsync(Device(userId, "hash-1", longAgo));
        var now = DateTimeOffset.UtcNow;

        Assert.Null(await repository.FindAsync(userId, "hash-1", now));
        Assert.False(await repository.AnyForUserAsync(userId, now));
        Assert.NotNull(await repository.TryAddAsync(Device(userId, "hash-1", now)));
        Assert.Equal(now.ToUnixTimeMilliseconds(), Assert.Single(await repository.ListByUserIdAsync(userId)).FirstSeenAt.ToUnixTimeMilliseconds());
    }

    [Fact]
    public async Task MarkSeen_PushesTheRetentionBack()
    {
        var repository = Repository();
        var userId = Guid.NewGuid().ToString("N");
        var firstSeen = DateTimeOffset.UtcNow - KnownDevice.Retention + TimeSpan.FromDays(1);
        var added = await repository.TryAddAsync(Device(userId, "hash-1", firstSeen));

        await repository.MarkSeenAsync(added!.Id, DateTimeOffset.UtcNow);

        Assert.NotNull(await repository.FindAsync(userId, "hash-1", DateTimeOffset.UtcNow.AddDays(2)));
    }

    [Fact]
    public async Task DeleteByUserId_RemovesOnlyThatAccount()
    {
        var repository = Repository();
        var userId = Guid.NewGuid().ToString("N");
        var otherId = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow;
        await repository.TryAddAsync(Device(userId, "hash-1", now));
        await repository.TryAddAsync(Device(userId, "hash-2", now));
        await repository.TryAddAsync(Device(otherId, "hash-1", now));

        Assert.Equal(2, await repository.DeleteByUserIdAsync(userId));
        Assert.Equal(0, await repository.DeleteByUserIdAsync(" "));
        Assert.Empty(await repository.ListByUserIdAsync(userId));
        Assert.Single(await repository.ListByUserIdAsync(otherId));
    }
}
