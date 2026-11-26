using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.IntegrationTests.Helpers;
using MoviePicker.Api.Tests.Logging;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ShareDocumentForwardedHopsLoggingTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public ShareDocumentForwardedHopsLoggingTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task InvitationDocument_LogsTheForwardedHopsCloudRunHandedOver_NotTheOnesLeftAfterProcessing()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var hops = new CapturingLogger<ShareDocumentForwardedHopsLoggingMiddleware>();
        var client = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
                services.AddSingleton<ILogger<ShareDocumentForwardedHopsLoggingMiddleware>>(hops)))
            .CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/e/unknown-night");
        request.Headers.Add("X-Forwarded-For", "203.0.113.9, 66.249.93.69");

        using var response = await client.SendAsync(request);

        var state = Assert.Single(hops.States).ToDictionary(pair => pair.Key, pair => pair.Value);
        Assert.Equal(2, state["ForwardedHopCount"]);
        Assert.Equal("false,true", state["ForwardedHopsInGoogleFrontEnd"]);
        Assert.True(Assert.IsType<bool>(state["LastForwardedHopInGoogleFrontEnd"]));
    }
}
