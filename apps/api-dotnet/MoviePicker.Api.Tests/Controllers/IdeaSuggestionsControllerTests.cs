using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.IdeaSuggestions;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class IdeaSuggestionsControllerTests
{
    private readonly IdeaSuggestionsController _sut = new IdeaSuggestionsController().WithContext();
    private readonly Mock<ICreateIdeaSuggestionHandler> _handler = new();

    private static CreateIdeaSuggestionRequest Request() =>
        new()
        {
            Category = IdeaSuggestionCategory.Idea,
            Title = "Un titre",
            Description = "Une description assez longue."
        };

    [Fact]
    public async Task Create_Authenticated_ReturnsNoContent()
    {
        var request = Request();

        var result = await _sut.Create(request, _handler.Object, "u1", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _handler.Verify(h => h.HandleAsync("u1", request, It.IsAny<CancellationToken>()), Times.Once);
    }
}
