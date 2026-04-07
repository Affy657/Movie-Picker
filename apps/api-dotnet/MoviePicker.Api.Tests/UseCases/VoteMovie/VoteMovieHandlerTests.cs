using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.VoteMovie;

public sealed class VoteMovieHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly VoteMovieHandler _sut;

    private static Event ActiveEvent() =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").WithTitle("Soirée").Build();

    public VoteMovieHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _sut = new VoteMovieHandler(_eventRepo.Object, _movieRepo.Object, _participantRepo.Object, _voteRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", request));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Equal("Film introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ParticipantInvalid_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync("p123456789012345678901234", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_UpVote_Success()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var savedVote = new Vote { Id = "v1", EventId = evt.Id, MovieId = movie.Id, ParticipantId = participant.Id, Value = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>())).ReturnsAsync(savedVote);
        var request = new VoteRequest { ParticipantId = participant.Id, Value = 1 };

        var result = await _sut.HandleAsync("evt1", "mov1", request);

        Assert.Equal("v1", result.Id);
        Assert.Equal(1, result.Value);
        Assert.Equal(movie.Id, result.MovieId);
        Assert.Equal(participant.Id, result.ParticipantId);
    }

    [Fact]
    public async Task HandleAsync_DownVote_Success()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Bob", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var savedVote = new Vote { Id = "v2", EventId = evt.Id, MovieId = movie.Id, ParticipantId = participant.Id, Value = -1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>())).ReturnsAsync(savedVote);
        var request = new VoteRequest { ParticipantId = participant.Id, Value = -1 };

        var result = await _sut.HandleAsync("evt1", "mov1", request);

        Assert.Equal(-1, result.Value);
    }
}
