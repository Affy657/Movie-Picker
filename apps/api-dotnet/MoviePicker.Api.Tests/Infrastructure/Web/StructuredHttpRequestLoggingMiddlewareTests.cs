using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Infrastructure.Web;
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
    public async Task InvokeAsync_KeepsPathAndQueryOnOneLine_WhenTheyCarryLineBreaks()
    {
        var logger = new CapturingLogger<StructuredHttpRequestLoggingMiddleware>();
        var ctx = new DefaultHttpContext();
        ctx.Request.Method = "GET";
        ctx.Request.Path = "/api/v1/movies\r\nforged";
        ctx.Request.QueryString = new QueryString("?q=a\nb");
        var mw = new StructuredHttpRequestLoggingMiddleware(_ => Task.CompletedTask, logger);

        await mw.InvokeAsync(ctx);

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain('\n', entry.Message);
        Assert.DoesNotContain('\r', entry.Message);
        Assert.Contains("/api/v1/movies forged", entry.Message);
        Assert.Contains("?q=a b", entry.Message);
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

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception)));

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}
