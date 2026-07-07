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
}
