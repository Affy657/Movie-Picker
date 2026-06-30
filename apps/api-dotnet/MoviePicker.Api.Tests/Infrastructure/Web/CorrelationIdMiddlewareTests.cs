using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CorrelationIdMiddlewareTests
{
    private static async Task<(HttpContext Ctx, string Id)> RunAsync(Action<HttpContext>? arrange = null)
    {
        var ctx = new DefaultHttpContext();
        arrange?.Invoke(ctx);
        var mw = new CorrelationIdMiddleware(_ => Task.CompletedTask, NullLogger<CorrelationIdMiddleware>.Instance);

        await mw.InvokeAsync(ctx);

        var id = (string)ctx.Items[CorrelationIdConstants.ItemKey]!;
        return (ctx, id);
    }

    [Fact]
    public async Task InvokeAsync_NoHeader_GeneratesGuid_AndSetsResponseHeader()
    {
        var (ctx, id) = await RunAsync();

        Assert.Equal(32, id.Length);
        Assert.True(id.All(Uri.IsHexDigit));
        Assert.Equal(id, ctx.Response.Headers[CorrelationIdConstants.ResponseHeaderName].ToString());
    }

    [Fact]
    public async Task InvokeAsync_UsesIncomingRequestId()
    {
        var (_, id) = await RunAsync(c => c.Request.Headers["X-Request-Id"] = "abc-123");

        Assert.Equal("abc-123", id);
    }

    [Fact]
    public async Task InvokeAsync_UsesIncomingCorrelationId()
    {
        var (_, id) = await RunAsync(c => c.Request.Headers["X-Correlation-Id"] = "corr-9");

        Assert.Equal("corr-9", id);
    }

    [Fact]
    public async Task InvokeAsync_TooLongHeader_FallsBackToGuid()
    {
        var (_, id) = await RunAsync(c => c.Request.Headers["X-Request-Id"] = new string('a', 200));

        Assert.Equal(32, id.Length);
    }

    [Fact]
    public async Task InvokeAsync_WhitespaceHeader_FallsBackToGuid()
    {
        var (_, id) = await RunAsync(c => c.Request.Headers["X-Request-Id"] = "   ");

        Assert.Equal(32, id.Length);
    }
}
