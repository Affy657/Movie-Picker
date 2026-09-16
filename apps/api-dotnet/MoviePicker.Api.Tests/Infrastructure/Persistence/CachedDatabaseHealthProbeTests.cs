using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence;

public sealed class CachedDatabaseHealthProbeTests
{
    private sealed class CountingProbe : IDatabaseHealthProbe
    {
        private readonly TaskCompletionSource _gate = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _calls;

        public DatabaseProbeStatus Status { get; set; } = DatabaseProbeStatus.Healthy;

        public int Calls => _calls;

        public bool HoldUntilReleased { get; set; }

        public void Release() => _gate.TrySetResult();

        public async Task<DatabaseProbeResult> CheckAsync(CancellationToken ct = default)
        {
            Interlocked.Increment(ref _calls);
            if (HoldUntilReleased)
                await _gate.Task.WaitAsync(ct);
            return new DatabaseProbeResult(Status, 7);
        }
    }

    private sealed class AdvancingClock : TimeProvider
    {
        private DateTimeOffset _now = new(2026, 9, 16, 12, 0, 0, TimeSpan.Zero);

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan delta) => _now += delta;
    }

    [Fact]
    public async Task CheckAsync_WithinTheTtl_ReusesTheLastResult()
    {
        var inner = new CountingProbe();
        var clock = new AdvancingClock();
        var sut = new CachedDatabaseHealthProbe(inner, clock);

        var first = await sut.CheckAsync();
        clock.Advance(CachedDatabaseHealthProbe.Ttl - TimeSpan.FromMilliseconds(1));
        var second = await sut.CheckAsync();

        Assert.Equal(1, inner.Calls);
        Assert.Same(first, second);
    }

    [Fact]
    public async Task CheckAsync_AfterTheTtl_ProbesAgain()
    {
        var inner = new CountingProbe();
        var clock = new AdvancingClock();
        var sut = new CachedDatabaseHealthProbe(inner, clock);

        await sut.CheckAsync();
        clock.Advance(CachedDatabaseHealthProbe.Ttl);
        inner.Status = DatabaseProbeStatus.Unavailable;
        var refreshed = await sut.CheckAsync();

        Assert.Equal(2, inner.Calls);
        Assert.Equal(DatabaseProbeStatus.Unavailable, refreshed.Status);
    }

    [Fact]
    public async Task CheckAsync_AnUnavailableResult_IsCachedToo()
    {
        var inner = new CountingProbe { Status = DatabaseProbeStatus.Unavailable };
        var sut = new CachedDatabaseHealthProbe(inner, new AdvancingClock());

        await sut.CheckAsync();
        var second = await sut.CheckAsync();

        Assert.Equal(1, inner.Calls);
        Assert.Equal(DatabaseProbeStatus.Unavailable, second.Status);
    }

    [Fact]
    public async Task CheckAsync_ConcurrentCallers_ShareASingleProbe()
    {
        var inner = new CountingProbe { HoldUntilReleased = true };
        var sut = new CachedDatabaseHealthProbe(inner, new AdvancingClock());

        var callers = Enumerable.Range(0, 25).Select(_ => sut.CheckAsync()).ToArray();
        inner.Release();
        var results = await Task.WhenAll(callers);

        Assert.Equal(1, inner.Calls);
        Assert.All(results, r => Assert.Equal(DatabaseProbeStatus.Healthy, r.Status));
    }
}
