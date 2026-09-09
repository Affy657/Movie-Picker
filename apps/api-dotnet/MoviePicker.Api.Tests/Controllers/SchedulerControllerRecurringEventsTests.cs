using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class SchedulerControllerRecurringEventsTests
{
    private readonly Mock<ISchedulerTokenValidator> _tokenValidator = new();
    private readonly Mock<IRecurringEventPass> _pass = new();
    private readonly SchedulerController _sut = new SchedulerController().WithContext();

    public SchedulerControllerRecurringEventsTests()
    {
        _tokenValidator.SetupGet(v => v.IsConfigured).Returns(true);
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RecurringEventPassResult(3, 2, 1));
    }

    private void PresentToken(string? token)
    {
        if (token is not null)
            _sut.ControllerContext.HttpContext.Request.Headers["X-Scheduler-Token"] = token;
    }

    private Task<IActionResult> Run() =>
        _sut.RunRecurringEvents(_tokenValidator.Object, _pass.Object, CancellationToken.None);

    [Fact]
    public async Task RunRecurringEvents_TokenNotConfigured_Returns503AndDoesNotRunThePass()
    {
        _tokenValidator.SetupGet(v => v.IsConfigured).Returns(false);
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);
        PresentToken("peu-importe");

        var result = await Run();

        var response = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRecurringEvents_WrongToken_Returns401AndDoesNotRunThePass()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);
        PresentToken("mauvais-token");

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRecurringEvents_ValidToken_RunsThePassAndReturnsItsReport()
    {
        _tokenValidator.Setup(v => v.IsValid("bon-token")).Returns(true);
        PresentToken("bon-token");

        var result = await Run();

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<RecurringEventPassResult>(ok.Value);
        Assert.Equal(new RecurringEventPassResult(3, 2, 1), payload);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunRecurringEvents_ForwardsTheCancellationTokenToThePass()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);
        PresentToken("bon-token");
        using var cts = new CancellationTokenSource();

        await _sut.RunRecurringEvents(_tokenValidator.Object, _pass.Object, cts.Token);

        _pass.Verify(p => p.RunAsync(cts.Token), Times.Once);
    }
}
