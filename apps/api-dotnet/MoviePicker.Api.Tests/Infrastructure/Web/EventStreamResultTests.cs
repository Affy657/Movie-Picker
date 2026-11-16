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

    private sealed class CountingLease : IDisposable
    {
        public int Disposals { get; private set; }

        public void Dispose() => Disposals += 1;
    }

    private static (ActionContext Context, MemoryStream Body) Context(IEventPresenceRepository presence)
    {
        var services = new ServiceCollection()
            .AddSingleton(presence)
            .AddSingleton(TimeProvider.System)
            .AddSingleton(typeof(ILogger<>), typeof(NullLogger<>))
            .BuildServiceProvider();
        var body = new MemoryStream();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Response.Body = body;
        return (new ActionContext(http, new RouteData(), new ActionDescriptor()), body);
    }

    private static EventLiveOptions ShortStream() => new()
    {
        StreamLifetime = TimeSpan.FromMilliseconds(300),
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
        var (context, body) = Context(presence.Object);
        var lease = new CountingLease();
        var result = new EventStreamResult(
            new EventStreamAccess("evt-1", "soiree", "p-1"),
            new SilentFeed(),
            ShortStream(),
            lease);

        await result.ExecuteResultAsync(context);

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

    private sealed class ThrowingOnceAbortedStream(CancellationTokenSource aborted) : MemoryStream
    {
        public override Task FlushAsync(CancellationToken cancellationToken)
        {
            aborted.Cancel();
            throw new IOException("connection reset by peer");
        }
    }
}
