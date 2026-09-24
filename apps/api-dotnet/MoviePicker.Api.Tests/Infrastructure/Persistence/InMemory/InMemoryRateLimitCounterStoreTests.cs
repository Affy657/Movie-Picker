using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryRateLimitCounterStoreTests
{
    private readonly InMemoryRateLimitCounterStore _store = new();
    private readonly DateTimeOffset _expiry = DateTimeOffset.UtcNow.AddMinutes(1);

    [Fact]
    public async Task IncrementAsync_FirstCall_ReturnsOne()
    {
        Assert.Equal(1, await _store.IncrementAsync("k", _expiry));
    }

    [Fact]
    public async Task IncrementAsync_SameKey_CountsUp()
    {
        await _store.IncrementAsync("k", _expiry);
        await _store.IncrementAsync("k", _expiry);

        Assert.Equal(3, await _store.IncrementAsync("k", _expiry));
    }

    [Fact]
    public async Task IncrementAsync_DifferentKeys_CountIndependently()
    {
        await _store.IncrementAsync("a", _expiry);
        await _store.IncrementAsync("a", _expiry);

        Assert.Equal(1, await _store.IncrementAsync("b", _expiry));
    }

    [Fact]
    public async Task IncrementAsync_OfALongerWindow_KeepsTheLiveShorterCounters()
    {
        await _store.IncrementAsync("a", _expiry);
        await _store.IncrementAsync("b", _expiry.AddMinutes(14));

        Assert.Equal(2, await _store.IncrementAsync("a", _expiry));
    }

    [Fact]
    public async Task IncrementAsync_OnceTheWindowHasEnded_StartsCountingAgain()
    {
        var windowStart = new DateTimeOffset(2026, 9, 24, 12, 0, 0, TimeSpan.Zero);
        var clock = new SettableClock(windowStart);
        var store = new InMemoryRateLimitCounterStore(clock);
        await store.IncrementAsync("a", windowStart.AddMinutes(1));
        await store.IncrementAsync("a", windowStart.AddMinutes(1));

        clock.Now = windowStart.AddMinutes(1);

        Assert.Equal(1, await store.IncrementAsync("a", windowStart.AddMinutes(2)));
    }

    private sealed class SettableClock(DateTimeOffset now) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = now;

        public override DateTimeOffset GetUtcNow() => Now;
    }
}
