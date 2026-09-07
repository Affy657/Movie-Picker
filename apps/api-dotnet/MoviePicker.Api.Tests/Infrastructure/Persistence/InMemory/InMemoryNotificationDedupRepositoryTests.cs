using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryNotificationDedupRepositoryTests
{
    private readonly InMemoryNotificationDedupRepository _repo = new();

    [Fact]
    public async Task TryClaimAsync_FirstCall_ReturnsTrue()
    {
        Assert.True(await _repo.TryClaimAsync("u1", UserNotificationType.EventReminder1h, "evt1"));
    }

    [Fact]
    public async Task TryClaimAsync_SameKeyTwice_SecondReturnsFalse()
    {
        await _repo.TryClaimAsync("u1", UserNotificationType.EventReminder1h, "evt1");

        Assert.False(await _repo.TryClaimAsync("u1", UserNotificationType.EventReminder1h, "evt1"));
    }

    [Theory]
    [InlineData("u2", UserNotificationType.EventReminder1h, "evt1")]
    [InlineData("u1", UserNotificationType.EventReminder24h, "evt1")]
    [InlineData("u1", UserNotificationType.EventReminder1h, "evt2")]
    public async Task TryClaimAsync_DifferentKey_ReturnsTrue(string userId, UserNotificationType type, string eventId)
    {
        await _repo.TryClaimAsync("u1", UserNotificationType.EventReminder1h, "evt1");

        Assert.True(await _repo.TryClaimAsync(userId, type, eventId));
    }

    [Fact]
    public async Task TryClaimAsync_PushClaimed_StillAllowsInAppClaim()
    {
        await _repo.TryClaimAsync(
            "u1", UserNotificationType.EventReminder1h, "evt1", NotificationDedupChannel.Push);

        Assert.True(await _repo.TryClaimAsync(
            "u1", UserNotificationType.EventReminder1h, "evt1", NotificationDedupChannel.InApp));
    }

    [Fact]
    public async Task TryClaimAsync_SameInAppKeyTwice_SecondReturnsFalse()
    {
        await _repo.TryClaimAsync(
            "u1", UserNotificationType.EventReminder1h, "evt1", NotificationDedupChannel.InApp);

        Assert.False(await _repo.TryClaimAsync(
            "u1", UserNotificationType.EventReminder1h, "evt1", NotificationDedupChannel.InApp));
    }
}
