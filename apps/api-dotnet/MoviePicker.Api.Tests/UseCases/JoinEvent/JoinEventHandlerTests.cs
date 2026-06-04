using Microsoft.Extensions.Logging;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
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
        _sut = new JoinEventHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            new Mock<IUserRepository>().Object,
            new Mock<IPushSubscriptionRepository>().Object,
            new Mock<IPushNotificationSender>().Object,
            Mock.Of<IUserNotificationRepository>(),
            Mock.Of<ILogger<JoinEventHandler>>());
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var request = new JoinEventRequest { Pseudo = "Alice" };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", request, "u1"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var request = new JoinEventRequest { Pseudo = "Alice" };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", request, "u1"));
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

        var result = await _sut.HandleAsync("evt1", request, "u1");

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

        var result = await _sut.HandleAsync("evt1", request, "u1");

        Assert.False(result.IsNew);
        Assert.Equal("p0", result.Participant.Id);
        Assert.Equal("Déjà inscrit avec ce pseudo", result.Message);
    }

    [Fact]
    public async Task HandleAsync_AlreadyJoinedByAccount_ReturnsExistingWithoutPseudoMatch()
    {
        var evt = ActiveEvent();
        var existing = new Participant
        {
            Id = "p1",
            EventId = evt.Id,
            Pseudo = "Premier",
            UserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndUserIdAsync(evt.Id, "u1", It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        var request = new JoinEventRequest { Pseudo = "AutrePseudo" };

        var result = await _sut.HandleAsync("evt1", request, "u1");

        Assert.False(result.IsNew);
        Assert.Equal("p1", result.Participant.Id);
        Assert.Equal("Premier", result.Participant.Pseudo);
        Assert.Equal("Déjà inscrit avec ce compte", result.Message);
        _participantRepo.Verify(
            r => r.FindByEventAndPseudoAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenCapacityReached_ThrowsConflict()
    {
        var evt = ActiveEvent() with
        {
            Config = new EventConfig { MaxParticipants = 3 }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(evt.Id, "Alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Alice" }, "u1"));
        Assert.Contains("complète", ex.Message);
        _participantRepo.Verify(
            r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenBelowCapacity_AcceptsNewParticipant()
    {
        var evt = ActiveEvent() with
        {
            Config = new EventConfig { MaxParticipants = 5 }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(evt.Id, "Alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        var newParticipant = new Participant { Id = "p1", EventId = evt.Id, Pseudo = "Alice", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>())).ReturnsAsync(newParticipant);

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Alice" }, "u1");

        Assert.True(result.IsNew);
        Assert.Equal("p1", result.Participant.Id);
    }

    [Fact]
    public async Task HandleAsync_WithoutAccount_ThrowsArgumentException()
    {
        var request = new JoinEventRequest { Pseudo = "Alice" };

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.HandleAsync("evt1", request, ""));
    }

    [Fact]
    public async Task HandleAsync_WithAccount_PersistsUserIdOnNewParticipant()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndUserIdAsync(evt.Id, "u99", It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(evt.Id, "Zed", It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        Participant? captured = null;
        _participantRepo
            .Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .Callback<Participant, CancellationToken>((p, _) => captured = p)
            .ReturnsAsync((Participant p, CancellationToken _) => new Participant
            {
                Id = "pnew",
                EventId = p.EventId,
                Pseudo = p.Pseudo,
                UserId = p.UserId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            });

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Zed" }, "u99");

        Assert.True(result.IsNew);
        Assert.NotNull(captured);
        Assert.Equal("u99", captured.UserId);
        Assert.Equal("Zed", captured.Pseudo);
    }
}
