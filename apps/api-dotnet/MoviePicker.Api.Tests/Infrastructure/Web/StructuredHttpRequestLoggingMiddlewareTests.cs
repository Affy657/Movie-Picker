using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
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
    public async Task InvokeAsync_ReplacesTheControlCharactersOfThePathAndQuery()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";
        ctx.Request.Path = "/api/v1/movies\u001b[31m";
        ctx.Request.QueryString = new QueryString("?q=a\tb");
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain(entry.Message, char.IsControl);
        Assert.Contains("HTTP GET /api/v1/movies [31m?q=a b", entry.Message);
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

    [Theory]
    [InlineData("/signin-google")]
    [InlineData("/signin-github")]
    public async Task InvokeAsync_RedactsTheOAuthCodeAndStateOfASignInCallback(string callbackPath)
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";
        ctx.Request.Path = callbackPath;
        ctx.Request.QueryString = new QueryString("?state=CfDJ8-STATE&code=4%2F0AUTH-CODE&scope=email");
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain("CfDJ8-STATE", entry.Message);
        Assert.DoesNotContain("AUTH-CODE", entry.Message);
        Assert.Contains("?state=***&code=***&scope=email", entry.Message);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("POST")]
    public async Task InvokeAsync_MasksTheInviteTokenOfAListJoinPath(string method)
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = method;
        ctx.Request.Path = "/api/v1/lists/join/SECRET-INVITE-TOKEN";
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain("SECRET-INVITE-TOKEN", entry.Message);
        Assert.Contains($"HTTP {method} /api/v1/lists/join/*** ", entry.Message);
        Assert.DoesNotContain(
            Assert.Single(logger.States),
            pair => Convert.ToString(pair.Value, System.Globalization.CultureInfo.InvariantCulture)?.Contains("SECRET", StringComparison.Ordinal) == true);
    }

    [Fact]
    public async Task InvokeAsync_MasksTheInviteTokenCarriedByAReturnTo()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";
        ctx.Request.Path = "/api/v1/auth/oauth/google/start";
        ctx.Request.QueryString = new QueryString("?returnTo=%2Fl%2FSECRET%2Frejoindre");
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain("SECRET", entry.Message);
        Assert.Contains("/api/v1/auth/oauth/google/start?returnTo=*** ", entry.Message);
        Assert.DoesNotContain(
            Assert.Single(logger.States),
            pair => Convert.ToString(pair.Value, System.Globalization.CultureInfo.InvariantCulture)?.Contains("SECRET", StringComparison.Ordinal) == true);
    }

    [Fact]
    public async Task UnhandledExceptionResponse_LogsThePathWithoutTheInviteToken()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var loggers = new Mock<ILoggerFactory>();
        loggers.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(logger);
        var ctx = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddSingleton(loggers.Object).BuildServiceProvider()
        };
        ctx.Request.Method = "POST";
        ctx.Request.Path = "/api/v1/lists/join/SECRET-INVITE-TOKEN";
        ctx.Features.Set<IExceptionHandlerFeature>(new ExceptionHandlerFeature
        {
            Error = new InvalidOperationException("boom"),
            Path = ctx.Request.Path
        });

        await UnhandledExceptionResponse.WriteAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Error, entry.Level);
        Assert.DoesNotContain("SECRET-INVITE-TOKEN", entry.Message);
        Assert.Contains("/api/v1/lists/join/***", entry.Message);
    }

    [Fact]
    public async Task UnhandledExceptionResponse_LogsTheMethodAndPathWithoutLineBreakNorControlCharacter()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var loggers = new Mock<ILoggerFactory>();
        loggers.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(logger);
        var ctx = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddSingleton(loggers.Object).BuildServiceProvider()
        };
        ctx.Request.Method = "POST\r\nforged";
        ctx.Request.Path = "/api/v1/movies\n\u001b[31mforged";
        ctx.Features.Set<IExceptionHandlerFeature>(new ExceptionHandlerFeature
        {
            Error = new InvalidOperationException("boom"),
            Path = ctx.Request.Path
        });

        await UnhandledExceptionResponse.WriteAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain(entry.Message, char.IsControl);
        Assert.Equal("Unhandled exception on POST forged /api/v1/movies  [31mforged", entry.Message);
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
    [InlineData("?code=SECRET&state=OPAQUE", "?code=***&state=***")]
    [InlineData("?Code=SECRET&State=OPAQUE", "?Code=***&State=***")]
    [InlineData("?language=fr-FR", "?language=fr-FR")]
    [InlineData("?returnTo=%2Fl%2FSECRET%2Frejoindre", "?returnTo=***")]
    [InlineData("?ReturnTo=/l/SECRET/rejoindre&x=1", "?ReturnTo=***&x=1")]
    [InlineData("?returnTo=%2Fl%2FSECRET", "?returnTo=***")]
    [InlineData("?returnTo=%2Fsoiree%2Fabc%3Fhost%3DSECRET", "?returnTo=***")]
    [InlineData("?returnTo=%2Fsoirees", "?returnTo=%2Fsoirees")]
    [InlineData("?returnTo=%2Fusers%2Fl%2Ffilms", "?returnTo=%2Fusers%2Fl%2Ffilms")]
    [InlineData("?returnTo=%E0%A4%A", "?returnTo=%E0%A4%A")]
    public void SensitiveQueryRedaction_MasksEverySecretBearingKey(string query, string expected)
    {
        Assert.Equal(expected, SensitiveQueryRedaction.RedactQueryString(query));
    }

    [Theory]
    [InlineData("/api/v1/lists/join/SECRET", "/api/v1/lists/join/***")]
    [InlineData("/api/v1/Lists/Join/SECRET", "/api/v1/Lists/Join/***")]
    [InlineData("/api/v1/lists/join/SECRET/", "/api/v1/lists/join/***/")]
    [InlineData("RequestPath:/api/v1/lists/join/SECRET RequestId:0HN1", "RequestPath:/api/v1/lists/join/*** RequestId:0HN1")]
    [InlineData("/api/v1/lists/join/", "/api/v1/lists/join/")]
    [InlineData("/api/v1/lists/66f0a1/members", "/api/v1/lists/66f0a1/members")]
    [InlineData("/l/SECRET/rejoindre", "/l/***/rejoindre")]
    [InlineData("/L/SECRET", "/L/***")]
    [InlineData("https://movie-picker.fr/l/SECRET/rejoindre?x=1", "https://movie-picker.fr/l/***/rejoindre?x=1")]
    [InlineData("Referer: https://movie-picker.fr/l/SECRET/rejoindre", "Referer: https://movie-picker.fr/l/***/rejoindre")]
    [InlineData("returnTo=/l/SECRET/rejoindre", "returnTo=/l/***/rejoindre")]
    [InlineData("/l/", "/l/")]
    [InlineData("/api/v1/users/l/proposed-movies", "/api/v1/users/l/proposed-movies")]
    [InlineData("", "")]
    [InlineData(null, null)]
    public void SensitiveQueryRedaction_MasksTheInviteTokenOfAListJoinPath(string? path, string? expected)
    {
        Assert.Equal(expected, SensitiveQueryRedaction.RedactPath(path));
    }

    [Fact]
    public void SensitiveQueryRedaction_RedactUrl_MasksTheInviteTokenAndTheSecretQueryKeys()
    {
        Assert.Equal(
            "https://api.test/api/v1/lists/join/***?token=***&x=1",
            SensitiveQueryRedaction.RedactUrl("https://api.test/api/v1/lists/join/SECRET?token=SECRET&x=1"));
        Assert.Equal(
            "https://api.test/api/v1/lists/join/***",
            SensitiveQueryRedaction.RedactUrl("https://api.test/api/v1/lists/join/SECRET"));
        Assert.Equal(
            "https://api.test/api/v1/auth/oauth/github/start?returnTo=***",
            SensitiveQueryRedaction.RedactUrl("https://api.test/api/v1/auth/oauth/github/start?returnTo=%2Fl%2FSECRET%2Frejoindre"));
    }
}
