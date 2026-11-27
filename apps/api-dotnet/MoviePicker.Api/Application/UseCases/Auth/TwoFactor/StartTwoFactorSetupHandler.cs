using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed class StartTwoFactorSetupHandler : IStartTwoFactorSetupHandler
{
    internal const char SetupTokenSeparator = ':';

    private readonly IUserRepository _users;
    private readonly ISecretSealer _sealer;
    private readonly TimeProvider _clock;

    public StartTwoFactorSetupHandler(IUserRepository users, ISecretSealer sealer, TimeProvider clock)
    {
        _users = users;
        _sealer = sealer;
        _clock = clock;
    }

    public async Task<TwoFactorSetupResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        if (user.TwoFactor is not null)
            throw Errors.TwoFactorAlreadyEnabled();

        var secret = Totp.NewSecret();
        var manualKey = Base32.Encode(secret);
        return new TwoFactorSetupResponse
        {
            ManualKey = manualKey,
            OtpauthUri = Totp.ProvisioningUri(secret, user.Email),
            SetupToken = _sealer.Seal(
                TwoFactorSealing.SetupPurpose,
                user.Id + SetupTokenSeparator + manualKey,
                _clock.GetUtcNow() + TwoFactorSealing.SetupLifetime)
        };
    }
}
