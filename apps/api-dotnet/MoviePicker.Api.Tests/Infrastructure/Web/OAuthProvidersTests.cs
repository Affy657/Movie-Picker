using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class OAuthProvidersTests
{
    [Theory]
    [InlineData("google", OAuthProviders.Google)]
    [InlineData("github", OAuthProviders.GitHub)]
    public void TryResolve_KnownProvider_ReturnsTheCanonicalConstant(string input, string expected)
    {
        Assert.True(OAuthProviders.TryResolve(input, out var provider));
        Assert.Equal(expected, provider);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Google")]
    [InlineData("google\n")]
    [InlineData("facebook")]
    public void TryResolve_UnknownProvider_ReturnsFalse(string? input)
    {
        Assert.False(OAuthProviders.TryResolve(input, out var provider));
        Assert.Null(provider);
    }
}
