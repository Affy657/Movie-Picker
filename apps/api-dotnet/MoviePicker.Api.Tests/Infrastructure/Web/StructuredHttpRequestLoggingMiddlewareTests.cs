using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.Logging;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class StructuredHttpRequestLoggingMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_LogsRequest_AndCallsNext()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";
        ctx.Request.Path = "/api/v1/auth/login";
        var nextCalled = false;
        var mw = new StructuredHttpRequestLoggingMiddleware(
            c => { nextCalled = true; c.Response.StatusCode = 200; return Task.CompletedTask; },
            logger);

        await mw.InvokeAsync(ctx);

        Assert.True(nextCalled);
        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Information, entry.Level);
    }

    [Fact]
    public async Task InvokeAsync_UnhandledFailure_IsLoggedAsA500AndRethrown()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";
        ctx.Request.Path = "/api/v1/auth/me";
        var mw = new StructuredHttpRequestLoggingMiddleware(
            _ => throw new InvalidOperationException("session store unreachable"),
            logger);

        await Assert.ThrowsAsync<InvalidOperationException>(() => mw.InvokeAsync(ctx));

        var entry = Assert.Single(logger.Entries);
        Assert.Contains("→ 500 ", entry.Message);
    }

    [Fact]
    public async Task InvokeAsync_KeepsPathAndQueryOnOneLine_WhenTheyCarryLineBreaks()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET" + Environment.NewLine + "forged";
        ctx.Request.Path = "/api/v1/movies\r\nforged";
        ctx.Request.QueryString = new QueryString("?q=a\nb");
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain('\n', entry.Message);
        Assert.DoesNotContain('\r', entry.Message);
        Assert.Contains("HTTP GET forged /api/v1/movies forged", entry.Message);
        Assert.Contains("?q=a b", entry.Message);
    }

    [Fact]
    public async Task InvokeAsync_RedactsHostTokenInQueryString()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "POST";
        ctx.Request.Path = "/api/v1/events/abc/wheel";
        ctx.Request.QueryString = new QueryString("?host=SECRET-TOKEN&participantId=p1");
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain("SECRET-TOKEN", entry.Message);
        Assert.Contains("?host=***&participantId=p1", entry.Message);
    }

    [Fact]
    public async Task InvokeAsync_StillLogs_WhenNextThrows()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var mw = new StructuredHttpRequestLoggingMiddleware(
            _ => throw new InvalidOperationException("boom"),
            logger);

        await Assert.ThrowsAsync<InvalidOperationException>(() => mw.InvokeAsync(new DefaultHttpContext()));

        Assert.Single(logger.Entries);
    }

    [Theory]
    [InlineData(true, "account")]
    [InlineData(false, "anonymous")]
    public async Task InvokeAsync_TellsASignedInCallerFromAnAnonymousOne(bool signedIn, string expectedCaller)
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "POST";
        ctx.Request.Path = "/api/v1/events/soiree/movies/m1/vote";
        var mw = new StructuredHttpRequestLoggingMiddleware(
            c =>
            {
                if (signedIn)
                    c.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "u1")], "Cookies"));
                c.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                return Task.CompletedTask;
            },
            logger);

        await mw.InvokeAsync(ctx);

        var state = Assert.Single(logger.States);
        Assert.Contains(state, pair => pair.Key == "Caller" && Equals(pair.Value, expectedCaller));
        Assert.Contains(state, pair => pair.Key == "StatusCode" && Equals(pair.Value, 429));
    }

    [Theory]
    [InlineData("?host=SECRET&x=1", "?host=***&x=1")]
    [InlineData("?token=SECRET", "?token=***")]
    [InlineData("?api_key=SECRET&language=fr-FR", "?api_key=***&language=fr-FR")]
    [InlineData("?API_KEY=SECRET", "?API_KEY=***")]
    [InlineData("?language=fr-FR", "?language=fr-FR")]
    public void SensitiveQueryRedaction_MasksEverySecretBearingKey(string query, string expected)
    {
        Assert.Equal(expected, SensitiveQueryRedaction.RedactQueryString(query));
    }
}
