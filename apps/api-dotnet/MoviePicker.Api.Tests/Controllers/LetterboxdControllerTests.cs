using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class LetterboxdControllerTests
{
    private readonly LetterboxdController _sut = new LetterboxdController().WithContext();

    [Fact]
    public async Task Sync_Authenticated_ForwardsForceFlagAndReturnsResult()
    {
        var handler = new Mock<ISyncLetterboxdWatchlistHandler>();
        var response = new LetterboxdSyncResponse { Added = 2 };
        handler
            .Setup(h => h.HandleAsync("u1", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _sut.Sync(handler.Object, "u1", CancellationToken.None, force: true);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public async Task Sync_DefaultsToNonForcedSync()
    {
        var handler = new Mock<ISyncLetterboxdWatchlistHandler>();
        handler
            .Setup(h => h.HandleAsync("u1", false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdSyncResponse { Skipped = true });

        await _sut.Sync(handler.Object, "u1", CancellationToken.None);

        handler.Verify(h => h.HandleAsync("u1", false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Confirm_NullBody_ReturnsBadRequest()
    {
        var handler = new Mock<IConfirmLetterboxdImportHandler>();

        var result = await _sut.Confirm(null, handler.Object, "u1", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Confirm_Authenticated_ReturnsOkWithHandlerResult()
    {
        var handler = new Mock<IConfirmLetterboxdImportHandler>();
        var response = new LetterboxdImportConfirmResponse { Added = 1, AlreadyPresent = 0 };
        handler
            .Setup(h => h.HandleAsync("u1", It.IsAny<LetterboxdImportConfirmRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _sut.Confirm(
            new LetterboxdImportConfirmRequest { Selections = [] },
            handler.Object,
            "u1",
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
    }
}
