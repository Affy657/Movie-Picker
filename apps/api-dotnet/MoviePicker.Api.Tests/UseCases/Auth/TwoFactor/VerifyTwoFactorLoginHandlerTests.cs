using MoviePicker.Api.Application.UseCases.Auth.TwoFactor;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.TwoFactor;

public sealed class VerifyTwoFactorLoginHandlerTests
{
    private readonly TwoFactorTestKit _kit = new();

    private VerifyTwoFactorLoginHandler Verify() => new(_kit.Users, _kit.CodeCheck(), _kit.Counters, _kit.Clock);

    private static TwoFactorChallenge Challenge(string id = "challenge-1") =>
        new(id, TwoFactorTestKit.UserId, "form", "/e/abc");

    [Fact]
    public async Task HandleAsync_AppCode_SignsInAndBurnsTheStep()
    {
        await _kit.AddUserAsync(enabled: true);

        var result = await Verify().HandleAsync(Challenge(), _kit.CurrentCode());

        Assert.Equal(TwoFactorTestKit.UserId, result.UserId);
        Assert.Equal("Léa", result.DisplayName);
        Assert.False(result.UsedBackupCode);
        Assert.Equal(Totp.StepAt(_kit.Clock.GetUtcNow()), (await _kit.StoredSettingsAsync())!.LastUsedStep);
        await Assert.ThrowsAsync<BadRequestException>(() => Verify().HandleAsync(Challenge("challenge-2"), _kit.CurrentCode()));
    }

    [Fact]
    public async Task HandleAsync_BackupCode_SpendsItAndSaysHowManyAreLeft()
    {
        await _kit.AddUserAsync(backupCodes: ["2222-3333", "4444-5555", "6666-7777"]);

        var result = await Verify().HandleAsync(Challenge(), "4444-5555");

        Assert.True(result.UsedBackupCode);
        Assert.Equal(2, result.BackupCodesRemaining);
        Assert.DoesNotContain(BackupCodes.Hash("4444-5555"), (await _kit.StoredSettingsAsync())!.BackupCodeHashes);
    }

    [Fact]
    public async Task HandleAsync_SixthTryOnOneChallenge_IsRefusedEvenWithTheRightCode()
    {
        await _kit.AddUserAsync(enabled: true);
        for (var i = 0; i < TwoFactorSealing.MaxAttemptsPerChallenge; i++)
            await Assert.ThrowsAsync<BadRequestException>(() => Verify().HandleAsync(Challenge(), "000000"));

        var ex = await Assert.ThrowsAsync<TooManyRequestsException>(() => Verify().HandleAsync(Challenge(), _kit.CurrentCode()));

        Assert.Equal(ErrorCodes.TwoFactorTooManyAttempts, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AccountDeletedMeanwhile_EndsTheChallenge()
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Verify().HandleAsync(Challenge(), "000000"));

        Assert.Equal(ErrorCodes.TwoFactorChallengeExpired, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TwoFactorTurnedOffMeanwhile_SignsInWithoutACode()
    {
        await _kit.AddUserAsync();

        var result = await Verify().HandleAsync(Challenge(), string.Empty);

        Assert.Equal(TwoFactorTestKit.UserId, result.UserId);
    }

    [Fact]
    public async Task Challenge_SealedThenOpened_KeepsItsFields()
    {
        var sealedChallenge = Challenge().Seal(_kit.Sealer, _kit.Clock.GetUtcNow());

        Assert.Equal(Challenge(), TwoFactorChallenge.TryOpen(_kit.Sealer, sealedChallenge));
        _kit.Clock.Advance(TwoFactorSealing.ChallengeLifetime + TimeSpan.FromSeconds(1));
        Assert.Null(TwoFactorChallenge.TryOpen(_kit.Sealer, sealedChallenge));
    }

    [Fact]
    public void Challenge_New_HasAnUnguessableId()
    {
        var first = TwoFactorChallenge.New(TwoFactorTestKit.UserId, "google", null);
        var second = TwoFactorChallenge.New(TwoFactorTestKit.UserId, "google", null);

        Assert.NotEqual(first.Id, second.Id);
        Assert.True(first.Id.Length >= 22);
        Assert.Equal("google", first.Method);
    }
}
