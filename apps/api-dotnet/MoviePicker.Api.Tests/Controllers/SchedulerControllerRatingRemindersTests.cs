using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class SchedulerControllerRatingRemindersTests
{
    private readonly Mock<ISchedulerCallerAuthenticator> _authenticator = new();
    private readonly Mock<IRatingReminderPass> _pass = new();
    private readonly SchedulerController _sut = new SchedulerController().WithContext();

    public SchedulerControllerRatingRemindersTests()
    {
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RatingReminderPassResult(2, 5));
    }

    private void Verdict(SchedulerCallerVerdict verdict) =>
        _authenticator
            .Setup(a => a.AuthenticateAsync(It.IsAny<SchedulerCallerCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(verdict);

    private void PresentBearer(string token) => _sut.Request.Headers.Authorization = $"Bearer {token}";

    private Task<IActionResult> Run(CancellationToken ct = default) =>
        _sut.RunRatingReminders(_authenticator.Object, _pass.Object, ct);

    [Fact]
    public async Task RunRatingReminders_NothingConfigured_Returns503AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.NotConfigured);
        PresentBearer("peu-importe");

        var result = await Run();

        var response = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRatingReminders_RefusedCaller_Returns401AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.Refused);
        PresentBearer("mauvais-jeton");

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRatingReminders_WithoutAnyHeader_PresentsEmptyCredentials()
    {
        Verdict(SchedulerCallerVerdict.Refused);

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials(null, null), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunRatingReminders_AcceptedCaller_RunsThePassAndReturnsItsReport()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");

        var result = await Run();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(new RatingReminderPassResult(2, 5), ok.Value);
        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials(null, "jwt"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunRatingReminders_ForwardsTheCancellationTokenToThePass()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");
        using var cts = new CancellationTokenSource();

        await Run(cts.Token);

        _pass.Verify(p => p.RunAsync(cts.Token), Times.Once);
    }
}
