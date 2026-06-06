using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SeenMarks;

public sealed class UnmarkAsSeenHandlerTests
{
    private const string OwnerUserId = "user-owner";

    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly UnmarkAsSeenHandler _sut;

    private static Event ActiveEvent() =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").WithTitle("Soirée").Build();

    private static Movie MovieFor(Event evt) => new()
    {
        Id = "mov1",
        EventId = evt.Id,
        ParticipantId = "p0",
        TmdbId = 1,
        Title = "X",
        Year = "2020",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Participant ParticipantFor(Event evt, string id = "p123456789012345678901234", string pseudo = "Alice", string? userId = OwnerUserId) => new()
    {
        Id = id,
        EventId = evt.Id,
        Pseudo = pseudo,
        UserId = userId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public UnmarkAsSeenHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _seenMarkRepo = new Mock<ISeenMarkRepository>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);
        _sut = new UnmarkAsSeenHandler(_eventRepo.Object, _movieRepo.Object, _participantRepo.Object, _seenMarkRepo.Object, _currentUser.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", "p1"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new EventEntityBuilder().WithId("evt1").Closed().Build();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", "p1"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", "p1"));
        Assert.Equal("Film introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ParticipantInvalid_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var movie = MovieFor(evt);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync("ghost", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", "ghost"));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MarkMissing_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        var movie = MovieFor(evt);
        var participant = ParticipantFor(evt);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _seenMarkRepo
            .Setup(r => r.DeleteAsync(evt.Id, movie.Id, participant.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", participant.Id));
        Assert.Contains("déjà vu", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_DeletesMark()
    {
        var evt = ActiveEvent();
        var movie = MovieFor(evt);
        var participant = ParticipantFor(evt);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _seenMarkRepo
            .Setup(r => r.DeleteAsync(evt.Id, movie.Id, participant.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _sut.HandleAsync("evt1", "mov1", participant.Id);

        _seenMarkRepo.Verify(
            r => r.DeleteAsync(evt.Id, movie.Id, participant.Id, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
