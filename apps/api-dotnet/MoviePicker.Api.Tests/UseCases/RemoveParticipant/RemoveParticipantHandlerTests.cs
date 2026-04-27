using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RemoveParticipant;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.RemoveParticipant;

public sealed class RemoveParticipantHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IVoteRepository> _voteRepo = new();
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo = new();
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly RemoveParticipantHandler _sut;

    public RemoveParticipantHandlerTests()
    {
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());

        _sut = new RemoveParticipantHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _seenMarkRepo.Object,
            _hostTokenAccessor.Object,
            _currentUser.Object,
            NullLogger<RemoveParticipantHandler>.Instance);
    }

    private static Event ActiveEvent(string hostToken = "ht1", string? creatorUserId = null) => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = hostToken,
        CreatorUserId = creatorUserId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Participant Participant(string id = "p1", string? userId = null, string pseudo = "Alice") => new()
    {
        Id = id,
        EventId = "evt1",
        Pseudo = pseudo,
        UserId = userId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void SetupEvent(Event evt) =>
        _eventRepo
            .Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(evt);

    private void SetupParticipant(Participant? p) =>
        _participantRepo
            .Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(p);

    [Fact]
    public async Task HandleAsync_BlankParticipantId_ThrowsBadRequest()
    {
        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "  "));
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFound()
    {
        _eventRepo
            .Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "p1"));
    }

    [Fact]
    public async Task HandleAsync_ParticipantNotFound_ThrowsNotFound()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(null);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_ClosedEvent_ThrowsConflict()
    {
        var closed = ActiveEvent() with { ClosedAt = DateTimeOffset.UtcNow };
        SetupEvent(closed);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_RemovingCreator_ThrowsConflict()
    {
        SetupEvent(ActiveEvent(creatorUserId: "user-creator"));
        SetupParticipant(Participant(userId: "user-creator"));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
        Assert.Contains("créateur", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NoAuthorization_ThrowsForbidden()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: "someone-else"));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_GuestParticipant_CannotSelfRemove_ThrowsForbidden()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant(userId: null));

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_HostByToken_RemovesParticipantAndCascades()
    {
        SetupEvent(ActiveEvent());
        var participant = Participant(userId: null);
        SetupParticipant(participant);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo
            .Setup(r => r.ListIdsByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { "m1", "m2" });
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("p1", result.ParticipantId);
        Assert.Equal(2, result.RemovedMovies);
        Assert.Equal("Participant retiré.", result.Message);

        _voteRepo.Verify(r => r.DeleteByMovieIdAsync("m1", It.IsAny<CancellationToken>()), Times.Once);
        _voteRepo.Verify(r => r.DeleteByMovieIdAsync("m2", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdAsync("evt1", "m1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByMovieIdAsync("evt1", "m2", It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteAsync("m1", It.IsAny<CancellationToken>()), Times.Once);
        _movieRepo.Verify(r => r.DeleteAsync("m2", It.IsAny<CancellationToken>()), Times.Once);
        _voteRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarkRepo.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _participantRepo.Verify(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ConnectedUserSelfLeave_Succeeds_WithLeaveMessage()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator"));
        SetupParticipant(Participant(userId: "user-1"));
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Contains("quitté", result.Message);
        Assert.Equal(0, result.RemovedMovies);
    }

    [Fact]
    public async Task HandleAsync_HostIsCreatorViaUserId_CanRemoveOtherParticipant()
    {
        SetupEvent(ActiveEvent(creatorUserId: "creator-1"));
        SetupParticipant(Participant(userId: "user-2"));
        _currentUser.Setup(c => c.GetUserId()).Returns("creator-1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("Participant retiré.", result.Message);
    }

    [Fact]
    public async Task HandleAsync_DeleteReturnsFalse_ThrowsNotFound()
    {
        SetupEvent(ActiveEvent());
        SetupParticipant(Participant());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "p1"));
    }

    [Fact]
    public async Task HandleAsync_WheelLaunched_ButNotClosed_ThrowsConflict()
    {
        // La roue a été lancée (WinnerMovieId posé) mais la soirée n'est pas
        // encore clôturée : on doit geler la liste pour ne pas casser le gagnant.
        var withWinner = ActiveEvent() with { WinnerMovieId = "movie-winner" };
        SetupEvent(withWinner);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "p1"));
        Assert.Contains("roue", ex.Message);

        // Aucune cascade ne doit avoir été déclenchée.
        _participantRepo.Verify(
            r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_GuestHostByToken_RemovesItsOwnParticipant_DocumentedV1Behavior()
    {
        // Hôte sans compte (CreatorUserId vide) : il n'existe pas de « participant créateur »
        // identifiable côté serveur. Le hostToken donne le rôle hôte ; retirer son propre
        // participant retire seulement de la liste de participation, mais conserve le rôle hôte
        // via le HostToken. Comportement V1 documenté dans le handler.
        SetupEvent(ActiveEvent(hostToken: "ht1", creatorUserId: null));
        SetupParticipant(Participant(userId: null));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _participantRepo
            .Setup(r => r.DeleteAsync("p1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Equal("p1", result.ParticipantId);
        Assert.Equal("Participant retiré.", result.Message);
    }
}
