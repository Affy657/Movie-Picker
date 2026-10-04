using Microsoft.Extensions.Logging;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
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

    private readonly RecordingUnitOfWork _unitOfWork = new();

    public JoinEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _participantRepo.Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _sut = new JoinEventHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            new Mock<IUserRepository>().Object,
            new Mock<IPushSubscriptionRepository>().Object,
            new Mock<IPushNotificationSender>().Object,
            Mock.Of<IUserNotificationRepository>(),
            _unitOfWork,
            Mock.Of<ILogger<JoinEventHandler>>(),
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var request = new JoinEventRequest { Pseudo = "Alice" };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", request, "u1"));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var request = new JoinEventRequest { Pseudo = "Alice" };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", request, "u1"));
        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
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
        _eventRepo.Verify(r => r.LockForWriteAsync(evt.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static Participant Existing(string id, string pseudo, string? userId) => new()
    {
        Id = id,
        EventId = "evt1",
        Pseudo = pseudo,
        UserId = userId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void GivenParticipants(params Participant[] participants) =>
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(participants);

    private void GivenInsertEchoesTheParticipant() =>
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant p, CancellationToken _) => p with { Id = "new" });

    [Fact]
    public async Task HandleAsync_PseudoTakenByAnotherAccount_JoinsUnderADistinctPseudo()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        GivenParticipants(Existing("p0", "Bob", "u9"));
        GivenInsertEchoesTheParticipant();

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Bob" }, "u1");

        Assert.True(result.IsNew);
        Assert.Equal("new", result.Participant.Id);
        Assert.Equal("Bob 2", result.Participant.Pseudo);
        _participantRepo.Verify(
            r => r.AddAsync(It.Is<Participant>(p => p.UserId == "u1" && p.Pseudo == "Bob 2"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_PseudoAndFirstSuffixTaken_PicksTheNextFreeSuffixWhateverTheCase()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        GivenParticipants(Existing("p0", "bob", "u8"), Existing("p1", "Bob 2", "u9"));
        GivenInsertEchoesTheParticipant();

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Bob" }, "u1");

        Assert.Equal("Bob 3", result.Participant.Pseudo);
    }

    [Fact]
    public async Task HandleAsync_LongPseudoTaken_KeepsTheSuffixedPseudoWithinTheMaximumLength()
    {
        var longPseudo = new string('x', 100);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        GivenParticipants(Existing("p0", longPseudo, "u9"));
        GivenInsertEchoesTheParticipant();

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = longPseudo }, "u1");

        Assert.Equal(new string('x', 98) + " 2", result.Participant.Pseudo);
    }

    [Fact]
    public async Task HandleAsync_ConcurrentHomonymWinsThePseudo_RetriesWithTheNextSuffix()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _participantRepo.SetupSequence(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([])
            .ReturnsAsync([Existing("p0", "Bob", "u9")]);
        _participantRepo.SetupSequence(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ParticipantConflictException(ParticipantCollision.SamePseudo))
            .ReturnsAsync(Existing("new", "Bob 2", "u1"));

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Bob" }, "u1");

        Assert.True(result.IsNew);
        Assert.Equal("Bob 2", result.Participant.Pseudo);
    }

    [Fact]
    public async Task HandleAsync_ConcurrentJoinOfTheSameAccount_ReturnsTheParticipantThatWon()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _participantRepo.SetupSequence(r => r.FindByEventAndUserIdAsync("evt1", "u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null)
            .ReturnsAsync(Existing("p7", "Bob", "u1"));
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ParticipantConflictException(ParticipantCollision.SameAccount));

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Bob" }, "u1");

        Assert.False(result.IsNew);
        Assert.Equal("p7", result.Participant.Id);
    }

    [Fact]
    public async Task HandleAsync_PseudoKeepsColliding_GivesUpWithAConcurrentUpdateConflict()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ParticipantConflictException(ParticipantCollision.SamePseudo));

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Bob" }, "u1"));

        Assert.Equal(ErrorCodes.ConcurrentUpdate, ex.Reason);
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
        Assert.Equal("Already joined with this account", result.Message);
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
        Assert.Equal(ErrorCodes.EventFull, ex.Reason);
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
    public async Task HandleAsync_WithCapacity_LocksTheEventThenCountsAndInsertsInsideTheUnitOfWork()
    {
        var evt = ActiveEvent() with { Config = new EventConfig { MaxParticipants = 5 } };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(evt.Id, "Alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        var steps = new List<string>();
        _eventRepo.Setup(r => r.LockForWriteAsync(evt.Id, It.IsAny<CancellationToken>()))
            .Callback(() => steps.Add(_unitOfWork.IsExecuting ? "lock" : "lock-outside")).Returns(Task.CompletedTask);
        _participantRepo.Setup(r => r.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .Callback(() => steps.Add(_unitOfWork.IsExecuting ? "count" : "count-outside")).ReturnsAsync(2);
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .Callback(() => steps.Add(_unitOfWork.IsExecuting ? "insert" : "insert-outside"))
            .ReturnsAsync((Participant p, CancellationToken _) => p with { Id = "p1" });

        await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Alice" }, "u1");

        Assert.Equal(["lock", "count", "insert"], steps);
        Assert.Equal(1, _unitOfWork.Executions);
    }

    [Fact]
    public async Task HandleAsync_CapSetByTheHostWhileJoining_IsCountedUnderTheLock()
    {
        var withoutCap = ActiveEvent();
        var cappedMeanwhile = withoutCap with { Config = new EventConfig { MaxParticipants = 3 } };
        _eventRepo.SetupSequence(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(withoutCap)
            .ReturnsAsync(cappedMeanwhile);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync(withoutCap.Id, "Alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.CountByEventIdAsync(withoutCap.Id, It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Alice" }, "u1"));

        Assert.Equal(ErrorCodes.EventFull, ex.Reason);
        _participantRepo.Verify(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WithoutAccount_ThrowsUnauthorized()
    {
        var request = new JoinEventRequest { Pseudo = "Alice" };

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.HandleAsync("evt1", request, ""));
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
