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
}
