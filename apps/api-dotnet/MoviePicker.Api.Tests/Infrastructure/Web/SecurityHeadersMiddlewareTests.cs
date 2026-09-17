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
    public async Task InvokeAsync_ForbidsStoringTheResponse_WhenTheEndpointSaysNothing()
    {
        var ctx = new DefaultHttpContext();
        var mw = new SecurityHeadersMiddleware(_ => Task.CompletedTask);

        await mw.InvokeAsync(ctx);

        Assert.Equal("no-store", ctx.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task InvokeAsync_LetsTheEndpointOverrideTheCachePolicy()
    {
        var ctx = new DefaultHttpContext();
        var mw = new SecurityHeadersMiddleware(c =>
        {
            c.Response.Headers.CacheControl = "public, max-age=300";
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);

        Assert.Equal("public, max-age=300", ctx.Response.Headers.CacheControl.ToString());
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
