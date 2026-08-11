using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class LetterboxdControllerTests
{
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly LetterboxdController _sut = new LetterboxdController().WithContext();

    [Fact]
    public async Task Sync_Unauthenticated_ReturnsUnauthorized()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        var handler = new Mock<ISyncLetterboxdWatchlistHandler>();

        var result = await _sut.Sync(handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        handler.Verify(
            h => h.HandleAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Sync_Authenticated_ForwardsForceFlagAndReturnsResult()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("u1");
        var handler = new Mock<ISyncLetterboxdWatchlistHandler>();
        var response = new LetterboxdSyncResponse { Added = 2 };
        handler
            .Setup(h => h.HandleAsync("u1", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _sut.Sync(handler.Object, _currentUser.Object, CancellationToken.None, force: true);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
    }

    [Fact]
    public async Task Sync_DefaultsToNonForcedSync()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("u1");
        var handler = new Mock<ISyncLetterboxdWatchlistHandler>();
        handler
            .Setup(h => h.HandleAsync("u1", false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdSyncResponse { Skipped = true });

        await _sut.Sync(handler.Object, _currentUser.Object, CancellationToken.None);

        handler.Verify(h => h.HandleAsync("u1", false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Confirm_NullBody_ReturnsBadRequest()
    {
        var handler = new Mock<IConfirmLetterboxdImportHandler>();

        var result = await _sut.Confirm(null, handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Confirm_Unauthenticated_ReturnsUnauthorized()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        var handler = new Mock<IConfirmLetterboxdImportHandler>();

        var result = await _sut.Confirm(
            new LetterboxdImportConfirmRequest { Selections = [] },
            handler.Object,
            _currentUser.Object,
            CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Confirm_Authenticated_ReturnsOkWithHandlerResult()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("u1");
        var handler = new Mock<IConfirmLetterboxdImportHandler>();
        var response = new LetterboxdImportConfirmResponse { Added = 1, AlreadyPresent = 0 };
        handler
            .Setup(h => h.HandleAsync("u1", It.IsAny<LetterboxdImportConfirmRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _sut.Confirm(
            new LetterboxdImportConfirmRequest { Selections = [] },
            handler.Object,
            _currentUser.Object,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
    }
}
