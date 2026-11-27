using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.TwoFactor;

public sealed class EnableTwoFactorHandlerTests
{
    private readonly TwoFactorTestKit _kit = new();

    private StartTwoFactorSetupHandler Setup() => new(_kit.Users, _kit.Sealer, _kit.Clock);

    private EnableTwoFactorHandler Enable() =>
        new(_kit.Users, _kit.Hasher.Object, _kit.Sealer, _kit.Clock, NullLogger<EnableTwoFactorHandler>.Instance);

    private string CodeFor(TwoFactorSetupResponse setup) =>
        Totp.CodeAt(Base32.Decode(setup.ManualKey)!, Totp.StepAt(_kit.Clock.GetUtcNow()));

    private Task<TwoFactorBackupCodesResponse> EnableWith(
        TwoFactorSetupResponse setup,
        string? code = null,
        string? password = TwoFactorTestKit.Password,
        bool recentlyAuthenticated = false) =>
        Enable().HandleAsync(
            TwoFactorTestKit.UserId,
            new EnableTwoFactorRequest { SetupToken = setup.SetupToken, Code = code ?? CodeFor(setup), CurrentPassword = password },
            recentlyAuthenticated);

    [Fact]
    public async Task Start_GivesAKeyAndTheUriThatAnAppScans()
    {
        await _kit.AddUserAsync();

        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);

        Assert.Equal(Totp.SecretByteLength, Base32.Decode(setup.ManualKey)!.Length);
        Assert.StartsWith("otpauth://totp/Movie%20Picker:lea%40example.com?secret=" + setup.ManualKey, setup.OtpauthUri);
        Assert.DoesNotContain(setup.ManualKey, setup.SetupToken, StringComparison.Ordinal);
        Assert.Null(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Start_AlreadyEnabled_IsRefused()
    {
        await _kit.AddUserAsync(enabled: true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Setup().HandleAsync(TwoFactorTestKit.UserId));

        Assert.Equal(ErrorCodes.TwoFactorAlreadyEnabled, ex.Reason);
    }

    [Fact]
    public async Task Enable_RightCodeAndPassword_StoresTheSealedSecretAndTenBackupCodes()
    {
        await _kit.AddUserAsync();
        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);

        var result = await EnableWith(setup);

        var stored = await _kit.StoredSettingsAsync();
        Assert.NotNull(stored);
        Assert.Equal(_kit.Clock.GetUtcNow(), stored.EnabledAt);
        Assert.Equal(Totp.StepAt(_kit.Clock.GetUtcNow()), stored.LastUsedStep);
        Assert.Equal(setup.ManualKey, _kit.Sealer.TryOpen(TwoFactorSealing.SecretPurpose, stored.ProtectedSecret));
        Assert.Equal(BackupCodes.Count, result.BackupCodes.Count);
        Assert.Equal(result.BackupCodes.Select(BackupCodes.Hash), stored.BackupCodeHashes);
    }

    [Fact]
    public async Task Enable_WrongCode_LeavesTheAccountUnchanged()
    {
        await _kit.AddUserAsync();
        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => EnableWith(setup, code: "000000"));

        Assert.Equal(ErrorCodes.TwoFactorCodeInvalid, ex.Reason);
        Assert.Null(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Enable_WrongPassword_IsRefused()
    {
        await _kit.AddUserAsync();
        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => EnableWith(setup, password: "nope"));

        Assert.Equal(ErrorCodes.CurrentPasswordIncorrect, ex.Reason);
        Assert.Null(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Enable_AccountWithoutPassword_NeedsARecentSignIn()
    {
        await _kit.AddUserAsync(withPassword: false);
        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => EnableWith(setup, password: null));

        Assert.Equal(ErrorCodes.ReauthenticationRequired, ex.Reason);
        await EnableWith(setup, password: null, recentlyAuthenticated: true);
        Assert.NotNull(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Enable_SetupStartedMoreThanFifteenMinutesAgo_IsRefused()
    {
        await _kit.AddUserAsync();
        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);
        _kit.Clock.Advance(TwoFactorSealing.SetupLifetime + TimeSpan.FromSeconds(1));

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => EnableWith(setup));

        Assert.Equal(ErrorCodes.TwoFactorSetupExpired, ex.Reason);
    }

    [Fact]
    public async Task Enable_SetupTokenOfAnotherAccount_IsRefused()
    {
        await _kit.AddUserAsync();
        var foreignToken = _kit.Sealer.Seal(
            TwoFactorSealing.SetupPurpose,
            "another-user:" + Base32.Encode(TwoFactorTestKit.Secret),
            _kit.Clock.GetUtcNow().AddMinutes(5));

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Enable().HandleAsync(
            TwoFactorTestKit.UserId,
            new EnableTwoFactorRequest { SetupToken = foreignToken, Code = _kit.CurrentCode(), CurrentPassword = TwoFactorTestKit.Password },
            recentlyAuthenticated: true));

        Assert.Equal(ErrorCodes.TwoFactorSetupExpired, ex.Reason);
    }

    [Fact]
    public async Task Enable_AlreadyEnabled_IsRefused()
    {
        await _kit.AddUserAsync();
        var setup = await Setup().HandleAsync(TwoFactorTestKit.UserId);
        await EnableWith(setup);
        _kit.Clock.Advance(Totp.Period);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => EnableWith(setup));

        Assert.Equal(ErrorCodes.TwoFactorAlreadyEnabled, ex.Reason);
    }
}
