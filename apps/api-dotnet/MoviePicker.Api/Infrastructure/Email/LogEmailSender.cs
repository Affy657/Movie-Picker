using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Email;

/// <summary>
/// Émetteur d'emails « pour les logs » — utilisé en Development ou si <c>RESEND_API_KEY</c> est absente.
/// Pratique pour récupérer le lien de reset password directement dans la console <c>dotnet run</c>
/// sans configurer de provider transactionnel. Voir aussi <see cref="ResendEmailSender"/> pour la prod.
/// </summary>
public sealed class LogEmailSender : IEmailSender
{
    private static readonly Regex HrefRegex = new("href=\"(?<url>[^\"]+)\"",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var masked = MaskEmail(message.ToEmail);
        var link = ExtractFirstLink(message.HtmlBody);
        _logger.LogInformation(
            "[EMAIL][{Tag}] to={To} subject={Subject} link={Link}",
            message.Tag ?? "n/a",
            masked,
            message.Subject,
            link ?? "(none)");
        return Task.CompletedTask;
    }

    /// <summary>Masque l'email pour les logs : "alice@x.fr" → "a***@x.fr". Conserve le domaine pour le debug.</summary>
    public static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return "***";
        var at = email.IndexOf('@');
        if (at <= 0)
            return "***@malformed";
        var local = email[..at];
        var domain = email[(at + 1)..];
        var prefix = local.Length <= 2 ? local : local[..1];
        return $"{prefix}***@{domain}";
    }

    internal static string? ExtractFirstLink(string html)
    {
        if (string.IsNullOrEmpty(html))
            return null;
        var m = HrefRegex.Match(html);
        return m.Success ? m.Groups["url"].Value : null;
    }
}
