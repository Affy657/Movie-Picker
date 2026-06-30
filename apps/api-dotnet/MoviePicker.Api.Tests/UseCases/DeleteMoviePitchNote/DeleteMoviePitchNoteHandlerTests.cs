using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.DeleteMoviePitchNote;

public sealed class DeleteMoviePitchNoteHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly DeleteMoviePitchNoteHandler _sut;

    public DeleteMoviePitchNoteHandlerTests()
    {
        _sut = new DeleteMoviePitchNoteHandler(
            _events.Object, _movies.Object, _participants.Object, _hostToken.Object, _currentUser.Object);
    }

    private static Event ActiveEvent() => new() { Id = "evt1", HostToken = "ht", CreatorUserId = "host" };

    private void SetupActiveEventWithMovie(string movieProposer = "p1")
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = "evt1", ParticipantId = movieProposer });
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest()));
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest()));
    }

    [Fact]
    public async Task HandleAsync_HostViaToken_ClearsNote()
    {
        SetupActiveEventWithMovie();
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);

        await _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest());

        _movies.Verify(m => m.UpdatePitchNoteAsync("m1", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HostViaCreator_ClearsNote()
    {
        SetupActiveEventWithMovie();
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("host");

        await _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest());

        _movies.Verify(m => m.UpdatePitchNoteAsync("m1", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NotHostAndNoParticipantId_Throws()
    {
        SetupActiveEventWithMovie();
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest { ParticipantId = null }));
    }

    [Fact]
    public async Task HandleAsync_NotHostAndParticipantNotFound_Throws()
    {
        SetupActiveEventWithMovie();
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest { ParticipantId = "p1" }));
    }

    [Fact]
    public async Task HandleAsync_NotHostButOwningParticipant_ClearsNote()
    {
        SetupActiveEventWithMovie(movieProposer: "p1");
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("owner");
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = "owner" });

        await _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest { ParticipantId = "p1" });

        _movies.Verify(m => m.UpdatePitchNoteAsync("m1", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NotHostAndWrongUser_Throws()
    {
        SetupActiveEventWithMovie(movieProposer: "p1");
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = "owner" });

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.HandleAsync("evt1", "m1", new DeleteMoviePitchNoteRequest { ParticipantId = "p1" }));
    }
}
