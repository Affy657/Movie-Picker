using System.Text;
using MoviePicker.Api.Domain.TwoFactor;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class Base32Tests
{
    [Theory]
    [InlineData("", "")]
    [InlineData("f", "MY")]
    [InlineData("fo", "MZXQ")]
    [InlineData("foo", "MZXW6")]
    [InlineData("foob", "MZXW6YQ")]
    [InlineData("fooba", "MZXW6YTB")]
    [InlineData("foobar", "MZXW6YTBOI")]
    public void Encode_MatchesTheRfc4648VectorsWithoutPadding(string input, string expected)
    {
        Assert.Equal(expected, Base32.Encode(Encoding.ASCII.GetBytes(input)));
    }

    [Theory]
    [InlineData("MZXW6YTBOI", "foobar")]
    [InlineData("mzxw 6ytb oi", "foobar")]
    [InlineData("MZXW6YTBOI======", "foobar")]
    public void Decode_ReadsWhatEncodeWrites(string input, string expected)
    {
        Assert.Equal(expected, Encoding.ASCII.GetString(Base32.Decode(input)!));
    }

    [Fact]
    public void Decode_RefusesALetterOutsideTheAlphabet()
    {
        Assert.Null(Base32.Decode("MZXW1"));
    }
}
