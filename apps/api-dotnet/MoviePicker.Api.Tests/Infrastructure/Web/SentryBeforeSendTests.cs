using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
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

    [Fact]
    public void Prepare_RedactsHostTokenFromRequestUrlAndQueryString()
    {
        var sentryEvent = new SentryEvent(new InvalidOperationException("boom"))
        {
            Request = new SentryRequest
            {
                Url = "https://api.test/api/v1/events/abc/wheel?host=SECRET-TOKEN&x=1",
                QueryString = "host=SECRET-TOKEN&x=1"
            }
        };

        var prepared = SentryBeforeSend.Prepare(sentryEvent);

        Assert.NotNull(prepared);
        Assert.Equal("https://api.test/api/v1/events/abc/wheel?host=***&x=1", prepared!.Request.Url);
        Assert.Equal("host=***&x=1", prepared.Request.QueryString);
    }

    [Fact]
    public void Prepare_EventFromALog_KeepsTheTemplateWithoutTheLoggedValues()
    {
        const string template = "Incomplete read of the watchlist of {Username}: {Collected:N0} film(s) out of {@Expected}";
        var sentryEvent = new SentryEvent
        {
            Message = new SentryMessage
            {
                Message = template,
                Formatted = "Incomplete read of the watchlist of jdoe: 3 film(s) out of 12"
            }
        };
        sentryEvent.SetTag("Username", "jdoe");
        sentryEvent.SetTag("Collected", "3");
        sentryEvent.SetTag("@Expected", "12");
        sentryEvent.SetTag("route.action", "Import");

        var prepared = SentryBeforeSend.Prepare(sentryEvent);

        Assert.NotNull(prepared);
        Assert.Equal(template, prepared!.Message!.Formatted);
        Assert.Equal(template, prepared.Message.Message);
        Assert.Equal("route.action", Assert.Single(prepared.Tags.Keys));
    }

    [Fact]
    public void IsLogNoise_DropsTheReadinessProbeWhichTheUptimeCheckAlreadyWatches()
    {
        Assert.True(SentryBeforeSend.IsLogNoise(
            typeof(MongoDatabaseHealthProbe).FullName!, LogLevel.Error, default, new TimeoutException()));
        Assert.False(SentryBeforeSend.IsLogNoise(
            typeof(RecurringEventPass).FullName!, LogLevel.Error, default, new TimeoutException()));
    }

    [Fact]
    public void Prepare_EventWithoutMessage_KeepsItsTags()
    {
        var sentryEvent = new SentryEvent(new InvalidOperationException("boom"));
        sentryEvent.SetTag("route.action", "Import");

        var prepared = SentryBeforeSend.Prepare(sentryEvent);

        Assert.Equal("Import", prepared!.Tags["route.action"]);
        Assert.Null(prepared.Message);
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

    [Fact]
    public void RedactBreadcrumb_MasksSensitiveQueryKeysInOutboundHttpUrls()
    {
        var breadcrumb = new Breadcrumb(
            "GET https://api.themoviedb.org/3/movie/550?api_key=SECRET&language=fr-FR",
            "http",
            new Dictionary<string, string>
            {
                ["url"] = "https://api.themoviedb.org/3/movie/550?api_key=SECRET&language=fr-FR",
                ["method"] = "GET",
                ["status_code"] = "200"
            },
            "http");

        var redacted = SentryBeforeSend.RedactBreadcrumb(breadcrumb, new SentryHint());

        Assert.NotNull(redacted);
        Assert.Equal("https://api.themoviedb.org/3/movie/550?api_key=***&language=fr-FR", redacted!.Data!["url"]);
        Assert.Equal("GET https://api.themoviedb.org/3/movie/550?api_key=***&language=fr-FR", redacted.Message);
        Assert.Equal("GET", redacted.Data["method"]);
        Assert.Equal("200", redacted.Data["status_code"]);
        Assert.Equal("http", redacted.Category);
        Assert.Equal("http", redacted.Type);
    }

    [Fact]
    public void RedactBreadcrumb_LeavesACleanBreadcrumbUntouched()
    {
        var breadcrumb = new Breadcrumb(
            "GET https://api.themoviedb.org/3/movie/550?language=fr-FR",
            "http",
            new Dictionary<string, string> { ["url"] = "https://api.themoviedb.org/3/movie/550?language=fr-FR" },
            "http");

        Assert.Same(breadcrumb, SentryBeforeSend.RedactBreadcrumb(breadcrumb, new SentryHint()));
    }

    [Fact]
    public void RedactBreadcrumb_WithoutUrlData_IsReturnedAsIs()
    {
        var breadcrumb = new Breadcrumb("Started", "info");

        Assert.Same(breadcrumb, SentryBeforeSend.RedactBreadcrumb(breadcrumb, new SentryHint()));
    }
}
