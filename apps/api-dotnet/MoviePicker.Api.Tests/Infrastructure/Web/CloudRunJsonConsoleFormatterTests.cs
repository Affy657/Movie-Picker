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

        return JsonDocument.Parse(output.ToString()).RootElement.Clone();
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
}
