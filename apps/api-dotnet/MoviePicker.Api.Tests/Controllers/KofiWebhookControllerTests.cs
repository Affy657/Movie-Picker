using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.UseCases.Donations;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class KofiWebhookControllerTests
{
    private readonly KofiWebhookController _sut = new KofiWebhookController().WithContext();
    private readonly Mock<IProcessKofiWebhookHandler> _handler = new();

    [Theory]
    [InlineData(KofiWebhookOutcome.NotConfigured, StatusCodes.Status503ServiceUnavailable)]
    [InlineData(KofiWebhookOutcome.InvalidPayload, StatusCodes.Status400BadRequest)]
    [InlineData(KofiWebhookOutcome.InvalidToken, StatusCodes.Status401Unauthorized)]
    [InlineData(KofiWebhookOutcome.AlreadyProcessed, StatusCodes.Status200OK)]
    [InlineData(KofiWebhookOutcome.NoMatchingAccount, StatusCodes.Status200OK)]
    [InlineData(KofiWebhookOutcome.SupporterMarked, StatusCodes.Status200OK)]
    public async Task Receive_MapsOutcomeToStatus(KofiWebhookOutcome outcome, int expected)
    {
        _handler
            .Setup(h => h.HandleAsync("payload", It.IsAny<CancellationToken>()))
            .ReturnsAsync(outcome);

        var result = await _sut.Receive("payload", _handler.Object, CancellationToken.None);

        Assert.Equal(expected, StatusOf(result));
    }

    private static int StatusOf(IActionResult result) =>
        result switch
        {
            StatusCodeResult status => status.StatusCode,
            ObjectResult obj => obj.StatusCode ?? -1,
            _ => -1
        };
}
