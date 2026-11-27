using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed class VerifyTwoFactorLoginHandler : IVerifyTwoFactorLoginHandler
{
    private readonly IUserRepository _users;
    private readonly TwoFactorCodeCheck _codeCheck;
    private readonly IRateLimitCounterStore _attempts;
    private readonly TimeProvider _clock;

    public VerifyTwoFactorLoginHandler(
        IUserRepository users,
        TwoFactorCodeCheck codeCheck,
        IRateLimitCounterStore attempts,
        TimeProvider clock)
    {
        _users = users;
        _codeCheck = codeCheck;
        _attempts = attempts;
        _clock = clock;
    }

    public async Task<TwoFactorLoginResponse> HandleAsync(TwoFactorChallenge challenge, string code, CancellationToken ct = default)
    {
        var attemptsUntil = _clock.GetUtcNow() + TwoFactorSealing.ChallengeLifetime;
        if (await _attempts.IncrementAsync($"two-factor-challenge|{challenge.Id}", attemptsUntil, ct) > TwoFactorSealing.MaxAttemptsPerChallenge)
            throw Errors.TwoFactorTooManyAttempts();

        var user = await _users.GetByIdAsync(challenge.UserId, ct) ?? throw Errors.TwoFactorChallengeExpired();
        if (user.TwoFactor is null)
            return new TwoFactorLoginResponse { UserId = user.Id, DisplayName = user.DisplayName };

        var proof = await _codeCheck.RequireAsync(user, code, ct);
        await _users.UpdateAsync(user with { TwoFactor = proof.Settings }, ct);
        return new TwoFactorLoginResponse
        {
            UserId = user.Id,
            DisplayName = user.DisplayName,
            UsedBackupCode = proof.UsedBackupCode,
            BackupCodesRemaining = proof.Settings.BackupCodeHashes.Count
        };
    }
}
