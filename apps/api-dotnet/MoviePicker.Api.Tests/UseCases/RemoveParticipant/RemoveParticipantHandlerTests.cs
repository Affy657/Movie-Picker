using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RemoveParticipant;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.RemoveParticipant;

public sealed class RemoveParticipantHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IVoteRepository> _voteRepo = new();
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo = new();
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly RecordingUnitOfWork _unitOfWork = new();
    private readonly RemoveParticipantHandler _sut;
    private static readonly string[] value = new[] { "m1", "m2" };

    public RemoveParticipantHandlerTests()
    {
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());

        _sut = new RemoveParticipantHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _seenMarkRepo.Object,
            _hostTokenAccessor.Object,
            _currentUser.Object,
            _unitOfWork,
            TimeProvider.System,
            NullLogger<RemoveParticipantHandler>.Instance);
    }

    private static Event ActiveEvent(string hostToken = "ht1", string? creatorUserId = null) => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = hostToken,
        CreatorUserId = creatorUserId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Participant Participant(string id = "p1", string? userId = null, string pseudo = "Alice") => new()
    {
        Id = id,
        EventId = "evt1",
        Pseudo = pseudo,
        UserId = userId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void SetupEvent(Event evt) =>
        _eventRepo
            .Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt);

    private void SetupParticipant(Participant? p) =>
        _participantRepo
            .Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(p);

    [Fact]
    public async Task HandleAsync_BlankParticipantId_ThrowsBadRequest()
    {
        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "  "));
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFound()
    {
        _eventRepo
            .Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "p1"));
    }

    [Fact]
    public async Task HandleAsync_ParticipantNotFound_ThrowsNotFound()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(null);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_ClosedEvent_ThrowsConflict()
    {
        var closed = ActiveEvent() with { ClosedAt = DateTimeOffset.UtcNow };
        SetupEvent(closed);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_RemovingCreator_ThrowsConflict()
    {
        SetupEvent(ActiveEvent(creatorUserId: "user-creator"));
        SetupParticipant(Participant(userId: "user-creator"));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
        Assert.Equal(ErrorCodes.CreatorCannotBeRemoved, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_NoAuthorization_ThrowsForbidden()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: "someone-else"));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_GuestParticipant_CannotSelfRemove_ThrowsForbidden()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: null));

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_HostByToken_RemovesParticipantAndCascades()
    {
        SetupEvent(ActiveEvent());
        var participant = Participant(userId: null);
        SetupParticipant(participant);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(value);
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("p1", result.ParticipantId);
        Assert.Equal(2, result.RemovedMovies);
        Assert.Equal("Participant removed", result.Message);

        _voteRepo.Verify(r => r.DeleteByMovieIdsAsync(
            It.Is<IReadOnlyCollection<string>>(ids => ids.SequenceEqual(value)), It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdsAsync(
            "evt1", It.Is<IReadOnlyCollection<string>>(ids => ids.SequenceEqual(value)), It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(
            It.Is<IReadOnlyCollection<string>>(ids => ids.SequenceEqual(value)), It.IsAny<CancellationToken>()), Times.Once);
        _voteRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _participantRepo.Verify(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Equal(1, _unitOfWork.Executions);
        _eventRepo.Verify(r => r.UpdateAsync(It.Is<Event>(e => e.Id == "evt1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WinnerDrawnMeanwhile_RefusesInsideTheUnitOfWorkAndDeletesNothing()
    {
        var evt = ActiveEvent();
        _eventRepo.SetupSequence(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt)
            .ReturnsAsync(evt with { Winners = TestWinners.Won("m1") });
        SetupParticipant(Participant(userId: null));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));

        Assert.Equal(ErrorCodes.ParticipantsLockedWheel, ex.Reason);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _participantRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_RunsEveryDeleteInsideTheUnitOfWork()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: null));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(value);
        var deletesOutsideUnitOfWork = 0;
        void CountOutside() { if (!_unitOfWork.IsExecuting) deletesOutsideUnitOfWork++; }
        _voteRepo.Setup(r => r.DeleteByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(2);
        _seenMarkRepo.Setup(r => r.DeleteByMovieIdsAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(2);
        _movieRepo.Setup(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(2);
        _voteRepo.Setup(r => r.DeleteByEventAndParticipantAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).Returns(Task.CompletedTask);
        _seenMarkRepo.Setup(r => r.DeleteByEventAndParticipantAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).Returns(Task.CompletedTask);
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "p1");

        Assert.Equal(0, deletesOutsideUnitOfWork);
        Assert.Equal(1, _unitOfWork.Executions);
        _eventRepo.Verify(r => r.UpdateAsync(It.Is<Event>(e => e.Id == "evt1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ListsTheParticipantsFilmsInsideTheUnitOfWork()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: null));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var listedOutsideUnitOfWork = 0;
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()))
            .Callback(() => { if (!_unitOfWork.IsExecuting) listedOutsideUnitOfWork++; })
            .ReturnsAsync(value);

        await _sut.HandleAsync("evt1", "p1");

        Assert.Equal(0, listedOutsideUnitOfWork);
    }

    [Fact]
    public async Task HandleAsync_ConnectedUserSelfLeave_Succeeds_WithLeaveMessage()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator"));
        SetupParticipant(Participant(userId: "user-1"));
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("You left the movie night", result.Message);
        Assert.Equal(0, result.RemovedMovies);
    }

    [Fact]
    public async Task HandleAsync_HostIsCreatorViaUserId_CanRemoveOtherParticipant()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator-1"));
        SetupParticipant(Participant(userId: "user-2"));
        _currentUser.Setup(c => c.GetUserId()).Returns("creator-1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("Participant removed", result.Message);
    }

    [Fact]
    public async Task HandleAsync_DeleteReturnsFalse_ThrowsNotFound()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "p1"));

        Assert.Equal(1, _unitOfWork.Executions);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WheelLaunched_ButNotClosed_ThrowsConflict()
    {
        var withWinner = ActiveEvent() with { Winners = TestWinners.Won("movie-winner") };
        SetupEvent(withWinner);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
        Assert.Equal(ErrorCodes.ParticipantsLockedWheel, ex.Reason);

        _participantRepo.Verify(
            r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_GuestHostByToken_RemovesItsOwnParticipant_DocumentedV1Behavior()
    {
        SetupEvent(ActiveEvent(hostToken: "ht1", creatorUserId: null));
        SetupParticipant(Participant(userId: null));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("p1", result.ParticipantId);
        Assert.Equal("Participant removed", result.Message);
    }
}
