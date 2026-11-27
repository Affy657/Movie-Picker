using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class BackupCodesTests
{
    private const string UnambiguousAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    [Fact]
    public void Generate_GivesTenDistinctCodesOfTwoGroupsOfFour()
    {
        var codes = BackupCodes.Generate();

        Assert.Equal(BackupCodes.Count, codes.Count);
        Assert.Equal(10, codes.Count);
        Assert.Equal(codes.Count, codes.Distinct().Count());
        Assert.All(codes, code =>
        {
            Assert.Matches("^[A-Z0-9]{4}-[A-Z0-9]{4}$", code);
            Assert.All(code.Replace("-", string.Empty), c => Assert.Contains(c, UnambiguousAlphabet));
        });
    }

    [Theory]
    [InlineData("ABCD-EFGH")]
    [InlineData("abcd-efgh")]
    [InlineData(" abcd efgh ")]
    [InlineData("ABCDEFGH")]
    public void Hash_IgnoresCaseSpacesAndDashes(string typed)
    {
        Assert.Equal(BackupCodes.Hash("ABCD-EFGH"), BackupCodes.Hash(typed));
    }

    [Fact]
    public void Hash_IsNotTheCodeItself()
    {
        var hash = BackupCodes.Hash("ABCD-EFGH");

        Assert.DoesNotContain("ABCD", hash, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(64, hash.Length);
    }

    [Fact]
    public void MatchingHash_FindsTheStoredHashOfATypedCode()
    {
        var stored = new[] { BackupCodes.Hash("2222-3333"), BackupCodes.Hash("ABCD-EFGH") };

        Assert.Equal(stored[1], BackupCodes.MatchingHash(stored, "abcd efgh"));
        Assert.Null(BackupCodes.MatchingHash(stored, "ZZZZ-ZZZZ"));
        Assert.Null(BackupCodes.MatchingHash(stored, string.Empty));
    }
}
