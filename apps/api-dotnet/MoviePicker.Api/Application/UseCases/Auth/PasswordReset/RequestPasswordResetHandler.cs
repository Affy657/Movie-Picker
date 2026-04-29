using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Email;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public sealed class RequestPasswordResetHandler : IRequestPasswordResetHandler
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan ResendThrottle = TimeSpan.FromSeconds(60);

    private readonly IUserRepository _users;
    private readonly IPasswordResetTokenRepository _tokens;
    private readonly IEmailSender _emailSender;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;
    private readonly ILogger<RequestPasswordResetHandler> _logger;

    public RequestPasswordResetHandler(
        IUserRepository users,
        IPasswordResetTokenRepository tokens,
        IEmailSender emailSender,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock,
        ILogger<RequestPasswordResetHandler> logger)
    {
        _users = users;
        _tokens = tokens;
        _emailSender = emailSender;
        _options = options.Value;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(
        PasswordResetRequest request,
        string? clientIp,
        string? userAgent,
        CancellationToken ct = default)
    {
        var email = (request.Email ?? "").Trim();
        if (string.IsNullOrEmpty(email))
            return;

        var user = await _users.GetByEmailAsync(email, ct);
        if (user is null)
        {
            _logger.LogInformation("PasswordReset.Request: unknown email {EmailMasked}", EmailMasking.Mask(email));
            return;
        }

        var now = _clock.GetUtcNow();

        // Throttle 60s : ne créer un nouveau token que si pas de token actif récent
        var recent = await _tokens.GetMostRecentForUserAsync(user.Id, ct);
        if (recent is not null
            && recent.ConsumedAt is null
            && (now - recent.CreatedAt) < ResendThrottle)
        {
            _logger.LogInformation("PasswordReset.Request: throttled for {EmailMasked}", EmailMasking.Mask(email));
            return;
        }

        var (plain, hash) = PasswordResetTokenFactory.Generate();
        var token = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAtUtc = now.Add(TokenLifetime),
            CreatedAt = now,
            RequestIp = clientIp,
            RequestUserAgent = userAgent,
        };

        var saved = await _tokens.AddAsync(token, ct);

        var baseUrl = _options.PublicWebBaseUrl?.TrimEnd('/') ?? "";
        var resetUrl = new Uri($"{baseUrl}/reset?token={Uri.EscapeDataString(plain)}");
        var emailMessage = PasswordResetEmailFactory.Build(user.Email, user.DisplayName, resetUrl, request.Locale);

        try
        {
            await _emailSender.SendAsync(emailMessage, ct);
            _logger.LogInformation("PasswordReset.Request: email sent to {EmailMasked} (tokenId={TokenId})",
                EmailMasking.Mask(email), saved.Id);
        }
        catch (EmailDeliveryException ex)
        {
            _logger.LogWarning(ex,
                "PasswordReset.Request: email send failed for {EmailMasked} (tokenId={TokenId}, status={Status})",
                EmailMasking.Mask(email), saved.Id, ex.StatusCode);
        }
    }
}
