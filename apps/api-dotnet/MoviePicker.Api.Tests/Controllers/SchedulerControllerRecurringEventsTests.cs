using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class SchedulerControllerRecurringEventsTests
{
    private readonly Mock<ISchedulerCallerAuthenticator> _authenticator = new();
    private readonly Mock<IRecurringEventPass> _pass = new();
    private readonly Mock<IFinishedEventWatchlistPass> _watchlistPass = new();
    private readonly SchedulerController _sut = new SchedulerController().WithContext();

    public SchedulerControllerRecurringEventsTests()
    {
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RecurringEventPassResult(3, 2, 1));
    }

    private void Verdict(SchedulerCallerVerdict verdict) =>
        _authenticator
            .Setup(a => a.AuthenticateAsync(It.IsAny<SchedulerCallerCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(verdict);

    private void PresentBearer(string token) => _sut.Request.Headers.Authorization = $"Bearer {token}";

    private Task<IActionResult> Run(CancellationToken ct = default) =>
        _sut.RunRecurringEvents(_authenticator.Object, _pass.Object, ct);

    [Fact]
    public async Task RunFinishedEvents_AcceptedCaller_RunsTheWatchlistPassAndReturnsItsResult()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");
        _watchlistPass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinishedEventWatchlistPassResult(4, 3));

        var result = await _sut.RunFinishedEvents(_authenticator.Object, _watchlistPass.Object, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(new FinishedEventWatchlistPassResult(4, 3), ok.Value);
    }

    [Fact]
    public async Task RunFinishedEvents_RefusedCaller_Returns401AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.Refused);
        PresentBearer("bad");

        var result = await _sut.RunFinishedEvents(_authenticator.Object, _watchlistPass.Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        _watchlistPass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunFinishedEvents_NothingConfigured_Returns503()
    {
        Verdict(SchedulerCallerVerdict.NotConfigured);

        var result = await _sut.RunFinishedEvents(_authenticator.Object, _watchlistPass.Object, CancellationToken.None);

        var response = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        _watchlistPass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRecurringEvents_NothingConfigured_Returns503AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.NotConfigured);
        PresentBearer("peu-importe");

        var result = await Run();

        var response = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRecurringEvents_RefusedCaller_Returns401AndDoesNotRunThePass()
    {
        Verdict(SchedulerCallerVerdict.Refused);
        PresentBearer("mauvais");

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRecurringEvents_WithoutAnyHeader_PresentsEmptyCredentials()
    {
        Verdict(SchedulerCallerVerdict.Refused);

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials(null, null), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunRecurringEvents_ForwardsTheBearerToTheAuthenticator()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");

        await Run();

        _authenticator.Verify(
            a => a.AuthenticateAsync(new SchedulerCallerCredentials(null, "jwt"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunRecurringEvents_AcceptedCaller_RunsThePassAndReturnsItsReport()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");

        var result = await Run();

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<RecurringEventPassResult>(ok.Value);
        Assert.Equal(new RecurringEventPassResult(3, 2, 1), payload);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunRecurringEvents_ForwardsTheCancellationTokenToThePass()
    {
        Verdict(SchedulerCallerVerdict.Accepted);
        PresentBearer("jwt");
        using var cts = new CancellationTokenSource();

        await Run(cts.Token);

        _pass.Verify(p => p.RunAsync(cts.Token), Times.Once);
    }
}
