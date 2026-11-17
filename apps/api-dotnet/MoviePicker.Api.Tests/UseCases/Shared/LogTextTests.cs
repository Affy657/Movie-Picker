using MoviePicker.Api.Application.UseCases.Shared;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class LogTextTests
{
    [Theory]
    [InlineData("frissons", "frissons")]
    [InlineData("a\r\nforged", "a forged")]
    [InlineData("a\nb\rc", "a b c")]
    [InlineData("a\u2028b\u2029c\u0085d\fe", "a b c d e")]
    [InlineData("a\tb\0c\u001b[31md\u007f", "a b c [31md ")]
    [InlineData("Les Évadés, 1994", "Les Évadés, 1994")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void SingleLine_LeavesNeitherLineBreakNorControlCharacter(string? value, string expected)
    {
        Assert.Equal(expected, LogText.SingleLine(value));
    }
}
