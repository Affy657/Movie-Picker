using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class SchedulerControllerTests
{
    private readonly Mock<ISchedulerCallerAuthenticator> _authenticator = new();
    private readonly Mock<IEventReminderPass> _pass = new();
    private readonly SchedulerController _sut = new SchedulerController().WithContext();

    public SchedulerControllerTests()
    {
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventReminderPassResult(4, 1, 2, 0));
    }

    private void Verdict(SchedulerCallerVerdict verdict) =>
        _authenticator
            .Setup(a => a.AuthenticateAsync(It.IsAny<SchedulerCallerCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(verdict);

    private void PresentBearer(string token) => _sut.Request.Headers.Authorization = $"Bearer {token}";

    private Task<IActionResult> Run(CancellationToken ct = default) =>
        _sut.RunEventReminders(_authenticator.Object, _pass.Object, ct);

    [Fact]
    public async Task RunEventReminders_NothingConfigured_Returns503AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.NotConfigured);
        PresentBearer("jwt");

        var result = await Run();

        var response = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunEventReminders_RefusedCaller_Returns401AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.Refused);
        PresentBearer("mauvais-jwt");

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunEventReminders_WithoutAnyHeader_PresentsEmptyCredentials()
    {
        Verdict(SchedulerCallerVerdict.Refused);

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials(null), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_AcceptedCaller_RunsThePassAndReturnsItsReport()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");

        var result = await Run();

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<EventReminderPassResult>(ok.Value);
        Assert.Equal(new EventReminderPassResult(4, 1, 2, 0), payload);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_IgnoresTheRetiredSharedTokenHeader()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        _sut.Request.Headers["X-Scheduler-Token"] = "bon-token";
        PresentBearer("jwt");

        await Run();

        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials("jwt"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_ReadsTheBearerSchemeCaseInsensitivelyAndIgnoresOtherSchemes()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        _sut.Request.Headers.Authorization = "bearer jwt";
        await Run();
        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials("jwt"), It.IsAny<CancellationToken>()),
            Times.Once);

        _sut.Request.Headers.Authorization = "Basic abc";
        await Run();
        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials(null), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_ForwardsTheCancellationTokenToThePassAndTheAuthenticator()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        using var cts = new CancellationTokenSource();

        await Run(cts.Token);

        _pass.Verify(p => p.RunAsync(cts.Token), Times.Once);
        _authenticator.Verify(a => a.AuthenticateAsync(It.IsAny<SchedulerCallerCredentials>(), cts.Token), Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_DeliveriesToRetry_Answers503SoCloudSchedulerRetries()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventReminderPassResult(4, 1, 2, 0, DeliveryFailures: 1));

        var result = await Run();

        var status = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, status.StatusCode);
        Assert.IsType<EventReminderPassResult>(status.Value);
    }

    [Fact]
    public async Task RunCatalogWarmUp_EverySnapshotRefreshed_AnswersOk()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        var pass = new Mock<MoviePicker.Api.Application.UseCases.GetMovieShowcase.ICatalogWarmPass>();
        pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MoviePicker.Api.Application.UseCases.GetMovieShowcase.CatalogWarmPassResult(17, 0));

        var result = await _sut.RunCatalogWarmUp(_authenticator.Object, pass.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task RunCatalogWarmUp_ASnapshotKept_Answers503()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        var pass = new Mock<MoviePicker.Api.Application.UseCases.GetMovieShowcase.ICatalogWarmPass>();
        pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MoviePicker.Api.Application.UseCases.GetMovieShowcase.CatalogWarmPassResult(16, 1));

        var result = await _sut.RunCatalogWarmUp(_authenticator.Object, pass.Object, CancellationToken.None);

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result).StatusCode);
    }
}
