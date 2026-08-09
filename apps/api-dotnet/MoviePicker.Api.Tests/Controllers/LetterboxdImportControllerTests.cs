using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class LetterboxdImportControllerTests
{
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly LetterboxdImportController _sut = new LetterboxdImportController().WithContext();

    [Fact]
    public async Task Preview_NullBody_ReturnsBadRequest()
    {
        var handler = new Mock<IPreviewLetterboxdImportHandler>();

        var result = await _sut.Preview(null, handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Preview_Unauthenticated_ReturnsUnauthorized()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        var handler = new Mock<IPreviewLetterboxdImportHandler>();

        var result = await _sut.Preview(
            new LetterboxdImportPreviewRequest { Csv = "Name,Year\nMatrix,1999" },
            handler.Object,
            _currentUser.Object,
            CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Preview_Authenticated_ReturnsOkWithHandlerResult()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("u1");
        var handler = new Mock<IPreviewLetterboxdImportHandler>();
        var response = new LetterboxdImportPreviewResponse { Rows = [] };
        handler
            .Setup(h => h.HandleAsync("u1", It.IsAny<LetterboxdImportPreviewRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _sut.Preview(
            new LetterboxdImportPreviewRequest { Csv = "Name,Year\nMatrix,1999" },
            handler.Object,
            _currentUser.Object,
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Same(response, ok.Value);
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
