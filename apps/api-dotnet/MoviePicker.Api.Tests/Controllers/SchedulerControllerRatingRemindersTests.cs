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
    private readonly Mock<ISchedulerTokenValidator> _tokenValidator = new();
    private readonly Mock<IRatingReminderPass> _pass = new();
    private readonly SchedulerController _sut = new SchedulerController().WithContext();

    public SchedulerControllerRatingRemindersTests()
    {
        _tokenValidator.SetupGet(v => v.IsConfigured).Returns(true);
        _pass.Setup(p => p.RunAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RatingReminderPassResult(2, 5));
    }

    private Task<IActionResult> Run(string? presentedToken) =>
        _sut.RunRatingReminders(
            _tokenValidator.Object,
            _pass.Object,
            presentedToken,
            CancellationToken.None);

    [Fact]
    public async Task RunRatingReminders_TokenNotConfigured_Returns503AndDoesNotRunThePass()
    {
        _tokenValidator.SetupGet(v => v.IsConfigured).Returns(false);
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);

        var result = await Run("peu-importe");

        var response = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRatingReminders_WrongToken_Returns401AndDoesNotRunThePass()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);

        var result = await Run("mauvais-token");

        Assert.IsType<UnauthorizedResult>(result);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunRatingReminders_MissingHeader_Returns401()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(false);

        var result = await Run(null);

        Assert.IsType<UnauthorizedResult>(result);
        _tokenValidator.Verify(v => v.IsValid(It.Is<string?>(t => string.IsNullOrEmpty(t))), Times.Once);
    }

    [Fact]
    public async Task RunRatingReminders_ValidToken_RunsThePassAndReturnsItsReport()
    {
        _tokenValidator.Setup(v => v.IsValid("bon-token")).Returns(true);

        var result = await Run("bon-token");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(new RatingReminderPassResult(2, 5), ok.Value);
        _pass.Verify(p => p.RunAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunRatingReminders_ForwardsTheCancellationTokenToThePass()
    {
        _tokenValidator.Setup(v => v.IsValid(It.IsAny<string?>())).Returns(true);
        using var cts = new CancellationTokenSource();

        await _sut.RunRatingReminders(_tokenValidator.Object, _pass.Object, "bon-token", cts.Token);

        _pass.Verify(p => p.RunAsync(cts.Token), Times.Once);
    }
}
