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
    private readonly Mock<ISchedulerTokenValidator> _tokenValidator = new();
    private readonly Mock<IEventReminderPass> _pass = new();
    private readonly SchedulerController _sut = new SchedulerController().WithContext();

    public SchedulerControllerTests()
    {
        _tokenValidator.SetupGet(v => v.IsConfigured).Returns(true);
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventReminderPassResult(4, 1, 2, 0));
    }

    private void PresentToken(string? token)
    {
        if (token is not null)
            _sut.ControllerContext.HttpContext.Request.Headers["X-Scheduler-Token"] = token;
    }

    private Task<IActionResult> Run() =>
        _sut.RunEventReminders(_tokenValidator.Object, _pass.Object, CancellationToken.None);

    [Fact]
    public async Task RunEventReminders_TokenNotConfigured_Returns503AndDoesNotRunThePass()
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
    public async Task RunEventReminders_WrongToken_Returns401AndDoesNotRunThePass()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);
        PresentToken("mauvais-token");

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunEventReminders_MissingHeader_Returns401()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);

        var result = await Run();

        Assert.IsType<UnauthorizedResult>(result);
        _tokenValidator.Verify(v => v.IsValid(It.Is<string?>(t => string.IsNullOrEmpty(t))), Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_ValidToken_RunsThePassAndReturnsItsReport()
    {
        _tokenValidator.Setup(v => v.IsValid("bon-token")).Returns(true);
        PresentToken("bon-token");

        var result = await Run();

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<EventReminderPassResult>(ok.Value);
        Assert.Equal(new EventReminderPassResult(4, 1, 2, 0), payload);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_ForwardsThePresentedTokenToTheValidator()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);
        PresentToken("bon-token");

        await Run();

        _tokenValidator.Verify(v => v.IsValid("bon-token"), Times.Once);
    }

    [Fact]
    public async Task RunEventReminders_ForwardsTheCancellationTokenToThePass()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);
        PresentToken("bon-token");
        using var cts = new CancellationTokenSource();

        await _sut.RunEventReminders(_tokenValidator.Object, _pass.Object, cts.Token);

        _pass.Verify(p => p.RunAsync(cts.Token), Times.Once);
    }
}
