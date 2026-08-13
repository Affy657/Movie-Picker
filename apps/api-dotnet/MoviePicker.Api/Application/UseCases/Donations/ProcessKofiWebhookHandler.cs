using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Application.UseCases.Donations;

public sealed class ProcessKofiWebhookHandler : IProcessKofiWebhookHandler
{
    private static readonly string[] SupporterGrantingTypes = ["Donation", "Subscription"];

    private readonly IUserRepository _users;
    private readonly IKofiWebhookLogRepository _log;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;
    private readonly ILogger<ProcessKofiWebhookHandler> _logger;

    public ProcessKofiWebhookHandler(
        IUserRepository users,
        IKofiWebhookLogRepository log,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock,
        ILogger<ProcessKofiWebhookHandler> logger)
    {
        _users = users;
        _log = log;
        _options = options.Value;
        _clock = clock;
        _logger = logger;
    }

    public async Task<KofiWebhookOutcome> HandleAsync(string? rawData, CancellationToken ct = default)
    {
        var expectedToken = _options.KofiWebhookToken;
        if (string.IsNullOrWhiteSpace(expectedToken))
        {
            _logger.LogError("Webhook Ko-fi reçu alors que KOFI_WEBHOOK_TOKEN n'est pas configuré.");
            return KofiWebhookOutcome.NotConfigured;
        }

        var payload = TryParse(rawData);
        if (payload is null || string.IsNullOrWhiteSpace(payload.MessageId))
            return KofiWebhookOutcome.InvalidPayload;

        if (!TokensMatch(payload.VerificationToken, expectedToken))
        {
            _logger.LogWarning("Webhook Ko-fi rejeté : token de vérification invalide.");
            return KofiWebhookOutcome.InvalidToken;
        }

        var now = _clock.GetUtcNow();
        if (!await _log.TryRecordAsync(payload.MessageId, now, ct))
        {
            _logger.LogInformation("Webhook Ko-fi ignoré : message {MessageId} déjà traité.", payload.MessageId);
            return KofiWebhookOutcome.AlreadyProcessed;
        }

        if (!GrantsSupporterBadge(payload.Type))
        {
            _logger.LogInformation("Webhook Ko-fi sans badge : type {Type} non éligible.", payload.Type);
            return KofiWebhookOutcome.UnsupportedType;
        }

        if (string.IsNullOrWhiteSpace(payload.Email))
        {
            _logger.LogInformation("Webhook Ko-fi sans badge : aucune adresse e-mail transmise par Ko-fi.");
            return KofiWebhookOutcome.NoDonorEmail;
        }

        var user = await _users.GetByEmailAsync(payload.Email, ct);
        if (user is null)
        {
            _logger.LogInformation(
                "Webhook Ko-fi sans badge : aucun compte Movie Picker pour l'e-mail du don (message {MessageId}).",
                payload.MessageId);
            return KofiWebhookOutcome.NoMatchingAccount;
        }

        if (!await _users.MarkSupporterAsync(user.Id, now, ct))
        {
            _logger.LogInformation("Webhook Ko-fi : l'utilisateur {UserId} était déjà marqué soutien.", user.Id);
            return KofiWebhookOutcome.AlreadySupporter;
        }

        _logger.LogInformation("Webhook Ko-fi : badge soutien attribué à l'utilisateur {UserId}.", user.Id);
        return KofiWebhookOutcome.SupporterMarked;
    }

    private static KofiWebhookPayload? TryParse(string? rawData)
    {
        if (string.IsNullOrWhiteSpace(rawData))
            return null;

        try
        {
            return JsonSerializer.Deserialize<KofiWebhookPayload>(rawData);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static bool TokensMatch(string? received, string expected)
    {
        if (string.IsNullOrEmpty(received))
            return false;

        var receivedHash = SHA256.HashData(Encoding.UTF8.GetBytes(received));
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(receivedHash, expectedHash);
    }

    private static bool GrantsSupporterBadge(string? type) =>
        type is not null
        && SupporterGrantingTypes.Contains(type.Trim(), StringComparer.OrdinalIgnoreCase);

    private sealed record KofiWebhookPayload
    {
        [JsonPropertyName("verification_token")]
        public string? VerificationToken { get; init; }

        [JsonPropertyName("message_id")]
        public string? MessageId { get; init; }

        [JsonPropertyName("type")]
        public string? Type { get; init; }

        [JsonPropertyName("email")]
        public string? Email { get; init; }
    }
}
