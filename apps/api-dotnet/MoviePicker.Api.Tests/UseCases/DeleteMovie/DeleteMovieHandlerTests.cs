using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.DeleteMovie;

public sealed class DeleteMovieHandlerTests
{
    private const string OwnerUserId = "user-owner";

    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IHostTokenAccessor> _hostToken;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly DeleteMovieHandler _sut;

    private static Event ActiveEvent() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public DeleteMovieHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _seenMarkRepo = new Mock<ISeenMarkRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _hostToken = new Mock<IHostTokenAccessor>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(u => u.GetUserId()).Returns((string?)null);
        _sut = new DeleteMovieHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _seenMarkRepo.Object,
            _participantRepo.Object,
            _hostToken.Object,
            _currentUser.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", "p123456789012345678901234"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WheelAlreadyLaunched_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", WinnerMovieId = "mov0", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
        Assert.Contains("roue", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
        Assert.Equal("Film introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NotProposerAndNotHost_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
        Assert.Contains("proposé", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_DeletesVotesSeenMarksAndMovie()
    {
        var evt = ActiveEvent();
        var participantId = "p123456789012345678901234";
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = participantId, TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = participantId, EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participantId, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);

        await _sut.HandleAsync("evt1", "mov1", participantId);

        _voteRepo.Verify(r => r.DeleteByMovieIdAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdAsync("evt1", "mov1", It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_SpoofingProposerParticipantId_WhenNotOwner_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        var proposerId = "p123456789012345678901234";
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = proposerId, TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var proposer = new Participant { Id = proposerId, EventId = evt.Id, Pseudo = "Victim", UserId = "victim-user", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(proposerId, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(proposer);
        _currentUser.Setup(u => u.GetUserId()).Returns("attacker-user");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "mov1", proposerId));
        Assert.Contains("proposé", ex.Message);
        _movieRepo.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_HostViaHostToken_CanDeleteOtherParticipantMovie()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        await _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234");

        _voteRepo.Verify(r => r.DeleteByMovieIdAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdAsync("evt1", "mov1", It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HostViaCreatorUserId_CanDeleteOtherParticipantMovie()
    {
        var evt = ActiveEvent() with { CreatorUserId = "user-42" };
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _currentUser.Setup(u => u.GetUserId()).Returns("user-42");

        await _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234");

        _movieRepo.Verify(r => r.DeleteAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
    }
}
