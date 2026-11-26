using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.Logging;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ShareDocumentForwardedHopsLoggingMiddlewareTests
{
    private const string ClientAddress = "203.0.113.9";
    private const string HostingAddress = "66.249.93.69";

    private static async Task<CapturingLogger<ShareDocumentForwardedHopsLoggingMiddleware>> ServeAsync(
        StringValues forwardedFor,
        string? policy = RateLimitingExtensions.InvitationDocumentPolicy,
        StringValues forwardedForAfterProcessing = default)
    {
        var logger = new CapturingLogger<ShareDocumentForwardedHopsLoggingMiddleware>();
        var context = new DefaultHttpContext();
        if (forwardedFor.Count > 0)
            context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        var middleware = new ShareDocumentForwardedHopsLoggingMiddleware(
            served =>
            {
                served.Request.Headers["X-Forwarded-For"] = forwardedForAfterProcessing;
                if (policy is not null)
                {
                    served.SetEndpoint(new Endpoint(
                        _ => Task.CompletedTask,
                        new EndpointMetadataCollection(new EnableRateLimitingAttribute(policy)),
                        policy));
                }
                return Task.CompletedTask;
            },
            logger);

        await middleware.InvokeAsync(context);
        return logger;
    }

    private static object? StateOf(CapturingLogger<ShareDocumentForwardedHopsLoggingMiddleware> logger, string key) =>
        Assert.Single(logger.States).Single(pair => pair.Key == key).Value;

    [Fact]
    public async Task RelayedDocument_LogsTheHopsAsReceived_BeforeTheForwardedHeadersAreProcessed()
    {
        var logger = await ServeAsync($"{ClientAddress}, {HostingAddress}", forwardedForAfterProcessing: ClientAddress);

        Assert.Equal(LogLevel.Information, Assert.Single(logger.Entries).Level);
        Assert.Equal(2, StateOf(logger, "ForwardedHopCount"));
        Assert.Equal("false,true", StateOf(logger, "ForwardedHopsInGoogleFrontEnd"));
        Assert.Equal(true, StateOf(logger, "LastForwardedHopInGoogleFrontEnd"));
        Assert.Equal(RateLimitingExtensions.InvitationDocumentPolicy, StateOf(logger, "ShareDocumentPolicy"));
    }

    [Fact]
    public async Task DirectCallWritingAHostingAddressFirst_LogsALastHopOutsideTheGoogleFrontEnd()
    {
        var logger = await ServeAsync($"{HostingAddress}, {ClientAddress}");

        Assert.Equal("true,false", StateOf(logger, "ForwardedHopsInGoogleFrontEnd"));
        Assert.Equal(false, StateOf(logger, "LastForwardedHopInGoogleFrontEnd"));
    }

    [Fact]
    public async Task HopsSpreadOverSeveralHeaderLines_WithPortsAndNoise_AreAllCounted()
    {
        var logger = await ServeAsync(new StringValues(["[2001:db8::1]:443, unknown", " ,142.250.32.37:1234"]));

        Assert.Equal(3, StateOf(logger, "ForwardedHopCount"));
        Assert.Equal("false,false,true", StateOf(logger, "ForwardedHopsInGoogleFrontEnd"));
        Assert.Equal(true, StateOf(logger, "LastForwardedHopInGoogleFrontEnd"));
    }

    [Fact]
    public async Task DocumentWithoutForwardedFor_LogsNoHop()
    {
        var logger = await ServeAsync(StringValues.Empty);

        Assert.Equal(0, StateOf(logger, "ForwardedHopCount"));
        Assert.Equal(string.Empty, StateOf(logger, "ForwardedHopsInGoogleFrontEnd"));
        Assert.Equal(false, StateOf(logger, "LastForwardedHopInGoogleFrontEnd"));
    }

    [Fact]
    public async Task TheLogNeverCarriesAnAddress()
    {
        var logger = await ServeAsync($"{ClientAddress}, {HostingAddress}", forwardedForAfterProcessing: ClientAddress);

        var written = string.Join(
            '|',
            logger.Entries.Select(entry => entry.Message)
                .Concat(logger.States.SelectMany(state => state.Select(pair => Convert.ToString(pair.Value, System.Globalization.CultureInfo.InvariantCulture)))));
        Assert.DoesNotContain(ClientAddress, written, StringComparison.Ordinal);
        Assert.DoesNotContain(HostingAddress, written, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(RateLimitingExtensions.AuthLoginPolicy)]
    [InlineData(RateLimitingExtensions.EventViewPollPolicy)]
    [InlineData(null)]
    public async Task AnyOtherRequest_IsNotLogged(string? policy)
    {
        var logger = await ServeAsync($"{ClientAddress}, {HostingAddress}", policy);

        Assert.Empty(logger.Entries);
    }
}
