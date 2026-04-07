using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Reactions;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Reactions;

public sealed class RemoveReactionHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IReactionRepository> _reactions = new();
    private readonly RemoveReactionHandler _sut;

    public RemoveReactionHandlerTests() =>
        _sut = new RemoveReactionHandler(_events.Object, _movies.Object, _participants.Object, _reactions.Object);

    private static Event ActiveEvent() => new()
    {
        Id = "evt1",
        Title = "S",
        Date = "2035-01-01",
        Time = "20:00",
        Slug = "s",
        HostToken = "h",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_ReactionNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "m1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var part = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "A", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movies.Setup(r => r.GetByIdAndEventIdAsync("m1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participants.Setup(r => r.FindByIdAndEventIdAsync(part.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(part);
        _reactions.Setup(r => r.DeleteAsync(evt.Id, movie.Id, part.Id, "already_seen", It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.HandleAsync("s", "m1", "already_seen", part.Id));

        Assert.Contains("Réaction", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_UnknownReactionId_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "m1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movies.Setup(r => r.GetByIdAndEventIdAsync("m1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participants.Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "A", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", "m1", "unknown", "p123456789012345678901234"));

        Assert.Contains("inconnu", ex.Message);
    }
}
