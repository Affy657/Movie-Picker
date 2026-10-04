using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class ChangePasswordHandler : IChangePasswordHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IPasswordResetTokenRepository _resetTokens;
    private readonly IAuthSessionInvalidator _sessionInvalidator;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly TimeProvider _clock;
    private readonly ILogger<ChangePasswordHandler> _logger;

    public ChangePasswordHandler(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        IPasswordResetTokenRepository resetTokens,
        IAuthSessionInvalidator sessionInvalidator,
        IPushSubscriptionRepository pushSubscriptions,
        TimeProvider clock,
        ILogger<ChangePasswordHandler> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _resetTokens = resetTokens;
        _sessionInvalidator = sessionInvalidator;
        _pushSubscriptions = pushSubscriptions;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, ChangePasswordRequest request, bool recentlyAuthenticated, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();

        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            if (!recentlyAuthenticated)
            {
                _logger.LogWarning("ChangePassword: first password refused on a stale session for {UserId}", userId);
                throw Errors.ReauthenticationRequired();
            }
        }
        else
        {
            var verify = _passwordHasher.Verify(user.PasswordHash, request.CurrentPassword ?? string.Empty);
            if (verify == PasswordVerification.Failed)
            {
                _logger.LogWarning("ChangePassword: incorrect current password for {UserId}", userId);
                throw Errors.CurrentPasswordIncorrect();
            }
        }

        var validationError = AuthInputValidation.ValidatePassword(request.NewPassword);
        if (validationError is not null)
            throw validationError;

        var now = _clock.GetUtcNow();
        var newHash = _passwordHasher.Hash(request.NewPassword);
        var updated = user with { PasswordHash = newHash, UpdatedAt = now };
        await _users.UpdateAsync(updated, ct);

        await _resetTokens.InvalidateActiveForUserAsync(userId, now, ct);
        var invalidatedSessions = await _sessionInvalidator.InvalidateAllForUserAsync(userId, ct);
        var revokedPushSubscriptions = await RevokePushSubscriptionsAsync(userId, ct);

        _logger.LogInformation(
            "ChangePassword: success for {EmailMasked} (userId={UserId}, invalidatedSessions={Sessions}, revokedPushSubscriptions={PushSubscriptions})",
            EmailMasking.Mask(user.Email), userId, invalidatedSessions, revokedPushSubscriptions);
    }

    private async Task<long> RevokePushSubscriptionsAsync(string userId, CancellationToken ct)
    {
        try
        {
            return await _pushSubscriptions.DeleteByUserIdAsync(userId, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "ChangePassword: push subscriptions not revoked for {UserId}", userId);
            return 0;
        }
    }
}
