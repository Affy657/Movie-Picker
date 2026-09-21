using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Security;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Security;

public sealed class SchedulerCallerAuthenticatorTests
{
    private readonly Mock<ISchedulerTokenValidator> _shared = new();
    private readonly Mock<IGoogleOidcSchedulerTokenValidator> _oidc = new();

    private SchedulerCallerAuthenticator Build() => new(_shared.Object, _oidc.Object);

    private void SharedConfigured(bool configured) => _shared.SetupGet(v => v.IsConfigured).Returns(configured);

    private void OidcConfigured(bool configured) => _oidc.SetupGet(v => v.IsConfigured).Returns(configured);

    private static SchedulerCallerCredentials Credentials(string? shared = null, string? bearer = null) => new(shared, bearer);

    [Fact]
    public async Task NeitherMechanismConfigured_IsNotConfigured()
    {
        SharedConfigured(false);
        OidcConfigured(false);

        var verdict = await Build().AuthenticateAsync(Credentials("x", "y"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.NotConfigured, verdict);
        _oidc.Verify(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        _shared.Verify(v => v.IsValid(It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task ValidBearer_IsAccepted_WithoutConsultingTheSharedToken()
    {
        SharedConfigured(true);
        OidcConfigured(true);
        _oidc.Setup(v => v.IsValidAsync("jwt", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var verdict = await Build().AuthenticateAsync(Credentials(bearer: "jwt"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.Accepted, verdict);
        _shared.Verify(v => v.IsValid(It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task ValidSharedToken_IsAccepted_WhileTheTransitionPathIsConfigured()
    {
        SharedConfigured(true);
        OidcConfigured(true);
        _oidc.Setup(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _shared.Setup(v => v.IsValid("secret")).Returns(true);

        var verdict = await Build().AuthenticateAsync(Credentials(shared: "secret"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.Accepted, verdict);
    }

    [Fact]
    public async Task OnlyOidcConfigured_SharedTokenIsIgnored()
    {
        SharedConfigured(false);
        OidcConfigured(true);
        _oidc.Setup(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _shared.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);

        var verdict = await Build().AuthenticateAsync(Credentials(shared: "secret"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.Refused, verdict);
        _shared.Verify(v => v.IsValid(It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task OnlySharedConfigured_BearerIsIgnored()
    {
        SharedConfigured(true);
        OidcConfigured(false);
        _shared.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);

        var verdict = await Build().AuthenticateAsync(Credentials(bearer: "jwt"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.Refused, verdict);
        _oidc.Verify(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task NothingValid_IsRefused()
    {
        SharedConfigured(true);
        OidcConfigured(true);
        _oidc.Setup(v => v.IsValidAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _shared.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);

        var verdict = await Build().AuthenticateAsync(Credentials("wrong", "wrong"), CancellationToken.None);

        Assert.Equal(SchedulerCallerVerdict.Refused, verdict);
    }

    [Fact]
    public async Task ForwardsTheCancellationTokenToTheOidcValidator()
    {
        SharedConfigured(false);
        OidcConfigured(true);
        using var cts = new CancellationTokenSource();
        _oidc.Setup(v => v.IsValidAsync("jwt", cts.Token)).ReturnsAsync(true);

        var verdict = await Build().AuthenticateAsync(Credentials(bearer: "jwt"), cts.Token);

        Assert.Equal(SchedulerCallerVerdict.Accepted, verdict);
        _oidc.Verify(v => v.IsValidAsync("jwt", cts.Token), Times.Once);
    }
}
