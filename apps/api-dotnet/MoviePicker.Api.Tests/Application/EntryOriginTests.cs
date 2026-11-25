using MoviePicker.Api.Application;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class EntryOriginTests
{
    [Theory]
    [InlineData("/e/abc123", "event")]
    [InlineData("/e/abc123?rate", "event")]
    [InlineData("/r/abc123", "recap")]
    [InlineData("/l/token/rejoindre", "list")]
    [InlineData("/u/ad0", "profile")]
    [InlineData("/new?from=recap", "recap")]
    [InlineData("/new?from=event", "event")]
    [InlineData("/new?step=2&from=list", "list")]
    [InlineData("/e/abc123?from=recap", "event")]
    [InlineData("/new?from=other", "other")]
    [InlineData("/new?from=elsewhere", "other")]
    [InlineData("/new?source=recap", "other")]
    [InlineData("https://evil.example/new?from=recap", "other")]
    [InlineData("/", "other")]
    [InlineData("/films", "other")]
    [InlineData("/events", "other")]
    [InlineData("/e", "other")]
    [InlineData("https://evil.example/e/abc", "other")]
    [InlineData("//evil.example/e/abc", "other")]
    [InlineData("", "other")]
    [InlineData(null, "other")]
    public void Of_ReadsWhereTheAccountWasHeadingFromTheReturnPath(string? returnTo, string origin)
    {
        Assert.Equal(origin, EntryOrigin.Of(returnTo));
    }

    [Fact]
    public void Of_ReadsTheOriginOfAFrontPathBuiltByFrontRoutes()
    {
        Assert.Equal("event", EntryOrigin.Of(FrontRoutes.EventDetail("abc123")));
        Assert.Equal("recap", EntryOrigin.Of(FrontRoutes.NightRecap("abc123")));
        Assert.Equal("profile", EntryOrigin.Of(FrontRoutes.Profile("ad0")));
    }
}
