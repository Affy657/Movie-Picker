using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ReturnToPolicyTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("https://evil.example/phish")]
    [InlineData("//evil.example")]
    [InlineData("/\\evil")]
    [InlineData("relative")]
    public void Sanitize_RejectsUnsafeValues(string? raw)
    {
        Assert.Equal("/", ReturnToPolicy.Sanitize(raw));
    }

    [Theory]
    [InlineData("/settings", "/settings")]
    [InlineData(" /watchlist ", "/watchlist")]
    [InlineData("/events/abc?x=1", "/events/abc?x=1")]
    public void Sanitize_KeepsSameOriginPaths(string raw, string expected)
    {
        Assert.Equal(expected, ReturnToPolicy.Sanitize(raw));
    }
}
