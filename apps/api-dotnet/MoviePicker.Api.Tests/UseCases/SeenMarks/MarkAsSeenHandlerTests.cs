using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SeenMarks;

public sealed class MarkAsSeenHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo;
    private readonly MarkAsSeenHandler _sut;

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

    private static Participant ParticipantFor(Event evt, string id = "p123456789012345678901234", string pseudo = "Alice") => new()
    {
        Id = id,
        EventId = evt.Id,
        Pseudo = pseudo,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public MarkAsSeenHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _seenMarkRepo = new Mock<ISeenMarkRepository>();
        _sut = new MarkAsSeenHandler(_eventRepo.Object, _movieRepo.Object, _participantRepo.Object, _seenMarkRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var request = new MarkAsSeenRequest { ParticipantId = "p1" };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", request));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new EventEntityBuilder().WithId("evt1").Closed().Build();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var request = new MarkAsSeenRequest { ParticipantId = "p1" };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);
        var request = new MarkAsSeenRequest { ParticipantId = "p1" };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", request));
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
        var request = new MarkAsSeenRequest { ParticipantId = "ghost" };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_ReturnsPersistedMark()
    {
        var evt = ActiveEvent();
        var movie = MovieFor(evt);
        var participant = ParticipantFor(evt);
        var now = DateTimeOffset.UtcNow;
        var saved = new SeenMark
        {
            Id = "sm-1",
            EventId = evt.Id,
            MovieId = movie.Id,
            ParticipantId = participant.Id,
            CreatedAt = now,
            UpdatedAt = now
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _seenMarkRepo
            .Setup(r => r.AddAsync(It.IsAny<SeenMark>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(saved);

        var result = await _sut.HandleAsync("evt1", "mov1", new MarkAsSeenRequest { ParticipantId = participant.Id });

        Assert.Equal("sm-1", result.Id);
        Assert.Equal(evt.Id, result.EventId);
        Assert.Equal(movie.Id, result.MovieId);
        Assert.Equal(participant.Id, result.ParticipantId);
    }

    [Fact]
    public async Task HandleAsync_DoubleMark_IsIdempotent()
    {
        // Idempotence déléguée au repo `AddAsync` (contrat : si déjà présente, renvoie l'existante).
        // Le handler ne doit rien lever et renvoyer la même marque.
        var evt = ActiveEvent();
        var movie = MovieFor(evt);
        var participant = ParticipantFor(evt);
        var existing = new SeenMark
        {
            Id = "sm-existing",
            EventId = evt.Id,
            MovieId = movie.Id,
            ParticipantId = participant.Id,
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _seenMarkRepo
            .Setup(r => r.AddAsync(It.IsAny<SeenMark>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var first = await _sut.HandleAsync("evt1", "mov1", new MarkAsSeenRequest { ParticipantId = participant.Id });
        var second = await _sut.HandleAsync("evt1", "mov1", new MarkAsSeenRequest { ParticipantId = participant.Id });

        Assert.Equal(existing.Id, first.Id);
        Assert.Equal(existing.Id, second.Id);
        _seenMarkRepo.Verify(
            r => r.AddAsync(It.IsAny<SeenMark>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }
}
