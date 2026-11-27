using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.TwoFactor;

public sealed class TwoFactorCodeCheckTests
{
    private readonly TwoFactorTestKit _kit = new();

    [Fact]
    public async Task RequireAsync_CurrentAppCode_RemembersItsStepSoItCannotServeTwice()
    {
        var user = await _kit.AddUserAsync(enabled: true);

        var proof = await _kit.CodeCheck().RequireAsync(user, _kit.CurrentCode());

        Assert.False(proof.UsedBackupCode);
        Assert.Equal(Totp.StepAt(_kit.Clock.GetUtcNow()), proof.Settings.LastUsedStep);
        var replay = await Assert.ThrowsAsync<BadRequestException>(
            () => _kit.CodeCheck().RequireAsync(user with { TwoFactor = proof.Settings }, _kit.CurrentCode()));
        Assert.Equal(ErrorCodes.TwoFactorCodeInvalid, replay.Reason);
    }

    [Fact]
    public async Task RequireAsync_BackupCode_SpendsIt()
    {
        var user = await _kit.AddUserAsync(backupCodes: ["2222-3333", "ABCD-EFGH"]);

        var proof = await _kit.CodeCheck().RequireAsync(user, "abcd efgh");

        Assert.True(proof.UsedBackupCode);
        Assert.Equal([BackupCodes.Hash("2222-3333")], proof.Settings.BackupCodeHashes);
    }

    [Fact]
    public async Task RequireAsync_WrongCode_IsRefused()
    {
        var user = await _kit.AddUserAsync(backupCodes: ["2222-3333"]);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _kit.CodeCheck().RequireAsync(user, "000000"));

        Assert.Equal(ErrorCodes.TwoFactorCodeInvalid, ex.Reason);
    }

    [Fact]
    public async Task RequireAsync_AccountWithoutTwoFactor_IsRefused()
    {
        var user = await _kit.AddUserAsync();

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.CodeCheck().RequireAsync(user, "000000"));

        Assert.Equal(ErrorCodes.TwoFactorNotEnabled, ex.Reason);
    }

    [Fact]
    public async Task RequireAsync_AfterTenWrongCodesInTheWindow_RefusesEvenTheRightOne()
    {
        var user = await _kit.AddUserAsync(enabled: true);
        for (var i = 0; i < TwoFactorCodeCheck.MaxFailuresPerAccountWindow; i++)
            await Assert.ThrowsAsync<BadRequestException>(() => _kit.CodeCheck().RequireAsync(user, "000000"));

        var ex = await Assert.ThrowsAsync<TooManyRequestsException>(() => _kit.CodeCheck().RequireAsync(user, _kit.CurrentCode()));

        Assert.Equal(ErrorCodes.TwoFactorTooManyAttempts, ex.Reason);
    }

    [Fact]
    public async Task RequireAsync_RightCodes_DoNotUseUpTheFailureAllowance()
    {
        var user = await _kit.AddUserAsync(enabled: true);
        for (var i = 0; i < TwoFactorCodeCheck.MaxFailuresPerAccountWindow + 2; i++)
        {
            _kit.Clock.Advance(Totp.Period);
            await _kit.CodeCheck().RequireAsync(user, _kit.CurrentCode());
        }

        await Assert.ThrowsAsync<BadRequestException>(() => _kit.CodeCheck().RequireAsync(user, "000000"));
        _kit.Clock.Advance(Totp.Period);
        var proof = await _kit.CodeCheck().RequireAsync(user, _kit.CurrentCode());
        Assert.False(proof.UsedBackupCode);
    }
}
