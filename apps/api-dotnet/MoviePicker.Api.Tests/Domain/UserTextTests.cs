using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class UserTextTests
{
    [Theory]
    [InlineData("\u202EAlice", "Alice")]
    [InlineData("Ali\u202Dce\u202C", "Alice")]
    [InlineData("\u2066Bob\u2069", "Bob")]
    [InlineData("\u202A\u202BCarl\u2067\u2068", "Carl")]
    [InlineData("  Dana  ", "Dana")]
    [InlineData("Line\nbreak\ttab", "Line break tab")]
    [InlineData("Null\0byte", "Nullbyte")]
    public void Clean_RemovesDirectionalControlsAndControlCharacters(string raw, string expected)
    {
        Assert.Equal(expected, UserText.Clean(raw));
    }

    [Theory]
    [InlineData("שלום")]
    [InlineData("مرحبا\u200F")]
    [InlineData("👨\u200D👩\u200D👧")]
    [InlineData("Élise")]
    public void Clean_KeepsRightToLeftScriptsMarksAndEmojiSequences(string raw)
    {
        Assert.Equal(raw, UserText.Clean(raw));
    }

    [Fact]
    public void Clean_Null_ReturnsEmpty()
    {
        Assert.Equal(string.Empty, UserText.Clean(null));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\u200B\u200B")]
    [InlineData("\u200C\u200D\u2060\uFEFF")]
    [InlineData("\u3164")]
    [InlineData("\uFFA0\u115F\u1160")]
    [InlineData("\u2800")]
    [InlineData("\u00AD")]
    [InlineData("\uFE0F")]
    [InlineData("\u034F")]
    [InlineData("\U000E0020\U000E0020")]
    [InlineData("\U0001D173")]
    public void HasVisibleCharacter_InvisibleOnly_ReturnsFalse(string text)
    {
        Assert.False(UserText.HasVisibleCharacter(text));
    }

    [Theory]
    [InlineData("a")]
    [InlineData("\u200Ba")]
    [InlineData("🎬")]
    [InlineData("中")]
    [InlineData("\U000E0020𝄞")]
    public void HasVisibleCharacter_WithAVisibleCharacter_ReturnsTrue(string text)
    {
        Assert.True(UserText.HasVisibleCharacter(text));
    }
}
