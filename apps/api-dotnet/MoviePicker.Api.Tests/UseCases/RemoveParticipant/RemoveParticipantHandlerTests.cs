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
    private readonly Mock<IMovieRatingRepository> _ratingRepo = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubscriptions = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly RecordingUnitOfWork _unitOfWork = new();
    private readonly RemoveParticipantHandler _sut;
    private static readonly string[] value = new[] { "m1", "m2" };
    private static readonly string[] KeptOut = ["earlier", "user-2"];
    private static readonly string[] KeptOutGuest = ["guest"];
    private static readonly string[] RemainingCoHost = ["other"];
    private static readonly string[] KeptOutCoHost = ["co-host"];

    public RemoveParticipantHandlerTests()
    {
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
            _ratingRepo.Object,
            _currentUser.Object,
            TestAudienceNotifier.Over(
                _participantRepo.Object, _users.Object, _pushSubscriptions.Object, _pushSender.Object, _notifications.Object),
            _unitOfWork,
            TimeProvider.System,
            NullLogger<RemoveParticipantHandler>.Instance);
    }

    private const string HostUserId = "host-user";

    private void AsHost() => _currentUser.Setup(c => c.GetUserId()).Returns(HostUserId);

    private static Event ActiveEvent(string? creatorUserId = HostUserId) => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = "soiree",
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
            .Setup(r => r.GetBySlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
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
            .Setup(r => r.GetBySlugAsync("bad", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "p1"));
    }

    [Fact]
    public async Task HandleAsync_ParticipantNotFound_ThrowsNotFound()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_ClosedEvent_ThrowsConflict()
    {
        var closed = ActiveEvent() with { ClosedAt = DateTimeOffset.UtcNow };
        SetupEvent(closed);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_RemovingCreator_ThrowsConflict()
    {
        SetupEvent(ActiveEvent(creatorUserId: "user-creator"));
        SetupParticipant(Participant(userId: "user-creator"));

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
        Assert.Equal(ErrorCodes.CreatorCannotBeRemoved, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_NoAuthorization_ThrowsForbidden()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: "someone-else"));
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
    public async Task HandleAsync_HostAccount_RemovesParticipantAndCascades()
    {
        AsHost();
        SetupEvent(ActiveEvent());
        var participant = Participant(userId: null);
        SetupParticipant(participant);
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
        _ratingRepo.Verify(r => r.DeleteByMovieIdsAsync(
            "evt1", It.Is<IReadOnlyCollection<string>>(ids => ids.SequenceEqual(value)), It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(
            It.Is<IReadOnlyCollection<string>>(ids => ids.SequenceEqual(value)), It.IsAny<CancellationToken>()), Times.Once);
        _voteRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _ratingRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _participantRepo.Verify(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()), Times.Once);
        Assert.Equal(1, _unitOfWork.Executions);
        _eventRepo.Verify(r => r.UpdateAsync(It.Is<Event>(e => e.Id == "evt1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WinnerDrawnMeanwhile_RefusesInsideTheUnitOfWorkAndDeletesNothing()
    {
        AsHost();
        var evt = ActiveEvent();
        _eventRepo.SetupSequence(r => r.GetBySlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt)
            .ReturnsAsync(evt with { Winners = TestWinners.Won("m1") });
        SetupParticipant(Participant(userId: null));

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));

        Assert.Equal(ErrorCodes.ParticipantsLockedWheel, ex.Reason);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _participantRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_RunsEveryDeleteInsideTheUnitOfWork()
    {
        AsHost();
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: null));
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(value);
        var deletesOutsideUnitOfWork = 0;
        void CountOutside() { if (!_unitOfWork.IsExecuting) deletesOutsideUnitOfWork++; }
        _voteRepo.Setup(r => r.DeleteByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(2);
        _seenMarkRepo.Setup(r => r.DeleteByMovieIdsAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(2);
        _ratingRepo.Setup(r => r.DeleteByMovieIdsAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).Returns(Task.CompletedTask);
        _movieRepo.Setup(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).ReturnsAsync(2);
        _voteRepo.Setup(r => r.DeleteByEventAndParticipantAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).Returns(Task.CompletedTask);
        _seenMarkRepo.Setup(r => r.DeleteByEventAndParticipantAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback(CountOutside).Returns(Task.CompletedTask);
        _ratingRepo.Setup(r => r.DeleteByEventAndParticipantAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
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
        AsHost();
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: null));
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
    public async Task HandleAsync_HostRemovesAnAccount_KeepsItOutOfTheNightAndTellsIt()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator-1") with { RemovedUserIds = ["earlier"] });
        SetupParticipant(Participant(userId: "user-2"));
        _currentUser.Setup(c => c.GetUserId()).Returns("creator-1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new User { Id = "user-2" }]);

        await _sut.HandleAsync("evt1", "p1");

        _eventRepo.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.RemovedUserIds.SequenceEqual(KeptOut)),
            It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(
            It.Is<UserNotification>(x => x.UserId == "user-2"
                && x.Type == UserNotificationType.RemovedFromEvent
                && x.EventSlug == "soiree"
                && x.EventTitle == "Soirée"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ParticipantWhoLeaves_CanComeBackAndIsNotNotified()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator"));
        SetupParticipant(Participant(userId: "user-1"));
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "p1");

        _eventRepo.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.RemovedUserIds.Count == 0),
            It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DeleteReturnsFalse_ThrowsNotFound()
    {
        AsHost();
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant());
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

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
        Assert.Equal(ErrorCodes.ParticipantsLockedWheel, ex.Reason);

        _participantRepo.Verify(
            r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_CoHostRemovesAPlainParticipant_KeepsItOut()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator") with { CoHostUserIds = ["co-host"] });
        SetupParticipant(Participant(userId: "guest"));
        _currentUser.Setup(c => c.GetUserId()).Returns("co-host");
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "p1");

        _eventRepo.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.RemovedUserIds.SequenceEqual(KeptOutGuest)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CoHostRemovesAnotherCoHost_IsRefused()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator") with { CoHostUserIds = ["co-host", "other-co-host"] });
        SetupParticipant(Participant(userId: "other-co-host"));
        _currentUser.Setup(c => c.GetUserId()).Returns("co-host");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));

        Assert.Equal(ErrorCodes.CoHostCannotRemoveCoHost, ex.Reason);
        _participantRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_CreatorRemovesACoHost_WithdrawsTheRoleToo()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator") with { CoHostUserIds = ["co-host", "other"] });
        SetupParticipant(Participant(userId: "co-host"));
        _currentUser.Setup(c => c.GetUserId()).Returns("creator");
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "p1");

        _eventRepo.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.CoHostUserIds.SequenceEqual(RemainingCoHost) && e.RemovedUserIds.SequenceEqual(KeptOutCoHost)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CoHostWhoLeaves_LosesTheRole()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator") with { CoHostUserIds = ["co-host"] });
        SetupParticipant(Participant(userId: "co-host"));
        _currentUser.Setup(c => c.GetUserId()).Returns("co-host");
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "p1");

        _eventRepo.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.CoHostUserIds.Count == 0 && e.RemovedUserIds.Count == 0),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_TargetNamedCoHostWhileACoHostRemovesIt_IsRefused()
    {
        var before = ActiveEvent(creatorUserId: "creator") with { CoHostUserIds = ["co-host"] };
        _eventRepo
            .SetupSequence(r => r.GetBySlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(before)
            .ReturnsAsync(before with { CoHostUserIds = ["co-host", "guest"] });
        SetupParticipant(Participant(userId: "guest"));
        _currentUser.Setup(c => c.GetUserId()).Returns("co-host");
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));

        Assert.Equal(ErrorCodes.CoHostCannotRemoveCoHost, ex.Reason);
        _participantRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_CoHostWithdrawnWhileRemoving_IsRefused()
    {
        var before = ActiveEvent(creatorUserId: "creator") with { CoHostUserIds = ["co-host"] };
        _eventRepo
            .SetupSequence(r => r.GetBySlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(before)
            .ReturnsAsync(before with { CoHostUserIds = [] });
        SetupParticipant(Participant(userId: "guest"));
        _currentUser.Setup(c => c.GetUserId()).Returns("co-host");
        _participantRepo.Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));

        Assert.Equal(ErrorCodes.HostOrSelfOnly, ex.Reason);
        _participantRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
