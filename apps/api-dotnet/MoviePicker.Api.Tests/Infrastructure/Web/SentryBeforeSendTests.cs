using Microsoft.AspNetCore.Authentication;
using MoviePicker.Api.Infrastructure.Web;
using Sentry;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class SentryBeforeSendTests
{
    [Fact]
    public void Prepare_ClearsUserAndKeepsApplicationError()
    {
        var sentryEvent = new SentryEvent(new InvalidOperationException("boom"))
        {
            User = new SentryUser { Id = "000000000000", Email = "a@b.c" }
        };

        var prepared = SentryBeforeSend.Prepare(sentryEvent);

        Assert.Same(sentryEvent, prepared);
        Assert.Null(prepared!.User.Id);
        Assert.Null(prepared.User.Email);
    }

    [Fact]
    public void Prepare_DropsAuthenticationFailureException()
    {
        var sentryEvent = new SentryEvent(
            new AuthenticationFailureException("The oauth state was missing or invalid."));

        Assert.Null(SentryBeforeSend.Prepare(sentryEvent));
    }

    [Fact]
    public void Prepare_DropsInnerOAuthStateNoise()
    {
        var sentryEvent = new SentryEvent(
            new InvalidOperationException(
                "wrapper",
                new InvalidOperationException("The oauth state was missing or invalid.")));

        Assert.Null(SentryBeforeSend.Prepare(sentryEvent));
    }

    [Theory]
    [InlineData("GET /health", 0)]
    [InlineData("GET /health/ready", 0)]
    [InlineData("GET /.env", 0)]
    [InlineData("GET /*", 0)]
    [InlineData("GET /fetch", 0)]
    [InlineData("GET /api/v1/events/{idOrSlug}/movies", 0.1)]
    [InlineData(null, 0.1)]
    public void SampleTrace_DropsHealthAndScannerPaths(string? name, double expected)
    {
        Assert.Equal(expected, SentryBeforeSend.SampleTrace(name));
    }
}
