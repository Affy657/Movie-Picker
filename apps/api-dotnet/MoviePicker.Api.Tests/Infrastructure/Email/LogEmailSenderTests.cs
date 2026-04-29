using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Email;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Email;

public class LogEmailSenderTests
{
    [Fact]
    public async Task SendAsync_LogsTagAndMaskedEmailAndExtractedLink()
    {
        var logger = new CapturingLogger<LogEmailSender>();
        var sender = new LogEmailSender(logger);
        var msg = new EmailMessage(
            ToEmail: "alice.smith@example.com",
            ToName: "Alice",
            Subject: "Test subject",
            HtmlBody: "<a href=\"https://web.movie-picker.fr/reset?token=abc123\">link</a>",
            TextBody: "Open https://web.movie-picker.fr/reset?token=abc123",
            Tag: "password-reset");

        await sender.SendAsync(msg);

        Assert.Single(logger.Entries);
        var entry = logger.Entries[0];
        Assert.Equal(LogLevel.Information, entry.Level);
        Assert.Contains("password-reset", entry.Message);
        Assert.Contains("a***@example.com", entry.Message); // email masqué
        Assert.Contains("Test subject", entry.Message);
        Assert.Contains("https://web.movie-picker.fr/reset?token=abc123", entry.Message);
    }

    [Fact]
    public async Task SendAsync_WithNoTag_LogsNAForTag()
    {
        var logger = new CapturingLogger<LogEmailSender>();
        var sender = new LogEmailSender(logger);
        var msg = new EmailMessage("u@x.fr", "X", "S", "<p>hello</p>", "hello", Tag: null);

        await sender.SendAsync(msg);

        Assert.Single(logger.Entries);
        Assert.Contains("n/a", logger.Entries[0].Message);
    }

    [Fact]
    public async Task SendAsync_WithoutLinkInHtml_LogsNoneForLink()
    {
        var logger = new CapturingLogger<LogEmailSender>();
        var sender = new LogEmailSender(logger);
        var msg = new EmailMessage("u@x.fr", "X", "S", "<p>no link here</p>", "no link", "tag");

        await sender.SendAsync(msg);

        Assert.Contains("(none)", logger.Entries[0].Message);
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message, Exception? Ex)> Entries { get; } = new();
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception), exception));
        private sealed class NullScope : IDisposable { public static readonly NullScope Instance = new(); public void Dispose() { } }
    }
}
