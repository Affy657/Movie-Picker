using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Security;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Security;

public sealed class SchedulerCallerAuthenticatorTests
{
    private readonly Mock<IGoogleOidcSchedulerTokenValidator> _oidc = new();

    private SchedulerCallerAuthenticator Build() => new(_oidc.Object);

    private void OidcConfigured(bool configured) => _oidc.SetupGet(v => v.IsConfigured).Returns(configured);

    [Fact]
    public async Task OidcNotConfigured_IsNotConfigured()
    {
        OidcConfigured(false);

        var verdict = await Build().AuthenticateAsync(new SchedulerCallerCredentials("jwt"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.NotConfigured, verdict);
        _oidc.Verify(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ValidBearer_IsAccepted()
    {
        OidcConfigured(true);
        _oidc.Setup(v => v.IsValidAsync("jwt", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var verdict = await Build().AuthenticateAsync(new SchedulerCallerCredentials("jwt"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.Accepted, verdict);
    }

    [Fact]
    public async Task InvalidOrMissingBearer_IsRefused()
    {
        OidcConfigured(true);
        _oidc.Setup(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

        Assert.Equal(
            SchedulerCallerVerdict.Refused,
            await Build().AuthenticateAsync(new SchedulerCallerCredentials("wrong"), CancellationToken.None));
        Assert.Equal(
            SchedulerCallerVerdict.Refused,
            await Build().AuthenticateAsync(new SchedulerCallerCredentials(null), CancellationToken.None));
    }

    [Fact]
    public async Task ForwardsTheCancellationTokenToTheOidcValidator()
    {
        OidcConfigured(true);
        using var cts = new CancellationTokenSource();
        _oidc.Setup(v => v.IsValidAsync("jwt", cts.Token)).ReturnsAsync(true);

        var verdict = await Build().AuthenticateAsync(new SchedulerCallerCredentials("jwt"), cts.Token);

        Assert.Equal(SchedulerCallerVerdict.Accepted, verdict);
        _oidc.Verify(v => v.IsValidAsync("jwt", cts.Token), Times.Once);
    }
}
