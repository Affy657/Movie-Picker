using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public sealed class ConfirmEmailVerificationHandler : IConfirmEmailVerificationHandler
{
    private readonly IUserRepository _users;
    private readonly IEmailVerificationTokenRepository _tokens;
    private readonly TimeProvider _clock;
    private readonly ILogger<ConfirmEmailVerificationHandler> _logger;

    public ConfirmEmailVerificationHandler(
        IUserRepository users,
        IEmailVerificationTokenRepository tokens,
        TimeProvider clock,
        ILogger<ConfirmEmailVerificationHandler> logger)
    {
        _users = users;
        _tokens = tokens;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(EmailVerificationConfirmRequest request, CancellationToken ct = default)
    {
        var token = (request.Token ?? "").Trim();
        if (token.Length == 0)
            throw Errors.InvalidEmailVerificationToken();

        var now = _clock.GetUtcNow();
        var stored = await _tokens.FindUnexpiredAsync(PasswordResetTokenFactory.Hash(token), now, ct);
        if (stored is null)
        {
            _logger.LogWarning("EmailVerification.Confirm: token not found or expired");
            throw Errors.InvalidEmailVerificationToken();
        }

        var user = await _users.GetByIdAsync(stored.UserId, ct);
        if (user is null)
        {
            _logger.LogWarning("EmailVerification.Confirm: account gone (userId={UserId})", stored.UserId);
            throw Errors.InvalidEmailVerificationToken();
        }

        if (user.EmailVerifiedAt is null)
            await _users.MarkEmailVerifiedAsync(user.Id, now, ct);
        await _tokens.ConsumeAllForUserAsync(user.Id, now, ct);

        _logger.LogInformation(
            "EmailVerification.Confirm: {EmailMasked} confirmed (userId={UserId}, tokenId={TokenId})",
            EmailMasking.Mask(user.Email), user.Id, stored.Id);
    }
}
