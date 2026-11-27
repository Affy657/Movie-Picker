using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed record TwoFactorProof(TwoFactorSettings Settings, bool UsedBackupCode);

public sealed class TwoFactorCodeCheck
{
    public const int MaxFailuresPerAccountWindow = 10;

    public static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(15);

    private readonly ISecretSealer _sealer;
    private readonly IRateLimitCounterStore _failures;
    private readonly TimeProvider _clock;

    public TwoFactorCodeCheck(ISecretSealer sealer, IRateLimitCounterStore failures, TimeProvider clock)
    {
        _sealer = sealer;
        _failures = failures;
        _clock = clock;
    }

    public async Task<TwoFactorProof> RequireAsync(User user, string code, CancellationToken ct = default)
    {
        var settings = user.TwoFactor ?? throw Errors.TwoFactorNotEnabled();
        var now = _clock.GetUtcNow();
        var windowIndex = now.UtcTicks / FailureWindow.Ticks;
        var failureKey = $"two-factor-failures|{user.Id}|{windowIndex}";
        var windowEnd = new DateTimeOffset((windowIndex + 1) * FailureWindow.Ticks, TimeSpan.Zero);
        if (await _failures.IncrementAsync(failureKey, windowEnd, ct) > MaxFailuresPerAccountWindow)
            throw Errors.TwoFactorTooManyAttempts();

        var proof = Match(settings, code, now) ?? throw Errors.TwoFactorCodeInvalid();
        await _failures.DecrementAsync(failureKey, CancellationToken.None);
        return proof;
    }

    private TwoFactorProof? Match(TwoFactorSettings settings, string code, DateTimeOffset now)
    {
        if (Totp.LooksLikeACode(code))
        {
            var secret = SecretOf(settings);
            var step = secret is null ? null : Totp.MatchingStep(secret, code, now, settings.LastUsedStep);
            return step is null ? null : new TwoFactorProof(settings with { LastUsedStep = step.Value }, UsedBackupCode: false);
        }

        var spent = BackupCodes.MatchingHash(settings.BackupCodeHashes, code);
        return spent is null
            ? null
            : new TwoFactorProof(
                settings with { BackupCodeHashes = settings.BackupCodeHashes.Where(hash => hash != spent).ToList() },
                UsedBackupCode: true);
    }

    private byte[]? SecretOf(TwoFactorSettings settings)
    {
        var key = _sealer.TryOpen(TwoFactorSealing.SecretPurpose, settings.ProtectedSecret);
        return key is null ? null : Base32.Decode(key);
    }
}
