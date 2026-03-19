using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.DeleteMovie;

public sealed class DeleteMovieHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
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
        _sut = new DeleteMovieHandler(_eventRepo.Object, _movieRepo.Object, _voteRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", "p123456789012345678901234"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WheelAlreadyLaunched_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", WinnerMovieId = "mov0", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
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
    public async Task HandleAsync_NotProposer_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "other-id", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "mov1", "p123456789012345678901234"));
        Assert.Contains("proposé", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_DeletesVotesAndMovie()
    {
        var evt = ActiveEvent();
        var participantId = "p123456789012345678901234";
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = participantId, TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);

        await _sut.HandleAsync("evt1", "mov1", participantId);

        _voteRepo.Verify(r => r.DeleteByMovieIdAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteAsync("mov1", It.IsAny<CancellationToken>()), Times.Once);
    }
}
