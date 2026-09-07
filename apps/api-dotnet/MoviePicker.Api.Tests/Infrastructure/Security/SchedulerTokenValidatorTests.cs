using Microsoft.Extensions.Options;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Security;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Security;

public sealed class SchedulerTokenValidatorTests
{
    private static SchedulerTokenValidator Build(string? configuredToken) =>
        new(Options.Create(new MoviePickerOptions { SchedulerToken = configuredToken }));

    [Fact]
    public void IsConfigured_WithoutToken_IsFalse()
    {
        Assert.False(Build(null).IsConfigured);
    }

    [Fact]
    public void IsConfigured_WithBlankToken_IsFalse()
    {
        Assert.False(Build("   ").IsConfigured);
    }

    [Fact]
    public void IsValid_MatchingToken_IsTrue()
    {
        Assert.True(Build("secret-value").IsValid("secret-value"));
    }

    [Theory]
    [InlineData("autre-valeur")]
    [InlineData("secret-valu")]
    [InlineData("")]
    [InlineData(null)]
    public void IsValid_NonMatchingToken_IsFalse(string? presented)
    {
        Assert.False(Build("secret-value").IsValid(presented));
    }

    [Fact]
    public void IsValid_WithoutConfiguredToken_IsFalse()
    {
        Assert.False(Build(null).IsValid("n-importe-quoi"));
    }
}
