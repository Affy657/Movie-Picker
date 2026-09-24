using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.DeleteEvent;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.DeleteEvent;

public sealed class DeleteEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IVoteRepository> _voteRepo = new();
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly DeleteEventHandler _sut;

    public DeleteEventHandlerTests()
    {
        _voteRepo
            .Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0L);
        _seenMarkRepo
            .Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0L);
        _movieRepo
            .Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0L);
        _participantRepo
            .Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0L);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _eventRepo
            .Setup(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _sut = new DeleteEventHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _seenMarkRepo.Object,
            _currentUser.Object,
            _userRepo.Object,
            _pushSubRepo.Object,
            _pushSender.Object,
            Mock.Of<IUserNotificationRepository>(),
            new InMemoryUnitOfWork(),
            NullLogger<DeleteEventHandler>.Instance,
            TimeProvider.System);
    }

    private static Event MakeEvent(string? creatorUserId = "user-1", string? winnerMovieId = null, DateTimeOffset? closedAt = null) => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht1",
        CreatorUserId = creatorUserId,
        Winners = TestWinners.Won(winnerMovieId),
        ClosedAt = closedAt,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void SetupEvent(Event evt) =>
        _eventRepo
            .Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt);

    [Fact]
    public async Task HandleAsync_TheNextNightOfASeries_EndsTheSeriesOnThePreviousNight()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent() with { Recurrence = RecurrenceFrequency.Weekly, RecurrenceParentEventId = "parent1" });
        var parent = MakeEvent() with
        {
            Id = "parent1",
            Slug = "parent",
            Recurrence = RecurrenceFrequency.Weekly,
            NextOccurrenceEventId = "evt1"
        };
        _eventRepo
            .Setup(r => r.ListByIdsAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Contains("parent1")), It.IsAny<CancellationToken>()))
            .ReturnsAsync([parent]);
        Event? savedParent = null;
        _eventRepo
            .Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback((Event e, CancellationToken _) => savedParent = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        await _sut.HandleAsync("evt1");

        Assert.NotNull(savedParent);
        Assert.Equal("parent1", savedParent!.Id);
        Assert.Null(savedParent.NextOccurrenceEventId);
        Assert.Null(savedParent.Recurrence);
    }

    [Fact]
    public async Task HandleAsync_ANightWhoseParentAlreadyMovedOn_LeavesTheParentAlone()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent() with { RecurrenceParentEventId = "parent1" });
        _eventRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([MakeEvent() with { Id = "parent1", Recurrence = RecurrenceFrequency.Weekly, NextOccurrenceEventId = "other" }]);

        await _sut.HandleAsync("evt1");

        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AnonymousUser_ThrowsUnauthorized()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        SetupEvent(MakeEvent(creatorUserId: "user-1"));

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.HandleAsync("evt1"));
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFound()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        _eventRepo
            .Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("missing"));
    }

    [Fact]
    public async Task HandleAsync_NonCreatorConnectedUser_ThrowsForbidden()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");
        SetupEvent(MakeEvent(creatorUserId: "user-1"));

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));

        _voteRepo.Verify(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _seenMarkRepo.Verify(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _movieRepo.Verify(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _participantRepo.Verify(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _eventRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_EventWithoutCreator_ThrowsForbidden()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent(creatorUserId: null));

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
    }

    [Fact]
    public async Task HandleAsync_CreatorUser_DeletesEventAndCascades()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent(creatorUserId: "user-1"));

        _voteRepo
            .Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(7L);
        _seenMarkRepo
            .Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(2L);
        _movieRepo
            .Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(5L);
        _participantRepo
            .Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(3L);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("evt1", result.EventId);
        Assert.Equal("soiree", result.Slug);
        Assert.Equal(7L, result.RemovedVotes);
        Assert.Equal(2L, result.RemovedSeenMarks);
        Assert.Equal(5L, result.RemovedMovies);
        Assert.Equal(3L, result.RemovedParticipants);

        var seq = new MockSequence();
        _voteRepo.Verify(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
        _participantRepo.Verify(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
        _eventRepo.Verify(r => r.DeleteAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
        _ = seq;
    }

    [Fact]
    public async Task HandleAsync_CreatorUser_AllowsDeletionEvenIfClosed()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent(creatorUserId: "user-1", closedAt: DateTimeOffset.UtcNow));

        var result = await _sut.HandleAsync("evt1");
        Assert.Equal("evt1", result.EventId);
        _eventRepo.Verify(r => r.DeleteAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CreatorUser_AllowsDeletionEvenIfWheelLaunched()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent(creatorUserId: "user-1", winnerMovieId: "movie-X"));

        var result = await _sut.HandleAsync("evt1");
        Assert.Equal("evt1", result.EventId);
        _eventRepo.Verify(r => r.DeleteAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_FinalDeleteReturnsFalse_ThrowsNotFound()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        SetupEvent(MakeEvent(creatorUserId: "user-1"));
        _eventRepo
            .Setup(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1"));
    }
}
