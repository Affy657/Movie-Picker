using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Reactions;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Reactions;

public sealed class AddReactionHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IReactionRepository> _reactions = new();
    private readonly AddReactionHandler _sut;

    public AddReactionHandlerTests()
    {
        _sut = new AddReactionHandler(_events.Object, _movies.Object, _participants.Object, _reactions.Object);
    }

    private static Event ActiveEvent(EventConfig? config = null) => new()
    {
        Id = "evt1",
        Title = "S",
        Date = "2035-01-01",
        Time = "20:00",
        Slug = "s",
        HostToken = "h",
        Config = config,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_UnknownReaction_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movies.Setup(r => r.GetByIdAndEventIdAsync("m1", evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        _participants.Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "A", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", "m1", new AddReactionRequest { ParticipantId = "p123456789012345678901234", ReactionId = "nope" }));

        Assert.Contains("inconnu", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NotAllowedByConfig_ThrowsBadRequestException()
    {
        var evt = ActiveEvent(new EventConfig { AllowedReactionIds = new[] { "meh" } });
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movies.Setup(r => r.GetByIdAndEventIdAsync("m1", evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Movie { Id = "m1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        _participants.Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "A", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", "m1", new AddReactionRequest { ParticipantId = "p123456789012345678901234", ReactionId = "already_seen" }));

        Assert.Contains("autorisée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_Persists()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "m1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var part = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "A", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movies.Setup(r => r.GetByIdAndEventIdAsync("m1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participants.Setup(r => r.FindByIdAndEventIdAsync(part.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(part);
        _reactions.Setup(r => r.AddAsync(It.IsAny<Reaction>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Reaction x, CancellationToken _) => new Reaction
            {
                Id = "rid1",
                EventId = x.EventId,
                MovieId = x.MovieId,
                ParticipantId = x.ParticipantId,
                ReactionId = x.ReactionId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });

        var res = await _sut.HandleAsync("s", "m1", new AddReactionRequest { ParticipantId = part.Id, ReactionId = "want_to_watch" });

        Assert.Equal("want_to_watch", res.ReactionId);
        _reactions.Verify(r => r.AddAsync(It.Is<Reaction>(x => x.ReactionId == "want_to_watch"), It.IsAny<CancellationToken>()), Times.Once);
    }
}
