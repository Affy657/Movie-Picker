using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Application.UseCases.SetMoviePitchNote;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class EventMoviesControllerTests
{
    private static EventMoviesController Controller() => new EventMoviesController().WithContext();

    [Fact]
    public async Task List_ForwardsToHandler_ReturnsOk()
    {
        var handler = new Mock<IListMoviesForEventHandler>();

        var result = await Controller().List("e", handler.Object, CancellationToken.None, "p1");

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(h => h.HandleAsync("e", "p1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Add_ReturnsCreated_UsingCurrentUser()
    {
        var handler = new Mock<IAddMovieHandler>();
        var currentUser = new Mock<ICurrentUserAccessor>();
        currentUser.Setup(c => c.GetUserId()).Returns("u1");

        var result = await Controller().Add("e", null!, handler.Object, currentUser.Object, CancellationToken.None);

        Assert.IsType<CreatedResult>(result);
        handler.Verify(h => h.HandleAsync("e", It.IsAny<AddMovieRequest>(), "u1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Delete_ForwardsParticipantId_ReturnsNoContent()
    {
        var handler = new Mock<IDeleteMovieHandler>();
        var body = new DeleteMovieRequest { ParticipantId = "participant-000000000001" };

        var result = await Controller().Delete("e", "m1", body, handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("e", "m1", "participant-000000000001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Vote_ReturnsOk()
    {
        var handler = new Mock<IVoteMovieHandler>();

        var result = await Controller().Vote("e", "m1", null!, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        handler.Verify(
            h => h.HandleAsync("e", "m1", It.IsAny<VoteRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ClearVote_BlankParticipant_ReturnsBadRequest()
    {
        var handler = new Mock<IClearMovieVoteHandler>();

        var result = await Controller().ClearVote("e", "m1", "   ", handler.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
        handler.Verify(
            h => h.HandleAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ClearVote_WithParticipant_ReturnsNoContent()
    {
        var handler = new Mock<IClearMovieVoteHandler>();

        var result = await Controller().ClearVote("e", "m1", "p1", handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(h => h.HandleAsync("e", "m1", "p1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MarkAsSeen_ReturnsOk()
    {
        var handler = new Mock<IMarkAsSeenHandler>();

        var result = await Controller().MarkAsSeen("e", "m1", null!, handler.Object, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task SetPitchNote_ReturnsNoContent()
    {
        var handler = new Mock<ISetMoviePitchNoteHandler>();

        var result = await Controller().SetPitchNote("e", "m1", null!, handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeletePitchNote_ReturnsNoContent()
    {
        var handler = new Mock<IDeleteMoviePitchNoteHandler>();

        var result = await Controller().DeletePitchNote("e", "m1", null!, handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task UnmarkAsSeen_ForwardsParticipantId_ReturnsNoContent()
    {
        var handler = new Mock<IUnmarkAsSeenHandler>();
        var request = new UnmarkAsSeenRequest { ParticipantId = "participant-000000000001" };

        var result = await Controller().UnmarkAsSeen("e", "m1", request, handler.Object, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        handler.Verify(
            h => h.HandleAsync("e", "m1", "participant-000000000001", It.IsAny<CancellationToken>()), Times.Once);
    }
}
