using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed class EnableTwoFactorHandler : IEnableTwoFactorHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ISecretSealer _sealer;
    private readonly TimeProvider _clock;
    private readonly ILogger<EnableTwoFactorHandler> _logger;

    public EnableTwoFactorHandler(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        ISecretSealer sealer,
        TimeProvider clock,
        ILogger<EnableTwoFactorHandler> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _sealer = sealer;
        _clock = clock;
        _logger = logger;
    }

    public async Task<TwoFactorBackupCodesResponse> HandleAsync(
        string userId,
        EnableTwoFactorRequest request,
        bool recentlyAuthenticated,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        if (user.TwoFactor is not null)
            throw Errors.TwoFactorAlreadyEnabled();

        var manualKey = OpenSetupToken(user.Id, request.SetupToken) ?? throw Errors.TwoFactorSetupExpired();
        ConfirmIdentity(user, request.CurrentPassword, recentlyAuthenticated);

        var now = _clock.GetUtcNow();
        var step = Totp.MatchingStep(Base32.Decode(manualKey)!, request.Code, now, lastUsedStep: null)
            ?? throw Errors.TwoFactorCodeInvalid();

        var backupCodes = BackupCodes.Generate();
        var settings = new TwoFactorSettings
        {
            ProtectedSecret = _sealer.Seal(TwoFactorSealing.SecretPurpose, manualKey),
            EnabledAt = now,
            LastUsedStep = step,
            BackupCodeHashes = backupCodes.Select(BackupCodes.Hash).ToList()
        };
        await _users.UpdateAsync(user with { TwoFactor = settings, UpdatedAt = now }, ct);

        _logger.LogInformation("Two-factor authentication enabled for {UserId}", LogText.SingleLine(user.Id));
        return new TwoFactorBackupCodesResponse { BackupCodes = backupCodes };
    }

    private string? OpenSetupToken(string userId, string setupToken)
    {
        var payload = _sealer.TryOpen(TwoFactorSealing.SetupPurpose, setupToken);
        var separator = payload?.IndexOf(StartTwoFactorSetupHandler.SetupTokenSeparator) ?? -1;
        if (payload is null || separator < 0 || payload[..separator] != userId)
            return null;
        var manualKey = payload[(separator + 1)..];
        return Base32.Decode(manualKey) is { Length: Totp.SecretByteLength } ? manualKey : null;
    }

    private void ConfirmIdentity(User user, string? currentPassword, bool recentlyAuthenticated)
    {
        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            if (!recentlyAuthenticated)
                throw Errors.ReauthenticationRequired();
            return;
        }

        if (_passwordHasher.Verify(user.PasswordHash, currentPassword ?? string.Empty) == PasswordVerification.Failed)
            throw Errors.CurrentPasswordIncorrect();
    }
}
