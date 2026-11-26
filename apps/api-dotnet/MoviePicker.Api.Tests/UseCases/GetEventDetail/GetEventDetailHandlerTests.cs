using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;
using ParticipantEntity = MoviePicker.Api.Domain.Entities.Participant;

namespace MoviePicker.Api.Tests.UseCases.GetEventDetail;

public sealed class GetEventDetailHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor;
    private readonly GetEventDetailHandler _sut;

    private static Event Event() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = "soiree",
        CreatorUserId = "host-user",
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
        _currentUserAccessor = new Mock<ICurrentUserAccessor>();
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);
        _participantRepo
            .Setup(r => r.CountByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)Array.Empty<ParticipantEntity>());
        _movieRepo
            .Setup(r => r.CountByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _voteRepo = new Mock<IVoteRepository>();
        _voteRepo
            .Setup(r => r.CountDistinctVotersByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _userRepo = new Mock<IUserRepository>();
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<UserCard>)[]);
        _sut = new GetEventDetailHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _voteRepo.Object,
            _userRepo.Object,
            _currentUserAccessor.Object,
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_ReadsWithoutMarkingTheWatchlistCleanup()
    {
        var evt = new EventEntityBuilder().WithId("evt-1").Build();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt-1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        await _sut.HandleAsync("evt-1");

        _eventRepo.Verify(
            r => r.MarkWatchlistCleanedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData("removed-user", true)]
    [InlineData("other-user", false)]
    [InlineData(null, false)]
    public async Task HandleAsync_TellsOnlyARemovedViewerThatTheHostRemovedThem(string? viewer, bool expected)
    {
        var evt = new EventEntityBuilder().WithId("evt-1").Build() with { RemovedUserIds = ["removed-user"] };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt-1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns(viewer);

        var result = await _sut.HandleAsync("evt-1");

        Assert.Equal(expected, result.ViewerRemoved);
    }

    private static Event NightEndedTwoDaysAgo() =>
        new EventEntityBuilder().WithId("evt-1").WithSlug("soiree").Build() with
        {
            Date = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-2).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
            Time = "20:00",
            Winners = [new EventWinner { MovieId = "m1", Method = WinnerPickMethod.Wheel, PickedAt = DateTimeOffset.UtcNow.AddDays(-3) }]
        };

    private void GivenSignedInParticipant(Event evt, DateTimeOffset? ratingPromptedAt)
    {
        _eventRepo.Setup(r => r.GetBySlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("u1");
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new ParticipantEntity { Id = "p1", EventId = evt.Id, Pseudo = "Léa", UserId = "u1", RatingPromptedAt = ratingPromptedAt }]);
    }

    [Fact]
    public async Task HandleAsync_ParticipantOnceTheNightIsOver_IsDueToBeAskedForARating()
    {
        GivenSignedInParticipant(NightEndedTwoDaysAgo(), ratingPromptedAt: null);

        var result = await _sut.HandleAsync("soiree");

        Assert.True(result.RatingPromptDue);
    }

    [Fact]
    public async Task HandleAsync_ParticipantAlreadyAskedOnAnotherDevice_IsNotAskedAgain()
    {
        GivenSignedInParticipant(NightEndedTwoDaysAgo(), ratingPromptedAt: DateTimeOffset.UtcNow.AddHours(-1));

        var result = await _sut.HandleAsync("soiree");

        Assert.False(result.RatingPromptDue);
    }

    [Fact]
    public async Task HandleAsync_ViewerWhoDidNotTakePart_IsNeverAskedForARating()
    {
        _eventRepo.Setup(r => r.GetBySlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(NightEndedTwoDaysAgo());
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("u1");

        var result = await _sut.HandleAsync("soiree");

        Assert.False(result.RatingPromptDue);
    }

    [Fact]
    public async Task HandleAsync_GivesTheRecapLinkOfTheNight()
    {
        var evt = new EventEntityBuilder().WithId("evt-1").WithSlug("soiree").Build() with { RecapSlug = "recap-xyz1" };
        _eventRepo.Setup(r => r.GetBySlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var result = await _sut.HandleAsync("soiree");

        Assert.Equal("recap-xyz1", result.RecapSlug);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetBySlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TheCreatorAccount_SetsIsHostTrue()
    {
        var evt = Event();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("host-user");

        var result = await _sut.HandleAsync("evt1");

        Assert.True(result.IsHost);
        Assert.Equal(evt.Id, result.Id);
        Assert.Equal(evt.Title, result.Title);
        Assert.Equal(evt.Slug, result.Slug);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_SetsIsHostFalse()
    {
        var evt = Event();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_WithAWinner_ProjectsThePickWithoutLoadingTheMovie()
    {
        var pickedAt = new DateTimeOffset(2026, 5, 1, 18, 0, 0, TimeSpan.Zero);
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = TestDates.Upcoming, Time = "20:00", Slug = "soiree", Winners = [TestWinners.Pick("mov1", WinnerPickMethod.Wheel, pickedAt)], CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var result = await _sut.HandleAsync("evt1");

        var winner = Assert.Single(result.Winners);
        Assert.Equal("mov1", winner.MovieId);
        Assert.Equal("wheel", winner.PickMethod);
        Assert.Equal(pickedAt, winner.PickedAt);
        _movieRepo.Verify(
            r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WithSeveralWinners_KeepsThePickOrder()
    {
        var pickedAt = new DateTimeOffset(2026, 5, 1, 18, 0, 0, TimeSpan.Zero);
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "soiree",
            Winners =
            [
                TestWinners.Pick("mov1", WinnerPickMethod.Wheel, pickedAt),
                TestWinners.Pick("mov2", WinnerPickMethod.Manual, pickedAt.AddMinutes(10)),
                TestWinners.Pick("mov3", WinnerPickMethod.Wheel, pickedAt.AddMinutes(20))
            ],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(["mov1", "mov2", "mov3"], result.Winners.Select(w => w.MovieId));
        Assert.Equal(["wheel", "manual", "wheel"], result.Winners.Select(w => w.PickMethod));
    }

    [Fact]
    public async Task HandleAsync_LoggedInButNotCreator_SetsIsHostFalse()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "soiree",
            CreatorUserId = "other-user",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("not-creator");

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
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
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
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
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)participants);
        _movieRepo
            .Setup(r => r.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(4);
        _voteRepo
            .Setup(r => r.CountDistinctVotersByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(12, result.ParticipantCount);
        Assert.Equal(4, result.MovieCount);
        Assert.Equal(3, result.VotersCount);
        Assert.Equal(12, result.Participants.Count);
        Assert.Equal("User1", result.Participants[0].Pseudo);
    }

    [Fact]
    public async Task HandleAsync_LinkedParticipants_ReadOnlyTheUserCards()
    {
        var evt = Event();
        var now = DateTimeOffset.UtcNow;
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)
            [
                new ParticipantEntity { Id = "p-1", EventId = evt.Id, Pseudo = "Camille", UserId = "u1", CreatedAt = now, UpdatedAt = now },
                new ParticipantEntity { Id = "p-2", EventId = evt.Id, Pseudo = "Sam", UserId = "u2", CreatedAt = now, UpdatedAt = now }
            ]);
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<UserCard>)
            [
                new UserCard("u1", "avatar-3", "camille", IsProfilePublic: true),
                new UserCard("u2", "avatar-5", "sam", IsProfilePublic: false)
            ]);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("avatar-3", result.Participants[0].AvatarId);
        Assert.Equal("camille", result.Participants[0].Handle);
        Assert.Equal("avatar-5", result.Participants[1].AvatarId);
        Assert.Null(result.Participants[1].Handle);
        _userRepo.Verify(
            r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_LinkedParticipants_CarryTheirColorEvenWithAPrivateProfile()
    {
        var evt = Event();
        var now = DateTimeOffset.UtcNow;
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)
            [
                new ParticipantEntity { Id = "p-1", EventId = evt.Id, Pseudo = "Camille", UserId = "u1", CreatedAt = now, UpdatedAt = now },
                new ParticipantEntity { Id = "p-2", EventId = evt.Id, Pseudo = "Sam", UserId = "u2", CreatedAt = now, UpdatedAt = now },
                new ParticipantEntity { Id = "p-3", EventId = evt.Id, Pseudo = "Invité", CreatedAt = now, UpdatedAt = now }
            ]);
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<UserCard>)
            [
                new UserCard("u1", "avatar-3", "camille", IsProfilePublic: true, AccentColor: AccentColor.Pink),
                new UserCard("u2", "avatar-5", "sam", IsProfilePublic: false, AccentColor: AccentColor.Green)
            ]);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(AccentColor.Pink, result.Participants[0].AccentColor);
        Assert.Equal(AccentColor.Green, result.Participants[1].AccentColor);
        Assert.Null(result.Participants[2].AccentColor);
    }

    [Fact]
    public async Task HandleAsync_CoHostViewer_IsHost_AndTheListMarksEveryCoHost()
    {
        var now = DateTimeOffset.UtcNow;
        var evt = Event() with { CreatorUserId = "creator", CoHostUserIds = ["u-co"] };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("u-co");
        _participantRepo
            .Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)
            [
                new ParticipantEntity { Id = "p-creator", EventId = "evt1", Pseudo = "Adrien", UserId = "creator", CreatedAt = now, UpdatedAt = now },
                new ParticipantEntity { Id = "p-co", EventId = "evt1", Pseudo = "Léa", UserId = "u-co", CreatedAt = now, UpdatedAt = now },
                new ParticipantEntity { Id = "p-guest", EventId = "evt1", Pseudo = "Tom", UserId = "u-guest", CreatedAt = now, UpdatedAt = now }
            ]);

        var result = await _sut.HandleAsync("evt1");

        Assert.True(result.IsHost);
        Assert.Equal([false, true, false], result.Participants.Select(p => p.IsCoHost));
        Assert.True(result.Participants[0].IsCreator);
    }

    [Theory]
    [InlineData("creator")]
    [InlineData("u-co")]
    public async Task HandleAsync_HostViewer_SeesWhoWasRemoved_WithTheirCard(string host)
    {
        var evt = Event() with { CreatorUserId = "creator", CoHostUserIds = ["u-co"], RemovedUserIds = ["u-out", "u-deleted"] };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns(host);
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<UserCard>)
            [
                new UserCard("u-out", "avatar-4", "lea", IsProfilePublic: true, DisplayName: "Léa", AccentColor: AccentColor.Pink)
            ]);

        var result = await _sut.HandleAsync("evt1");

        var removed = Assert.Single(result.RemovedPeople);
        Assert.Equal("u-out", removed.Id);
        Assert.Equal("Léa", removed.DisplayName);
        Assert.Equal("avatar-4", removed.AvatarId);
        Assert.Equal("lea", removed.Handle);
        Assert.Equal(AccentColor.Pink, removed.AccentColor);
    }

    [Fact]
    public async Task HandleAsync_HostViewer_ReadsParticipantsAndRemovedPeopleInOneLookup()
    {
        var now = DateTimeOffset.UtcNow;
        var evt = Event() with { CreatorUserId = "creator", RemovedUserIds = ["u-out"] };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("creator");
        _participantRepo
            .Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<ParticipantEntity>)
            [
                new ParticipantEntity { Id = "p-creator", EventId = "evt1", Pseudo = "Adrien", UserId = "creator", CreatedAt = now, UpdatedAt = now }
            ]);

        await _sut.HandleAsync("evt1");

        _userRepo.Verify(
            r => r.ListCardsByIdsAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 2 && ids.Contains("creator") && ids.Contains("u-out")),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("u-guest")]
    [InlineData("u-out")]
    [InlineData(null)]
    public async Task HandleAsync_ViewerWhoDoesNotHost_SeesNobodyRemoved(string? viewer)
    {
        var evt = Event() with { CreatorUserId = "creator", RemovedUserIds = ["u-out"] };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns(viewer);

        var result = await _sut.HandleAsync("evt1");

        Assert.Empty(result.RemovedPeople);
        _userRepo.Verify(
            r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
