using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Moq;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.JoinEvent;

public sealed class JoinEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly JoinEventHandler _sut;

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

    public JoinEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _sut = new JoinEventHandler(_eventRepo.Object, _participantRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var request = new JoinEventRequest { Pseudo = "Alice" };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", request));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var request = new JoinEventRequest { Pseudo = "Alice" };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", request));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NewParticipant_ReturnsCreatedWithIsNewTrue()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(evt.Id, "Alice", It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        var newParticipant = new Participant { Id = "p1", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>())).ReturnsAsync(newParticipant);
        var request = new JoinEventRequest { Pseudo = " Alice " };

        var result = await _sut.HandleAsync("evt1", request);

        Assert.True(result.IsNew);
        Assert.Equal("p1", result.Participant.Id);
        Assert.Equal("Alice", result.Participant.Pseudo);
        Assert.Equal(evt.Id, result.Participant.EventId);
    }

    [Fact]
    public async Task HandleAsync_ExistingPseudo_ReturnsIsNewFalse()
    {
        var evt = ActiveEvent();
        var existing = new Participant { Id = "p0", EventId = evt.Id, Pseudo = "Bob", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(evt.Id, "Bob", It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        var request = new JoinEventRequest { Pseudo = "Bob" };

        var result = await _sut.HandleAsync("evt1", request);

        Assert.False(result.IsNew);
        Assert.Equal("p0", result.Participant.Id);
        Assert.Equal("Déjà inscrit avec ce pseudo", result.Message);
    }
}
