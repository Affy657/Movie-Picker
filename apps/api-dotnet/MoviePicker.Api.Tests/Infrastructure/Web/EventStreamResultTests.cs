using System.Text;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class EventStreamResultTests
{
    private sealed class SilentFeed : IEventLiveFeed
    {
        public EventLiveSubscription Subscribe(string eventId, string slug)
        {
            var channel = Channel.CreateUnbounded<IEventLiveSignal>();
            return new EventLiveSubscription(channel.Reader, () => channel.Writer.TryComplete());
        }
    }

    private sealed class CountingLease : IEventStreamLease
    {
        public int Disposals { get; private set; }

        public bool IsReplaced { get; set; }

        public void Dispose() => Disposals += 1;
    }

    private sealed class SteppedClock : TimeProvider
    {
        private static readonly DateTimeOffset Epoch = new(2026, 11, 25, 20, 0, 0, TimeSpan.Zero);

        private readonly object _gate = new();
        private readonly List<SteppedTimer> _armed = [];
        private TaskCompletionSource _nextArming = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private long _ticks;

        public override long TimestampFrequency => TimeSpan.TicksPerSecond;

        public override long GetTimestamp()
        {
            lock (_gate)
                return _ticks;
        }

        public override DateTimeOffset GetUtcNow() => Epoch.AddTicks(GetTimestamp());

        public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
        {
            var timer = new SteppedTimer(this, callback, state);
            timer.Change(dueTime, period);
            return timer;
        }

        public Task UntilATimerIsArmedAsync()
        {
            lock (_gate)
                return _armed.Count > 0 ? Task.CompletedTask : _nextArming.Task;
        }

        public void Advance(TimeSpan by)
        {
            List<SteppedTimer> due;
            lock (_gate)
            {
                _ticks += by.Ticks;
                due = _armed.Where(timer => timer.DueAt <= _ticks).ToList();
                _armed.RemoveAll(due.Contains);
            }

            foreach (var timer in due)
                timer.Fire();
        }

        private void Arm(SteppedTimer timer, TimeSpan dueTime)
        {
            TaskCompletionSource armed;
            lock (_gate)
            {
                _armed.Remove(timer);
                if (dueTime == Timeout.InfiniteTimeSpan)
                    return;
                timer.DueAt = _ticks + dueTime.Ticks;
                _armed.Add(timer);
                armed = _nextArming;
                _nextArming = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            }

            armed.TrySetResult();
        }

        private void Disarm(SteppedTimer timer)
        {
            lock (_gate)
                _armed.Remove(timer);
        }

        private sealed class SteppedTimer(SteppedClock clock, TimerCallback callback, object? state) : ITimer
        {
            public long DueAt { get; set; }

            public bool Change(TimeSpan dueTime, TimeSpan period)
            {
                clock.Arm(this, dueTime);
                return true;
            }

            public void Fire() => callback(state);

            public void Dispose() => clock.Disarm(this);

            public ValueTask DisposeAsync()
            {
                Dispose();
                return ValueTask.CompletedTask;
            }
        }
    }

    private static readonly TimeSpan StalledAfter = TimeSpan.FromSeconds(10);

    private static async Task RunUntilDoneAsync(Task streaming, SteppedClock clock, TimeSpan step)
    {
        while (!streaming.IsCompleted)
        {
            await Task.WhenAny(clock.UntilATimerIsArmedAsync(), streaming).WaitAsync(StalledAfter);
            clock.Advance(step);
        }

        await streaming;
    }

    private static (ActionContext Context, MemoryStream Body) Context(IEventPresenceRepository presence, TimeProvider? clock = null)
    {
        var services = new ServiceCollection()
            .AddSingleton(presence)
            .AddSingleton(clock ?? TimeProvider.System)
            .AddSingleton(typeof(ILogger<>), typeof(NullLogger<>))
            .BuildServiceProvider();
        var body = new MemoryStream();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Response.Body = body;
        return (new ActionContext(http, new RouteData(), new ActionDescriptor()), body);
    }

    private static EventLiveOptions ShortStream(int lifetimeMs = 300) => new()
    {
        StreamLifetime = TimeSpan.FromMilliseconds(lifetimeMs),
        PresenceRefresh = TimeSpan.FromMilliseconds(50),
        KeepAliveInterval = TimeSpan.FromMilliseconds(100)
    };

    [Fact]
    public async Task ExecuteResultAsync_PresenceStoreDown_KeepsStreamingAndReleasesTheLease()
    {
        var presence = new Mock<IEventPresenceRepository>();
        presence
            .Setup(r => r.TouchAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("mongo down"));
        var clock = new SteppedClock();
        var (context, body) = Context(presence.Object, clock);
        var lease = new CountingLease();
        var result = new EventStreamResult(
            new EventStreamAccess("evt-1", "soiree", "p-1"),
            new SilentFeed(),
            new EventLiveOptions
            {
                StreamLifetime = TimeSpan.FromMinutes(10),
                PresenceRefresh = TimeSpan.FromMinutes(1),
                KeepAliveInterval = TimeSpan.FromMinutes(2)
            },
            lease);

        await RunUntilDoneAsync(result.ExecuteResultAsync(context), clock, step: TimeSpan.FromMinutes(1));

        var written = Encoding.UTF8.GetString(body.ToArray());
        Assert.Contains("event: ready", written);
        Assert.Contains("event: ping", written);
        Assert.Equal(1, lease.Disposals);
        presence.Verify(
            r => r.TouchAsync("evt-1", "p-1", It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.AtLeast(2));
    }

    [Fact]
    public async Task ExecuteResultAsync_ClientGone_EndsQuietlyAndReleasesTheLease()
    {
        var (context, _) = Context(Mock.Of<IEventPresenceRepository>());
        using var aborted = new CancellationTokenSource();
        context.HttpContext.RequestAborted = aborted.Token;
        context.HttpContext.Response.Body = new ThrowingOnceAbortedStream(aborted);
        var lease = new CountingLease();
        var result = new EventStreamResult(
            new EventStreamAccess("evt-1", "soiree", null),
            new SilentFeed(),
            ShortStream(),
            lease);

        await result.ExecuteResultAsync(context);

        Assert.Equal(1, lease.Disposals);
    }

    [Fact]
    public async Task ExecuteResultAsync_ReplacedByANewerStreamOfTheSameTab_EndsBeforeItsLifetime()
    {
        var (context, _) = Context(Mock.Of<IEventPresenceRepository>());
        var lease = new CountingLease();
        var result = new EventStreamResult(
            new EventStreamAccess("evt-1", "soiree", "p-1"),
            new SilentFeed(),
            ShortStream(lifetimeMs: 30_000),
            lease);

        var streaming = result.ExecuteResultAsync(context);
        await Task.Delay(200);
        lease.IsReplaced = true;
        await streaming.WaitAsync(TimeSpan.FromSeconds(10));

        Assert.Equal(1, lease.Disposals);
    }

    private sealed class ThrowingOnceAbortedStream(CancellationTokenSource aborted) : MemoryStream
    {
        public override Task FlushAsync(CancellationToken cancellationToken)
        {
            aborted.Cancel();
            throw new IOException("connection reset by peer");
        }
    }
}
