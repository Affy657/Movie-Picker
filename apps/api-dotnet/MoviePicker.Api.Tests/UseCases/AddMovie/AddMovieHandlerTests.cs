using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.AddMovie;

public sealed class AddMovieHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly AddMovieHandler _sut;

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

    private static AddMovieRequest Request(string participantId = "p123456789012345678901234") => new()
    {
        TmdbId = 27205,
        Title = " Inception ",
        Year = "2010",
        PosterPath = "https://image.tmdb.org/t/p/w154/abc.jpg",
        ParticipantId = participantId
    };

    public AddMovieHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _sut = new AddMovieHandler(_eventRepo.Object, _movieRepo.Object, _participantRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", Request()));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", Request()));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ParticipantInvalid_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", Request()));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_DuplicateTmdbId_ThrowsConflictException()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request(participant.Id)));
        Assert.Contains("TMDB", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_DuplicateTitle_ThrowsConflictException()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request(participant.Id)));
        Assert.Contains("titre", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_InvalidPosterPath_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var req = new AddMovieRequest { TmdbId = 27205, Title = "Inception", Year = "2010", PosterPath = "not-a-valid-absolute-uri", ParticipantId = participant.Id };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", req));
        Assert.Contains("posterPath", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_ReturnsMovieWithScoreZero()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var createdMovie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = participant.Id, TmdbId = 27205, Title = "Inception", Year = "2010", PosterPath = "https://image.tmdb.org/t/p/w154/abc.jpg", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>())).ReturnsAsync(createdMovie);

        var result = await _sut.HandleAsync("evt1", Request(participant.Id));

        Assert.Equal("mov1", result.Id);
        Assert.Equal("Inception", result.Title);
        Assert.Equal(27205, result.TmdbId);
        Assert.Equal(participant.Pseudo, result.ProposerPseudo);
        Assert.Equal(0, result.Score);
        Assert.Equal(0, result.Up);
        Assert.Equal(0, result.Down);
    }
}
