using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SetMoviePitchNote;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using MoviePicker.Api.Tests.Builders;

namespace MoviePicker.Api.Tests.UseCases.SetMoviePitchNote;

public sealed class SetMoviePitchNoteHandlerTests
{
    private const string UserId = "host";

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly SetMoviePitchNoteHandler _sut;

    public SetMoviePitchNoteHandlerTests()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns(UserId);
        _sut = new SetMoviePitchNoteHandler(_events.Object, _movies.Object, _participants.Object, _currentUser.Object);
    }

    private static Event ActiveEvent(string? winnerMovieId = null, DateTimeOffset? closedAt = null) => new()
    {
        Id = "evt1",
        HostToken = "ht",
        CreatorUserId = "host",
        Winners = TestWinners.Won(winnerMovieId),
        ClosedAt = closedAt
    };

    private void SetupEvent(Event evt) =>
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

    private static SetMoviePitchNoteRequest Request(string participantId = "p1", string note = "Top film") =>
        new() { ParticipantId = participantId, PitchNote = note };

    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_FinishedEvent_Throws()
    {
        SetupEvent(ActiveEvent(closedAt: DateTimeOffset.UtcNow.AddDays(-1)));

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_WheelAlreadyLaunched_Throws()
    {
        SetupEvent(ActiveEvent(winnerMovieId: "m1"));

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_Throws()
    {
        SetupEvent(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_ParticipantNotFound_Throws()
    {
        SetupEvent(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = "evt1", ParticipantId = "p1" });
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_NotOwningParticipant_Throws()
    {
        SetupEvent(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = "evt1", ParticipantId = "p1" });
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = "someone-else" });

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_MovieNotProposedByParticipant_Throws()
    {
        SetupEvent(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = "evt1", ParticipantId = "other-participant" });
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = UserId });

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "m1", Request()));
    }

    [Fact]
    public async Task HandleAsync_NoteTooLong_Throws()
    {
        SetupEvent(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = "evt1", ParticipantId = "p1" });
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = UserId });

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("evt1", "m1", Request(note: new string('x', 141))));
    }

    [Fact]
    public async Task HandleAsync_Valid_UpdatesTrimmedNote()
    {
        SetupEvent(ActiveEvent());
        _movies.Setup(m => m.GetByIdAndEventIdAsync("m1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = "evt1", ParticipantId = "p1" });
        _participants.Setup(p => p.FindByIdAndEventIdAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", UserId = UserId });

        await _sut.HandleAsync("evt1", "m1", Request(note: "  Super film  "));

        _movies.Verify(m => m.UpdatePitchNoteAsync("m1", "Super film", It.IsAny<CancellationToken>()), Times.Once);
    }
}
