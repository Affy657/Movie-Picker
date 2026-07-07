using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;

namespace MoviePicker.Api.Infrastructure.Email;

public sealed class LogEmailSender : IEmailSender
{
    private static readonly Regex HrefRegex = new("href=\"(?<url>[^\"]+)\"",
        RegexOptions.Compiled | RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));

    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var masked = EmailMasking.Mask(message.ToEmail);
        var link = ExtractFirstLink(message.HtmlBody);
        _logger.LogInformation(
            "[EMAIL][{Tag}] to={To} subject={Subject} link={Link}",
            message.Tag ?? "n/a",
            masked,
            message.Subject,
            link ?? "(none)");
        return Task.CompletedTask;
    }

    internal static string? ExtractFirstLink(string html)
    {
        if (string.IsNullOrEmpty(html))
            return null;
        var m = HrefRegex.Match(html);
        return m.Success ? m.Groups["url"].Value : null;
    }
}
