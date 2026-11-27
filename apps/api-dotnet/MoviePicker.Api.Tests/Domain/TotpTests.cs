using System.Text;
using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class TotpTests
{
    private static readonly byte[] RfcSecret = Encoding.ASCII.GetBytes("12345678901234567890");

    [Theory]
    [InlineData(59L, "287082")]
    [InlineData(1111111109L, "081804")]
    [InlineData(1111111111L, "050471")]
    [InlineData(1234567890L, "005924")]
    [InlineData(2000000000L, "279037")]
    [InlineData(20000000000L, "353130")]
    public void CodeAt_MatchesTheRfc6238Vectors(long unixSeconds, string expected)
    {
        var step = Totp.StepAt(DateTimeOffset.FromUnixTimeSeconds(unixSeconds));

        Assert.Equal(expected, Totp.CodeAt(RfcSecret, step));
    }

    [Fact]
    public void StepAt_CountsThirtySecondPeriodsSinceTheEpoch()
    {
        Assert.Equal(0, Totp.StepAt(DateTimeOffset.FromUnixTimeSeconds(29)));
        Assert.Equal(1, Totp.StepAt(DateTimeOffset.FromUnixTimeSeconds(30)));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(1)]
    public void MatchingStep_AcceptsTheCurrentAndAdjacentSteps(int offset)
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1234567890);
        var step = Totp.StepAt(now) + offset;

        Assert.Equal(step, Totp.MatchingStep(RfcSecret, Totp.CodeAt(RfcSecret, step), now, lastUsedStep: null));
    }

    [Theory]
    [InlineData(-2)]
    [InlineData(2)]
    public void MatchingStep_RefusesACodeTwoStepsAway(int offset)
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1234567890);
        var code = Totp.CodeAt(RfcSecret, Totp.StepAt(now) + offset);

        Assert.Null(Totp.MatchingStep(RfcSecret, code, now, lastUsedStep: null));
    }

    [Fact]
    public void MatchingStep_RefusesAStepAlreadyUsed()
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1234567890);
        var step = Totp.StepAt(now);

        Assert.Null(Totp.MatchingStep(RfcSecret, Totp.CodeAt(RfcSecret, step), now, lastUsedStep: step));
    }

    [Fact]
    public void MatchingStep_AcceptsALaterStepThanTheOneUsed()
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1234567890);
        var step = Totp.StepAt(now);

        Assert.Equal(step + 1, Totp.MatchingStep(RfcSecret, Totp.CodeAt(RfcSecret, step + 1), now, lastUsedStep: step));
    }

    [Theory]
    [InlineData("005 924")]
    [InlineData(" 005924 ")]
    [InlineData("005-924")]
    public void MatchingStep_IgnoresSpacesAndDashes(string typed)
    {
        var now = DateTimeOffset.FromUnixTimeSeconds(1234567890);

        Assert.Equal(Totp.StepAt(now), Totp.MatchingStep(RfcSecret, typed, now, lastUsedStep: null));
    }

    [Theory]
    [InlineData("")]
    [InlineData("12345")]
    [InlineData("1234567")]
    [InlineData("abcdef")]
    public void MatchingStep_RefusesSomethingThatIsNotSixDigits(string typed)
    {
        Assert.Null(Totp.MatchingStep(RfcSecret, typed, DateTimeOffset.UnixEpoch, lastUsedStep: null));
    }

    [Theory]
    [InlineData("123456", true)]
    [InlineData("123 456", true)]
    [InlineData("ABCD-EFGH", false)]
    [InlineData("12345", false)]
    public void LooksLikeACode_TellsAnAppCodeFromABackupCode(string typed, bool expected)
    {
        Assert.Equal(expected, Totp.LooksLikeACode(typed));
    }

    [Fact]
    public void NewSecret_HasTwentyRandomBytes()
    {
        var first = Totp.NewSecret();
        var second = Totp.NewSecret();

        Assert.Equal(20, first.Length);
        Assert.NotEqual(first, second);
    }

    [Fact]
    public void ProvisioningUri_NamesTheIssuerAndTheAccount()
    {
        var uri = Totp.ProvisioningUri(Encoding.ASCII.GetBytes("foobar"), "léa+test@exemple.fr");

        Assert.Equal(
            "otpauth://totp/Movie%20Picker:l%C3%A9a%2Btest%40exemple.fr?secret=MZXW6YTBOI&issuer=Movie%20Picker&algorithm=SHA1&digits=6&period=30",
            uri);
    }
}
