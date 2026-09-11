using MoviePicker.Api.Application.UseCases.Auth;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class EmailMaskingTests
{
    [Theory]
    [InlineData("a@b.co", "*@b.co")]
    [InlineData("bob@example.com", "b***@example.com")]
    [InlineData("ab@y.z", "a***@y.z")]
    public void Mask_FormatsLocalPart(string input, string expected)
    {
        Assert.Equal(expected, EmailMasking.Mask(input));
    }

    [Fact]
    public void Mask_Empty_ReturnsPlaceholder()
    {
        Assert.Equal("***", EmailMasking.Mask(""));
        Assert.Equal("***", EmailMasking.Mask("   "));
    }

    [Fact]
    public void Mask_StripsLineBreaks_SoTheOutputStaysOnOneLogLine()
    {
        Assert.Equal("b***@example.com", EmailMasking.Mask("bob@exam\r\nple.com\n"));
    }

    [Fact]
    public void Mask_NoAt_ReturnsPlaceholder()
    {
        Assert.Equal("***", EmailMasking.Mask("not-an-email"));
    }
}
