using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.TwoFactor;

public sealed class ManageTwoFactorHandlerTests
{
    private readonly TwoFactorTestKit _kit = new();

    private DisableTwoFactorHandler Disable() =>
        new(_kit.Users, _kit.CodeCheck(), _kit.Clock, NullLogger<DisableTwoFactorHandler>.Instance);

    private RegenerateBackupCodesHandler Regenerate() => new(_kit.Users, _kit.CodeCheck(), _kit.Clock);

    private static TwoFactorCodeRequest Code(string code) => new() { Code = code };

    [Fact]
    public async Task Disable_WithAnAppCode_RemovesTheSecretAndTheBackupCodes()
    {
        await _kit.AddUserAsync(backupCodes: ["2222-3333"]);

        await Disable().HandleAsync(TwoFactorTestKit.UserId, Code(_kit.CurrentCode()));

        Assert.Null(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Disable_WithABackupCode_IsAccepted()
    {
        await _kit.AddUserAsync(backupCodes: ["2222-3333"]);

        await Disable().HandleAsync(TwoFactorTestKit.UserId, Code("2222-3333"));

        Assert.Null(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Disable_WrongCode_KeepsTwoFactor()
    {
        await _kit.AddUserAsync(enabled: true);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Disable().HandleAsync(TwoFactorTestKit.UserId, Code("000000")));

        Assert.Equal(ErrorCodes.TwoFactorCodeInvalid, ex.Reason);
        Assert.NotNull(await _kit.StoredSettingsAsync());
    }

    [Fact]
    public async Task Disable_NotEnabled_IsRefused()
    {
        await _kit.AddUserAsync();

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Disable().HandleAsync(TwoFactorTestKit.UserId, Code("000000")));

        Assert.Equal(ErrorCodes.TwoFactorNotEnabled, ex.Reason);
    }

    [Fact]
    public async Task Regenerate_ReplacesEveryBackupCode()
    {
        await _kit.AddUserAsync(backupCodes: ["2222-3333", "4444-5555"]);

        var result = await Regenerate().HandleAsync(TwoFactorTestKit.UserId, Code(_kit.CurrentCode()));

        var stored = await _kit.StoredSettingsAsync();
        Assert.Equal(BackupCodes.Count, result.BackupCodes.Count);
        Assert.Equal(result.BackupCodes.Select(BackupCodes.Hash), stored!.BackupCodeHashes);
        Assert.DoesNotContain(BackupCodes.Hash("2222-3333"), stored.BackupCodeHashes);
        Assert.Equal(Totp.StepAt(_kit.Clock.GetUtcNow()), stored.LastUsedStep);
    }

    [Fact]
    public async Task Regenerate_WrongCode_KeepsTheOldCodes()
    {
        await _kit.AddUserAsync(backupCodes: ["2222-3333"]);

        await Assert.ThrowsAsync<BadRequestException>(() => Regenerate().HandleAsync(TwoFactorTestKit.UserId, Code("000000")));

        Assert.Equal([BackupCodes.Hash("2222-3333")], (await _kit.StoredSettingsAsync())!.BackupCodeHashes);
    }
}
