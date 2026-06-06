using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.VoteMovie;

public sealed class ClearMovieVoteHandlerTests
{
    private const string OwnerUserId = "user-owner";

    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IVoteRepository> _voteRepo = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly ClearMovieVoteHandler _sut;

    public ClearMovieVoteHandlerTests()
    {
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);
        _sut = new ClearMovieVoteHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _voteRepo.Object,
            _currentUser.Object);
    }

    private static Event ActiveEvent() =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").WithTitle("Soirée").Build();

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", "p123"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2000-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "ht",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", "p123"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", "p123"));
        Assert.Equal("Film introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ParticipantInvalid_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync("p123", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", "p123"));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NoExistingVote_IsIdempotent_DoesNotThrow()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.DeleteByMovieAndParticipantAsync(movie.Id, participant.Id, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        await _sut.HandleAsync("evt1", "mov1", participant.Id);

        _voteRepo.Verify(
            r => r.DeleteByMovieAndParticipantAsync(movie.Id, participant.Id, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DeletesVote_WhenExists()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.DeleteByMovieAndParticipantAsync(movie.Id, participant.Id, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "mov1", participant.Id);

        _voteRepo.Verify(r => r.DeleteByMovieAndParticipantAsync(movie.Id, participant.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}
