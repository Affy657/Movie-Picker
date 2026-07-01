using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.AddMovie;

public sealed class AddMovieHandlerNotificationTests
{
    private const string OwnerUserId = "user-owner";
    private const string ParticipantId = "p123456789012345678901234";

    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IPosterImageStore> _posterStore = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly AddMovieHandler _sut;

    private static AddMovieRequest Request() => new()
    {
        TmdbId = 27205,
        MediaType = MovieMediaType.Movie,
        Title = "Inception",
        Year = "2010",
        PosterPath = null,
        ParticipantId = ParticipantId
    };

    public AddMovieHandlerNotificationTests()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event
            {
                Id = "evt1",
                Title = "Soirée",
                Date = "2030-01-01",
                Time = "20:00",
                Slug = "soiree",
                HostToken = "ht1",
                Config = new EventConfig(),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Movie m, CancellationToken _) => m with { Id = "mov1" });
        _tmdb.Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns(OwnerUserId);

        _sut = new AddMovieHandler(
            _eventRepo.Object, _movieRepo.Object, _participantRepo.Object, _posterStore.Object,
            _userRepo.Object, _pushSubRepo.Object, _pushSender.Object, _notifications.Object,
            _currentUser.Object, _tmdb.Object, NullLogger<AddMovieHandler>.Instance);
    }

    private void OwnerParticipant() =>
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(ParticipantId, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = ParticipantId, EventId = "evt1", Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });

    [Fact]
    public async Task HandleAsync_OtherParticipantNotifiable_SendsPushAndInbox()
    {
        OwnerParticipant();
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Participant>
            {
                new() { Id = ParticipantId, EventId = "evt1", Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
                new() { Id = "p2", EventId = "evt1", Pseudo = "Bob", UserId = "other", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
            });
        _userRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<User> { new() { Id = "other", NotifyOnMovieAdded = true } });
        _userRepo.Setup(r => r.GetByIdAsync(OwnerUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = OwnerUserId, DisplayName = "Alice", Handle = "alice" });
        _pushSubRepo.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PushSubscription> { new() { Id = "s1", UserId = "other", Endpoint = "https://push/x", P256dh = "k", Auth = "a" } });

        var result = await _sut.HandleAsync("evt1", Request(), OwnerUserId);

        Assert.Equal("mov1", result.Id);
        _pushSender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(x => x.UserId == "other"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "other" && u.Type == UserNotificationType.MovieAdded), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_OnlyProposerParticipant_DoesNotNotify()
    {
        OwnerParticipant();
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Participant>
            {
                new() { Id = ParticipantId, EventId = "evt1", Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
            });

        await _sut.HandleAsync("evt1", Request(), OwnerUserId);

        _userRepo.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ParticipantBelongsToAnotherUser_ThrowsForbidden()
    {
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(ParticipantId, "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = ParticipantId, EventId = "evt1", Pseudo = "Bob", UserId = "intruder", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", Request(), OwnerUserId));

        _movieRepo.Verify(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
