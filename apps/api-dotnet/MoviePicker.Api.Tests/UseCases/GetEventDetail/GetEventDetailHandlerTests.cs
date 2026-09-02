using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using ParticipantEntity = MoviePicker.Api.Domain.Entities.Participant;

namespace MoviePicker.Api.Tests.UseCases.GetEventDetail;

public sealed class GetEventDetailHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor;
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor;
    private readonly Mock<IPosterImageStore> _posterStore;
    private readonly GetEventDetailHandler _sut;

    private static Event Event(string hostToken = "ht1") => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = hostToken,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public GetEventDetailHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _participantRepo
            .Setup(r => r.FindByEventAndUserIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ParticipantEntity?)null);
        _hostTokenAccessor = new Mock<IHostTokenAccessor>();
        _currentUserAccessor = new Mock<ICurrentUserAccessor>();
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);
        _posterStore = new Mock<IPosterImageStore>();
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _posterStore.Setup(s => s.RegisterTmdbSourceAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _posterStore
            .Setup(s => s.RegisterTmdbSourcesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _participantRepo
            .Setup(r => r.CountByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)Array.Empty<ParticipantEntity>());
        _movieRepo
            .Setup(r => r.CountByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _userRepo = new Mock<IUserRepository>();
        _userRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)Array.Empty<User>());
        _sut = new GetEventDetailHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _userRepo.Object,
            _hostTokenAccessor.Object,
            _currentUserAccessor.Object,
            _posterStore.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WithMatchingHostToken_SetsIsHostTrue()
    {
        var evt = Event("secret");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("secret");

        var result = await _sut.HandleAsync("evt1");

        Assert.True(result.IsHost);
        Assert.Equal(evt.Id, result.Id);
        Assert.Equal(evt.Title, result.Title);
        Assert.Equal(evt.Slug, result.Slug);
    }

    [Fact]
    public async Task HandleAsync_WithoutHostToken_SetsIsHostFalse()
    {
        var evt = Event();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_WrongHostToken_SetsIsHostFalse()
    {
        var evt = Event("real");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_WithWinnerMovieId_LoadsWinnerMovie()
    {
        var pickedAt = new DateTimeOffset(2026, 5, 1, 18, 0, 0, TimeSpan.Zero);
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", WinnerMovieId = "mov1", WinnerPickedAt = pickedAt, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var winnerMovie = new Movie { Id = "mov1", EventId = evt.Id, Title = "Inception", TmdbId = 27205, Year = "2010", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync(winnerMovie);

        var result = await _sut.HandleAsync("evt1");

        Assert.NotNull(result.WinnerMovie);
        Assert.Equal("mov1", result.WinnerMovie.Id);
        Assert.Equal("Inception", result.WinnerMovie.Title);
        Assert.Equal(evt.WinnerPickedAt, result.WinnerPickedAt);
    }

    [Fact]
    public async Task HandleAsync_CreatorUserMatchesCurrentUser_SetsIsHostTrueWithoutToken()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "secret",
            CreatorUserId = "user-42",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("user-42");

        var result = await _sut.HandleAsync("evt1");

        Assert.True(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_LoggedInButNotCreatorAndWrongToken_SetsIsHostFalse()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "real",
            CreatorUserId = "other-user",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("not-creator");

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_MatchingHostToken_SetsIsHostTrueEvenIfNotCreator()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "tok",
            CreatorUserId = "alice",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("tok");
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("bob");

        var result = await _sut.HandleAsync("evt1");

        Assert.True(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_LoggedInWithParticipantRow_SetsMyParticipant()
    {
        var evt = Event();
        var now = DateTimeOffset.UtcNow;
        var part = new ParticipantEntity
        {
            Id = "part-1",
            EventId = evt.Id,
            Pseudo = "Alice",
            UserId = "user-1",
            CreatedAt = now,
            UpdatedAt = now
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("user-1");
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)new[] { part });

        var result = await _sut.HandleAsync("evt1");

        Assert.NotNull(result.MyParticipant);
        Assert.Equal("part-1", result.MyParticipant.Id);
        Assert.Equal("Alice", result.MyParticipant.Pseudo);
        _participantRepo.Verify(
            r => r.FindByEventAndUserIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_IncludesParticipantAndMovieCounts()
    {
        var evt = Event();
        var now = DateTimeOffset.UtcNow;
        var participants = Enumerable.Range(1, 12)
            .Select(i => new ParticipantEntity
            {
                Id = $"p-{i}",
                EventId = evt.Id,
                Pseudo = $"User{i}",
                CreatedAt = now.AddSeconds(i),
                UpdatedAt = now.AddSeconds(i),
            })
            .ToList();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)participants);
        _movieRepo
            .Setup(r => r.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(4);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(12, result.ParticipantCount);
        Assert.Equal(4, result.MovieCount);
        Assert.Equal(12, result.Participants.Count);
        Assert.Equal("User1", result.Participants[0].Pseudo);
    }
}
