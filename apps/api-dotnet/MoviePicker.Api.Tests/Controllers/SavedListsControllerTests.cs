using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class SavedListsControllerTests
{
    private const string UserId = "u1";

    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly SavedListsController _sut = new SavedListsController().WithContext();

    [Fact]
    public async Task EveryAction_WithoutAUser_IsUnauthorized_AndCallsNoHandler()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        var ct = CancellationToken.None;
        var user = _currentUser.Object;

        IActionResult[] results =
        [
            await _sut.List(null, null, Mock.Of<IListSavedListsHandler>(MockBehavior.Strict), user, ct),
            await _sut.Save(new SaveListRequest { SourceType = "tmdbCollection", SourceId = "1241" }, Mock.Of<ISaveListHandler>(MockBehavior.Strict), user, ct),
            await _sut.Get("s1", Mock.Of<IGetSavedListHandler>(MockBehavior.Strict), user, ct),
            await _sut.Delete("s1", Mock.Of<IUnsaveListHandler>(MockBehavior.Strict), user, ct),
            await _sut.Copy("s1", new CopySavedListRequest { Name = "Ma saga" }, Mock.Of<ICopySavedListHandler>(MockBehavior.Strict), user, ct)
        ];

        Assert.All(results, result => Assert.IsType<UnauthorizedResult>(result));
    }

    [Fact]
    public async Task List_PassesTheSourceFilterThrough()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns(UserId);
        var handler = new Mock<IListSavedListsHandler>();
        var response = new SavedListsResponse();
        handler
            .Setup(h => h.HandleAsync(UserId, "explorerTheme", "frissons", It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await _sut.List("explorerTheme", "frissons", handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.Same(response, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Theory]
    [InlineData(true, typeof(CreatedResult))]
    [InlineData(false, typeof(OkObjectResult))]
    public async Task Save_AnswersCreatedOnlyForANewSave(bool created, Type expected)
    {
        _currentUser.Setup(c => c.GetUserId()).Returns(UserId);
        var request = new SaveListRequest { SourceType = "tmdbCollection", SourceId = "1241" };
        var summary = new SavedListSummaryResponse { Id = "s1" };
        var handler = new Mock<ISaveListHandler>();
        handler
            .Setup(h => h.HandleAsync(UserId, request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SavedListSaving(summary, created));

        var result = await _sut.Save(request, handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType(expected, result);
        Assert.Same(summary, ((ObjectResult)result).Value);
    }

    [Fact]
    public async Task Delete_AnswersNoContent()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns(UserId);
        var handler = new Mock<IUnsaveListHandler>();

        var result = await _sut.Delete("s1", handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync(UserId, "s1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Copy_AnswersTheCreatedList()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns(UserId);
        var request = new CopySavedListRequest { Name = "Ma saga" };
        var list = new MovieListResponse { Id = "l1", Name = "Ma saga" };
        var handler = new Mock<ICopySavedListHandler>();
        handler.Setup(h => h.HandleAsync(UserId, "s1", request, It.IsAny<CancellationToken>())).ReturnsAsync(list);

        var result = await _sut.Copy("s1", request, handler.Object, _currentUser.Object, CancellationToken.None);

        Assert.Same(list, Assert.IsType<CreatedResult>(result).Value);
    }
}
