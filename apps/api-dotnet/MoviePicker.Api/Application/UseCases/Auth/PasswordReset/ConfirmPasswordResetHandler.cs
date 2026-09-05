using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public sealed class ConfirmPasswordResetHandler : IConfirmPasswordResetHandler
{
    private const string GenericTokenError = "Token invalide ou expiré.";
    private const string SuccessMessage = "Mot de passe réinitialisé. Connecte-toi avec ton nouveau mot de passe.";

    private readonly IUserRepository _users;
    private readonly IPasswordResetTokenRepository _tokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthSessionInvalidator _sessionInvalidator;
    private readonly TimeProvider _clock;
    private readonly ILogger<ConfirmPasswordResetHandler> _logger;

    public ConfirmPasswordResetHandler(
        IUserRepository users,
        IPasswordResetTokenRepository tokens,
        IPasswordHasher passwordHasher,
        IAuthSessionInvalidator sessionInvalidator,
        TimeProvider clock,
        ILogger<ConfirmPasswordResetHandler> logger)
    {
        _users = users;
        _tokens = tokens;
        _passwordHasher = passwordHasher;
        _sessionInvalidator = sessionInvalidator;
        _clock = clock;
        _logger = logger;
    }

    public async Task<PasswordResetConfirmResponse> HandleAsync(PasswordResetConfirmRequest request, CancellationToken ct = default)
    {
        var token = (request.Token ?? "").Trim();
        if (string.IsNullOrEmpty(token))
            throw new BadRequestException(GenericTokenError);

        var pwdErr = AuthInputValidation.ValidatePassword(request.NewPassword);
        if (pwdErr is not null)
            throw new BadRequestException(pwdErr);

        var hash = PasswordResetTokenFactory.Hash(token);
        var stored = await _tokens.GetByTokenHashAsync(hash, ct);
        if (stored is null)
        {
            _logger.LogWarning("PasswordReset.Confirm: token not found / expired / consumed");
            throw new BadRequestException(GenericTokenError);
        }

        var user = await _users.GetByIdAsync(stored.UserId, ct);
        if (user is null)
        {
            _logger.LogWarning("PasswordReset.Confirm: user gone (userId={UserId}, tokenId={TokenId})", stored.UserId, stored.Id);
            throw new BadRequestException(GenericTokenError);
        }

        var now = _clock.GetUtcNow();
        var newPasswordHash = _passwordHasher.Hash(request.NewPassword);
        var updated = user with { PasswordHash = newPasswordHash, UpdatedAt = now };
        await _users.UpdateAsync(updated, ct);

        await _tokens.MarkConsumedAsync(stored.Id, now, ct);
        await _tokens.InvalidateActiveForUserAsync(stored.UserId, now, ct);

        var invalidatedSessions = await _sessionInvalidator.InvalidateAllForUserAsync(stored.UserId, ct);

        _logger.LogInformation(
            "PasswordReset.Confirm: success for {EmailMasked} (userId={UserId}, tokenId={TokenId}, invalidatedSessions={Sessions})",
            EmailMasking.Mask(user.Email), user.Id, stored.Id, invalidatedSessions);

        return new PasswordResetConfirmResponse { Message = SuccessMessage };
    }
}
