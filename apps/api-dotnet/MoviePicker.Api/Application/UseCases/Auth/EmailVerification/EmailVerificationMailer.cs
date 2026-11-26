using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public sealed class EmailVerificationMailer : IEmailVerificationMailer
{
    public const string EmailQuotaScope = "email-verification-email";
    public const int MaxEmailsPerAddressPerDay = 5;

    public static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(48);

    private static readonly TimeSpan ResendThrottle = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan EmailQuotaWindow = TimeSpan.FromHours(24);

    private readonly IEmailVerificationTokenRepository _tokens;
    private readonly IEmailSender _emailSender;
    private readonly MoviePickerOptions _options;
    private readonly ISharedQuota _quota;
    private readonly TimeProvider _clock;
    private readonly ILogger<EmailVerificationMailer> _logger;

    public EmailVerificationMailer(
        IEmailVerificationTokenRepository tokens,
        IEmailSender emailSender,
        IOptions<MoviePickerOptions> options,
        ISharedQuota quota,
        TimeProvider clock,
        ILogger<EmailVerificationMailer> logger)
    {
        _tokens = tokens;
        _emailSender = emailSender;
        _options = options.Value;
        _quota = quota;
        _clock = clock;
        _logger = logger;
    }

    public async Task SendAsync(User user, string? locale, CancellationToken ct = default)
    {
        if (user.EmailVerifiedAt is not null)
            return;

        var now = _clock.GetUtcNow();
        if (await WasJustSentAsync(user.Id, now, ct))
        {
            _logger.LogInformation("EmailVerification: throttled for {UserId}", user.Id);
            return;
        }

        if (!await _quota.TryConsumeAsync(
            EmailQuotaScope, user.Email.ToLowerInvariant(), MaxEmailsPerAddressPerDay, EmailQuotaWindow, ct))
        {
            _logger.LogWarning("EmailVerification: daily cap reached for {EmailMasked}", EmailMasking.Mask(user.Email));
            return;
        }

        var (plain, hash) = PasswordResetTokenFactory.Generate();
        var issued = await _tokens.AddAsync(
            new EmailVerificationToken
            {
                UserId = user.Id,
                TokenHash = hash,
                CreatedAt = now,
                ExpiresAtUtc = now.Add(TokenLifetime)
            },
            ct);

        var confirmationUrl = new Uri((_options.PublicWebBaseUrl?.TrimEnd('/') ?? "") + FrontRoutes.VerifyEmailWithToken(plain));
        try
        {
            await _emailSender.SendAsync(EmailVerificationEmailFactory.Build(user.Email, confirmationUrl, locale), ct);
            _logger.LogInformation(
                "EmailVerification: email sent to {EmailMasked} (tokenId={TokenId})", EmailMasking.Mask(user.Email), issued.Id);
        }
        catch (EmailDeliveryException ex)
        {
            _logger.LogWarning(
                ex,
                "EmailVerification: email send failed for {EmailMasked} (tokenId={TokenId}, status={Status})",
                EmailMasking.Mask(user.Email), issued.Id, ex.StatusCode);
        }
    }

    private async Task<bool> WasJustSentAsync(string userId, DateTimeOffset now, CancellationToken ct) =>
        await _tokens.GetLatestForUserAsync(userId, ct) is { ConsumedAt: null } latest
        && now - latest.CreatedAt < ResendThrottle;
}
