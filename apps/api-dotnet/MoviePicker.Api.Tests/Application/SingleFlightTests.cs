using MoviePicker.Api.Application.Caching;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class SingleFlightTests
{
    [Fact]
    public async Task RunAsync_ConcurrentCallersOnTheSameKey_ShareOneLoad()
    {
        var sut = new SingleFlight();
        var gate = new TaskCompletionSource<int>();
        var loads = 0;

        var first = sut.RunAsync("k", () => { Interlocked.Increment(ref loads); return gate.Task; });
        var second = sut.RunAsync("k", () => { Interlocked.Increment(ref loads); return gate.Task; });
        gate.SetResult(42);

        Assert.Equal(42, await first);
        Assert.Equal(42, await second);
        Assert.Equal(1, loads);
    }

    [Fact]
    public async Task RunAsync_DifferentKeys_LoadIndependently()
    {
        var sut = new SingleFlight();

        var a = await sut.RunAsync("a", () => Task.FromResult("A"));
        var b = await sut.RunAsync("b", () => Task.FromResult("B"));

        Assert.Equal("A", a);
        Assert.Equal("B", b);
    }

    [Fact]
    public async Task RunAsync_AfterCompletion_LoadsAgain()
    {
        var sut = new SingleFlight();
        var loads = 0;

        await sut.RunAsync("k", () => Task.FromResult(Interlocked.Increment(ref loads)));
        var second = await sut.RunAsync("k", () => Task.FromResult(Interlocked.Increment(ref loads)));

        Assert.Equal(2, second);
    }

    [Fact]
    public async Task RunAsync_FailedLoad_DoesNotPoisonTheNextCall()
    {
        var sut = new SingleFlight();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => sut.RunAsync<int>("k", () => throw new InvalidOperationException("boom")));
        var recovered = await sut.RunAsync("k", () => Task.FromResult(7));

        Assert.Equal(7, recovered);
    }

    [Fact]
    public async Task RunAsync_CancelledWaiter_DoesNotCancelTheSharedLoad()
    {
        var sut = new SingleFlight();
        var gate = new TaskCompletionSource<int>();
        using var cancelled = new CancellationTokenSource();

        var impatient = sut.RunAsync("k", () => gate.Task, cancelled.Token);
        var patient = sut.RunAsync("k", () => gate.Task);
        cancelled.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => impatient);
        gate.SetResult(1);
        Assert.Equal(1, await patient);
    }
}
