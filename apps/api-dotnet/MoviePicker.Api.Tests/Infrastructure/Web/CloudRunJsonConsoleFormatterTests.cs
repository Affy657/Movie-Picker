using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CloudRunJsonConsoleFormatterTests
{
    private sealed class FixedOptions(JsonConsoleFormatterOptions value) : IOptionsMonitor<JsonConsoleFormatterOptions>
    {
        public JsonConsoleFormatterOptions CurrentValue { get; } = value;

        public JsonConsoleFormatterOptions Get(string? name) => CurrentValue;

        public IDisposable? OnChange(Action<JsonConsoleFormatterOptions, string?> listener) => null;
    }

    private static JsonElement Format(LogLevel level, Exception? exception = null, IExternalScopeProvider? scopes = null)
    {
        var formatter = new CloudRunJsonConsoleFormatter(new FixedOptions(new JsonConsoleFormatterOptions
        {
            IncludeScopes = true,
            TimestampFormat = "O"
        }));
        IReadOnlyList<KeyValuePair<string, object?>> state =
        [
            new("UserId", "u1"),
            new("Attempts", 3),
            new("{OriginalFormat}", "User registered: {UserId}")
        ];
        using var output = new StringWriter();

        formatter.Write(
            new LogEntry<IReadOnlyList<KeyValuePair<string, object?>>>(
                level, "MoviePicker.Api.Register", new EventId(7), state, exception, (_, _) => "User registered: u1"),
            scopes,
            output);

        return JsonElement.Parse(output.ToString());
    }

    [Theory]
    [InlineData(LogLevel.Debug, "DEBUG")]
    [InlineData(LogLevel.Information, "INFO")]
    [InlineData(LogLevel.Warning, "WARNING")]
    [InlineData(LogLevel.Error, "ERROR")]
    [InlineData(LogLevel.Critical, "CRITICAL")]
    public void Write_GradesTheEntryForCloudLogging(LogLevel level, string severity)
    {
        Assert.Equal(severity, Format(level).GetProperty("severity").GetString());
    }

    [Fact]
    public void Write_KeepsTheShapeThatLogBasedAlertsRead()
    {
        var entry = Format(LogLevel.Information);

        Assert.Equal("MoviePicker.Api.Register", entry.GetProperty("Category").GetString());
        Assert.Equal("Information", entry.GetProperty("LogLevel").GetString());
        Assert.Equal("User registered: u1", entry.GetProperty("Message").GetString());
        var state = entry.GetProperty("State");
        Assert.Equal("User registered: {UserId}", state.GetProperty("{OriginalFormat}").GetString());
        Assert.Equal("u1", state.GetProperty("UserId").GetString());
        Assert.Equal(3, state.GetProperty("Attempts").GetInt32());
    }

    [Fact]
    public void Write_Exception_IsSerializedWithTheEntry()
    {
        var entry = Format(LogLevel.Error, new InvalidOperationException("boom"));

        Assert.Contains("boom", entry.GetProperty("Exception").GetString());
    }

    [Fact]
    public void Write_Scopes_AreListed()
    {
        var scopes = new LoggerExternalScopeProvider();
        using var _ = scopes.Push(new Dictionary<string, object?> { ["RequestId"] = "req-9" });

        var entry = Format(LogLevel.Information, scopes: scopes);

        Assert.Equal("req-9", entry.GetProperty("Scopes")[0].GetProperty("RequestId").GetString());
    }

    [Fact]
    public void Write_MasksTheInviteTokenOfAListJoinPath_InTheMessageTheStateAndTheRequestScope()
    {
        const string path = "/api/v1/lists/join/SECRET-TOKEN";
        var formatter = new CloudRunJsonConsoleFormatter(new FixedOptions(new JsonConsoleFormatterOptions { IncludeScopes = true }));
        var scopes = new LoggerExternalScopeProvider();
        using var _ = scopes.Push(new HostingLikeRequestScope(path));
        IReadOnlyList<KeyValuePair<string, object?>> state =
        [
            new("Path", path),
            new("{OriginalFormat}", "Unhandled exception on {Path}")
        ];
        using var output = new StringWriter();

        formatter.Write(
            new LogEntry<IReadOnlyList<KeyValuePair<string, object?>>>(
                LogLevel.Error,
                "MoviePicker.Api.Infrastructure.Web.UnhandledExceptionResponse",
                new EventId(0),
                state,
                new InvalidOperationException($"Failed on {path}"),
                (_, _) => $"Unhandled exception on {path}"),
            scopes,
            output);

        var written = output.ToString();
        Assert.DoesNotContain("SECRET-TOKEN", written);
        var entry = JsonElement.Parse(written);
        Assert.Equal("Unhandled exception on /api/v1/lists/join/***", entry.GetProperty("Message").GetString());
        Assert.Equal("/api/v1/lists/join/***", entry.GetProperty("State").GetProperty("Path").GetString());
        var scope = entry.GetProperty("Scopes")[0];
        Assert.Equal("/api/v1/lists/join/***", scope.GetProperty("RequestPath").GetString());
        Assert.Equal("RequestPath:/api/v1/lists/join/*** RequestId:0HN1", scope.GetProperty("Message").GetString());
    }

    private sealed class HostingLikeRequestScope(string path) : IReadOnlyList<KeyValuePair<string, object?>>
    {
        private readonly KeyValuePair<string, object?>[] _pairs = [new("RequestId", "0HN1"), new("RequestPath", path)];

        public int Count => _pairs.Length;

        public KeyValuePair<string, object?> this[int index] => _pairs[index];

        public IEnumerator<KeyValuePair<string, object?>> GetEnumerator() =>
            ((IEnumerable<KeyValuePair<string, object?>>)_pairs).GetEnumerator();

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();

        public override string ToString() => $"RequestPath:{path} RequestId:0HN1";
    }
}
