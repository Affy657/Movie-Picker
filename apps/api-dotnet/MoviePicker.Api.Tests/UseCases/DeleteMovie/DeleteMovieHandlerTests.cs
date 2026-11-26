using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.DeleteMovie;

public sealed class DeleteMovieHandlerTests
{
    private const string OwnerUserId = "user-owner";
    private const string OtherUserId = "user-other";

    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo;
    private readonly Mock<IMovieRatingRepository> _ratingRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly RecordingUnitOfWork _unitOfWork = new();
    private readonly DeleteMovieHandler _sut;

    private static Event ActiveEvent() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = "soiree",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static IReadOnlyCollection<string> OnlyMov1() =>
        It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 1 && ids.Contains("mov1"));

    public DeleteMovieHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _seenMarkRepo = new Mock<ISeenMarkRepository>();
        _ratingRepo = new Mock<IMovieRatingRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _sut = new DeleteMovieHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _seenMarkRepo.Object,
            _ratingRepo.Object,
            _participantRepo.Object,
            _unitOfWork,
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetBySlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(OtherUserId, "bad", "mov1", "p123456789012345678901234"));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234"));
        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_WheelAlreadyLaunched_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = TestDates.Upcoming, Time = "20:00", Slug = "soiree", Winners = TestWinners.Won("mov0"), CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234"));
        Assert.StartsWith("wheel_locked", ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234"));
        Assert.Equal(ErrorCodes.MovieNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_NotProposerAndNotHost_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234"));
        Assert.Equal(ErrorCodes.MovieRemovalRestricted, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_Success_DeletesVotesSeenMarksRatingsAndMovie()
    {
        var evt = ActiveEvent();
        var participantId = "p123456789012345678901234";
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = participantId, TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = participantId, EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participantId, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);

        var deletesOutsideUnitOfWork = 0;
        void CountOutside() { if (!_unitOfWork.IsExecuting) deletesOutsideUnitOfWork++; }
        _voteRepo.Setup(r => r.DeleteByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).Callback(CountOutside).ReturnsAsync(0L);
        _seenMarkRepo.Setup(r => r.DeleteByMovieIdsAsync("evt1", It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).Callback(CountOutside).ReturnsAsync(0L);
        _ratingRepo.Setup(r => r.DeleteByMovieIdsAsync("evt1", It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).Callback(CountOutside).Returns(Task.CompletedTask);
        _movieRepo.Setup(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).Callback(CountOutside).ReturnsAsync(1L);

        await _sut.HandleAsync(OwnerUserId, "evt1", "mov1", participantId);

        _voteRepo.Verify(r => r.DeleteByMovieIdsAsync(OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdsAsync("evt1", OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
        _ratingRepo.Verify(r => r.DeleteByMovieIdsAsync("evt1", OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.Equal(1, _unitOfWork.Executions);
        Assert.Equal(0, deletesOutsideUnitOfWork);
        _eventRepo.Verify(r => r.UpdateAsync(It.Is<Event>(e => e.Id == "evt1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WinnerDrawnMeanwhile_RefusesInsideTheUnitOfWorkAndDeletesNothing()
    {
        var evt = ActiveEvent() with { CreatorUserId = OtherUserId };
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.SetupSequence(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt)
            .ReturnsAsync(evt with { Winners = TestWinners.Won("mov1") });
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234"));

        Assert.StartsWith("wheel_locked", ex.Reason);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SpoofingProposerParticipantId_WhenNotOwner_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        var proposerId = "p123456789012345678901234";
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = proposerId, TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var proposer = new Participant { Id = proposerId, EventId = evt.Id, Pseudo = "Victim", UserId = "victim-user", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(proposerId, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(proposer);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("attacker-user", "evt1", "mov1", proposerId));
        Assert.Equal(ErrorCodes.MovieRemovalRestricted, ex.Reason);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TheHostAccount_CanDeleteOtherParticipantMovie()
    {
        var evt = ActiveEvent() with { CreatorUserId = OtherUserId };
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        await _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234");

        _voteRepo.Verify(r => r.DeleteByMovieIdsAsync(OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdsAsync("evt1", OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(OnlyMov1(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CoHostWithdrawnWhileDeleting_IsRefused()
    {
        var evt = ActiveEvent() with { CreatorUserId = "user-42", CoHostUserIds = [OtherUserId] };
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo
            .SetupSequence(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt)
            .ReturnsAsync(evt with { CoHostUserIds = [] });
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync(OtherUserId, "evt1", "mov1", "p123456789012345678901234"));

        Assert.Equal(ErrorCodes.MovieRemovalRestricted, ex.Reason);
        _movieRepo.Verify(r => r.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
