using MoviePicker.Api.Configuration;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class ConfigurationFlagsTests
{
    [Theory]
    [InlineData("1", false, true)]
    [InlineData("true", false, true)]
    [InlineData("TRUE", false, true)]
    [InlineData("0", true, false)]
    [InlineData("false", true, false)]
    [InlineData(" False ", true, false)]
    [InlineData(null, true, true)]
    [InlineData("", false, false)]
    [InlineData("maybe", true, true)]
    [InlineData("maybe", false, false)]
    public void IsEnabled_ParsesTheUsualSpellings_AndFallsBackToTheDefault(string? raw, bool fallback, bool expected)
    {
        Assert.Equal(expected, ConfigurationFlags.IsEnabled(raw, fallback));
    }
}
