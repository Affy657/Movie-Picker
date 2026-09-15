using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_AddsSecurityHeaders_AndCallsNext()
    {
        var ctx = new DefaultHttpContext();
        var nextCalled = false;
        var mw = new SecurityHeadersMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);

        Assert.True(nextCalled);
        var h = ctx.Response.Headers;
        Assert.Equal("nosniff", h.XContentTypeOptions);
        Assert.Equal("DENY", h.XFrameOptions);
        Assert.Equal("no-referrer", h["Referrer-Policy"]);
        Assert.Contains("microphone=()", h["Permissions-Policy"].ToString());
        Assert.Contains("default-src 'none'", h.ContentSecurityPolicy.ToString());
    }

    [Fact]
    public async Task InvokeAsync_AddsHsts_WhenRequestIsHttps()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Scheme = "https";
        var mw = new SecurityHeadersMiddleware(_ => Task.CompletedTask);

        await mw.InvokeAsync(ctx);

        Assert.Equal(
            "max-age=63072000; includeSubDomains",
            ctx.Response.Headers.StrictTransportSecurity.ToString());
    }

    [Fact]
    public async Task InvokeAsync_OmitsHsts_WhenRequestIsPlainHttp()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Scheme = "http";
        var mw = new SecurityHeadersMiddleware(_ => Task.CompletedTask);

        await mw.InvokeAsync(ctx);

        Assert.False(ctx.Response.Headers.ContainsKey("Strict-Transport-Security"));
    }
}
