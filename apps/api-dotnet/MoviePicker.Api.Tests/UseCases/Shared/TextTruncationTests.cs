using MoviePicker.Api.Application.UseCases.Shared;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class TextTruncationTests
{
    private const string Smiley = "😀";

    [Theory]
    [InlineData("", 5)]
    [InlineData("abc", 5)]
    [InlineData("abcde", 5)]
    [InlineData("ab   ", 5)]
    public void ToMaxLength_TextWithinTheLimit_IsReturnedUnchanged(string text, int maxLength)
    {
        Assert.Same(text, TextTruncation.ToMaxLength(text, maxLength));
    }

    [Fact]
    public void ToMaxLength_AsciiTextOverTheLimit_IsCutAtTheLimit()
    {
        Assert.Equal("abcde", TextTruncation.ToMaxLength("abcdefgh", 5));
    }

    [Fact]
    public void ToMaxLength_SurrogatePairAcrossTheLimit_IsDroppedWhole()
    {
        Assert.Equal("abcd", TextTruncation.ToMaxLength("abcd" + Smiley + "e", 5));
    }

    [Fact]
    public void ToMaxLength_SurrogatePairEndingAtTheLimit_IsKept()
    {
        Assert.Equal("abc" + Smiley, TextTruncation.ToMaxLength("abc" + Smiley + "de", 5));
    }

    [Theory]
    [InlineData("abcd efgh", "abcd")]
    [InlineData("ab   cdef", "ab")]
    public void ToMaxLength_CutEndingInWhitespace_IsTrimmed(string text, string expected)
    {
        Assert.Equal(expected, TextTruncation.ToMaxLength(text, 5));
    }

    [Fact]
    public void ToMaxLength_SurrogatePairDroppedAfterASpace_LeavesNoTrailingSpace()
    {
        Assert.Equal("abc", TextTruncation.ToMaxLength("abc " + Smiley + "x", 5));
    }
}
