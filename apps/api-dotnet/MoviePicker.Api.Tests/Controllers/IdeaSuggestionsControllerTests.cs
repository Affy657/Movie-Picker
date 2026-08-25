using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.IdeaSuggestions;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class IdeaSuggestionsControllerTests
{
    private readonly IdeaSuggestionsController _sut = new IdeaSuggestionsController().WithContext();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<ICreateIdeaSuggestionHandler> _handler = new();

    private static CreateIdeaSuggestionRequest Request() =>
        new()
        {
            Category = IdeaSuggestionCategory.Idea,
            Title = "Un titre",
            Description = "Une description assez longue."
        };

    [Fact]
    public async Task Create_Unauthenticated_ReturnsUnauthorized()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);

        var result = await _sut.Create(Request(), _handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        _handler.Verify(
            h => h.HandleAsync(It.IsAny<string>(), It.IsAny<CreateIdeaSuggestionRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Create_Authenticated_ReturnsNoContent()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("u1");
        var request = Request();

        var result = await _sut.Create(request, _handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _handler.Verify(h => h.HandleAsync("u1", request, It.IsAny<CancellationToken>()), Times.Once);
    }
}
