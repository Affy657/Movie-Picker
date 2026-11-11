using System.Collections.Generic;
using System.Linq;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMyEvents;

public sealed class ListMyEventsHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IMovieRatingRepository> _ratingRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly ListMyEventsHandler _sut;
    private static readonly string[] value = new[] { "e1", "e2" };

    public ListMyEventsHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _ratingRepo = new Mock<IMovieRatingRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _userRepo = new Mock<IUserRepository>();
        _movieRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Movie>());
        _participantRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Participant>());
        _voteRepo
            .Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate>());
        _voteRepo
            .Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Vote>());
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<UserCard>());
        _ratingRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MovieRating>());
        _participantRepo
            .Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Participant>());
        _participantRepo
            .Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Distinct().ToDictionary(id => id, _ => 0));
        _movieRepo
            .Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Distinct().ToDictionary(id => id, _ => 0));
        _sut = new ListMyEventsHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            _movieRepo.Object,
            _ratingRepo.Object,
            _voteRepo.Object,
            _userRepo.Object,
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_ReadsWithoutWritingAnything()
    {
        var created = new EventEntityBuilder().WithId("e1").Build();
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([created]);
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(["e1"]);

        await _sut.HandleAsync("u1", null, null, null, null);

        _eventRepo.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
        _eventRepo.Verify(
            r => r.MarkWatchlistCleanedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_MergesCreatedAndJoined_DedupesByEventId()
    {
        var created = new Event
        {
            Id = "e1",
            Title = "Créée",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "c",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.Parse("2026-01-02T00:00:00Z"),
            UpdatedAt = DateTimeOffset.Parse("2026-01-03T00:00:00Z")
        };
        var joinedOnly = new Event
        {
            Id = "e2",
            Title = "Rejointe",
            Date = TestDates.UpcomingPlusDays(31),
            Time = "21:00",
            Slug = "j",
            HostToken = "h2",
            CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
            UpdatedAt = DateTimeOffset.Parse("2026-01-04T00:00:00Z")
        };

        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(new[] { created });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(value);
        _eventRepo.Setup(r => r.ListByIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 1 && ids.Contains("e2")), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { joinedOnly });

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        Assert.Equal(2, result.Events.Count);
        var c = result.Events.Single(x => x.Id == "e1");
        Assert.True(c.IsCreator);
        Assert.True(c.IsParticipant);
        var j = result.Events.Single(x => x.Id == "e2");
        Assert.False(j.IsCreator);
        Assert.True(j.IsParticipant);
        Assert.Equal("Créée", result.Events[0].Title);
        Assert.Equal("Rejointe", result.Events[1].Title);
    }

    [Fact]
    public async Task HandleAsync_RespectsLimit()
    {
        var e1 = new Event
        {
            Id = "a",
            Title = "A",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "a",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-01T00:00:00Z")
        };
        var e2 = new Event
        {
            Id = "b",
            Title = "B",
            Date = TestDates.UpcomingPlusDays(1),
            Time = "20:00",
            Slug = "b",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-02T00:00:00Z")
        };
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1, e2 });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 1, offset: 0, q: null);

        Assert.Single(result.Events);
        Assert.Equal("a", result.Events[0].Id);
        Assert.True(result.HasMore);
        _participantRepo.Verify(
            r => r.CountByEventIdsAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 1 && ids.Contains("a")),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _movieRepo.Verify(
            r => r.CountByEventIdsAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 1 && ids.Contains("a")),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AppliesParticipantAndMovieCountsFromRepositories()
    {
        var e1 = new Event
        {
            Id = "e1",
            Title = "Une",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "u",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-02T00:00:00Z")
        };
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1 });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());
        _participantRepo
            .Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["e1"] = 5 });
        _movieRepo
            .Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["e1"] = 3 });

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Equal(5, row.ParticipantCount);
        Assert.Equal(3, row.MovieCount);
    }

    [Fact]
    public async Task HandleAsync_ExposesMaxParticipantsFromConfig()
    {
        var capped = new Event
        {
            Id = "e1",
            Title = "Avec capacité",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "cap",
            HostToken = "h",
            CreatorUserId = "u1",
            Config = new EventConfig { MaxParticipants = 8 },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-02T00:00:00Z")
        };
        var unlimited = new Event
        {
            Id = "e2",
            Title = "Sans limite",
            Date = TestDates.UpcomingPlusDays(31),
            Time = "21:00",
            Slug = "free",
            HostToken = "h",
            CreatorUserId = "u1",
            Config = new EventConfig { MaxParticipants = null },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-01T00:00:00Z")
        };

        _eventRepo
            .Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { capped, unlimited });
        _participantRepo
            .Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        var rowCapped = result.Events.Single(x => x.Id == "e1");
        var rowFree = result.Events.Single(x => x.Id == "e2");
        Assert.Equal(8, rowCapped.MaxParticipants);
        Assert.Null(rowFree.MaxParticipants);
    }

    [Fact]
    public async Task HandleAsync_ExposesAutoCloseAt_ComputedFromScheduleConstants()
    {
        var e1 = new Event
        {
            Id = "e1",
            Title = "Une",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "u",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1 });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.True(EventSchedule.TryGetStartUtc(e1.Date, e1.Time, out var startUtc));
        var expected = startUtc + EventSchedule.PendingDelay + EventSchedule.AutoCloseDelay;
        Assert.Equal(expected, row.AutoCloseAt);
    }

    [Fact]
    public async Task HandleAsync_ScopeFinished_ReturnsOnlyFinishedEvents_SortedDescendingByStart()
    {
        var active = new Event
        {
            Id = "active",
            Title = "Active",
            Date = TestDates.Upcoming,
            Time = "20:00",
            Slug = "active",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var finishedOld = new Event
        {
            Id = "f1",
            Title = "Ancienne",
            Date = "2025-01-01",
            Time = "20:00",
            Slug = "f1",
            HostToken = "h",
            CreatorUserId = "u1",
            ClosedAt = DateTimeOffset.Parse("2025-01-02T00:00:00Z"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var finishedRecent = new Event
        {
            Id = "f2",
            Title = "Récente",
            Date = "2025-06-01",
            Time = "20:00",
            Slug = "f2",
            HostToken = "h",
            CreatorUserId = "u1",
            ClosedAt = DateTimeOffset.Parse("2025-06-02T00:00:00Z"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { active, finishedOld, finishedRecent });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        Assert.Equal(2, result.Events.Count);
        Assert.Equal("f2", result.Events[0].Id);
        Assert.Equal("f1", result.Events[1].Id);
        Assert.Equal(1, result.TotalActive);
        Assert.Equal(2, result.TotalFinished);
    }

    [Fact]
    public async Task HandleAsync_FinishedScope_FiltersBySearchQueryOnTitleOrWinnerMovie()
    {
        var byTitle = new Event
        {
            Id = "f1",
            Title = "Brunch ciné",
            Date = "2025-01-01",
            Time = "20:00",
            Slug = "f1",
            HostToken = "h",
            CreatorUserId = "u1",
            ClosedAt = DateTimeOffset.Parse("2025-01-02T00:00:00Z"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var byWinner = new Event
        {
            Id = "f2",
            Title = "Soirée du mois",
            Date = "2025-02-01",
            Time = "20:00",
            Slug = "f2",
            HostToken = "h",
            CreatorUserId = "u1",
            Winners = TestWinners.Won("m1"),
            ClosedAt = DateTimeOffset.Parse("2025-02-02T00:00:00Z"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { byTitle, byWinner });
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());
        _eventRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());
        _movieRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new Movie { Id = "m1", Title = "Amélie" } });

        var byTitleResult = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: "brunch");
        var byWinnerResult = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: "amélie");

        Assert.Equal("f1", Assert.Single(byTitleResult.Events).Id);
        Assert.Equal("f2", Assert.Single(byWinnerResult.Events).Id);
    }

    private static Event FinishedNight(string id, params string[] winnerMovieIds) => new()
    {
        Id = id,
        Title = id,
        Date = "2025-06-01",
        Time = "20:00",
        Slug = id,
        HostToken = "h",
        CreatorUserId = "u1",
        Winners = TestWinners.Won(winnerMovieIds),
        ClosedAt = DateTimeOffset.Parse("2025-06-02T00:00:00Z"),
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void GivenCreatedNights(params Event[] nights)
    {
        _eventRepo.Setup(r => r.ListAllByCreatorUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(nights);
        _participantRepo.Setup(r => r.ListDistinctEventIdsByUserIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(nights.Select(n => n.Id).ToArray());
        _movieRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Select(id => new Movie { Id = id, Title = id }).ToArray());
    }

    private void GivenViewerJoined(string eventId, string participantId) =>
        _participantRepo
            .Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = participantId, EventId = eventId, UserId = "u1" }]);

    private void GivenRatings(params MovieRating[] ratings) =>
        _ratingRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ratings);

    private static MovieRating Rating(string eventId, string movieId, string participantId, int value) => new()
    {
        EventId = eventId,
        MovieId = movieId,
        ParticipantId = participantId,
        Value = value
    };

    [Fact]
    public async Task HandleAsync_AveragesTheWinnerNamedOnTheRow()
    {
        GivenCreatedNights(FinishedNight("e1", "m1", "m2"));
        GivenViewerJoined("e1", "me");
        GivenRatings(
            Rating("e1", "m1", "me", 8),
            Rating("e1", "m2", "me", 9),
            Rating("e1", "m1", "other", 4));

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Equal(6, row.AverageRating);
        Assert.Equal(8, row.MyRating);
        Assert.False(row.HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_ViewerWhoRatedOneOfTwoWinners_StillHasAWinnerToRate()
    {
        GivenCreatedNights(FinishedNight("e1", "m1", "m2"));
        GivenViewerJoined("e1", "me");
        GivenRatings(Rating("e1", "m1", "me", 8));

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Equal(8, row.MyRating);
        Assert.True(row.HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_NoRatingYet_LeavesTheAveragesEmptyAndAsksTheViewerToRate()
    {
        GivenCreatedNights(FinishedNight("e1", "m1"));
        GivenViewerJoined("e1", "me");

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Null(row.AverageRating);
        Assert.Null(row.MyRating);
        Assert.True(row.HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_HostWhoNeverJoined_HasNothingToRateButSeesTheAverage()
    {
        GivenCreatedNights(FinishedNight("e1", "m1"));
        GivenRatings(Rating("e1", "m1", "other", 6));

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Equal(6, row.AverageRating);
        Assert.Null(row.MyRating);
        Assert.False(row.HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_RatingNotOpenYet_HasNothingToRate()
    {
        GivenCreatedNights(FinishedNight("e1", "m1") with { Date = TestDates.Upcoming, ClosedAt = null });
        GivenViewerJoined("e1", "me");

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        Assert.False(Assert.Single(result.Events).HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_ActiveScope_LeavesTheRatingsUnread()
    {
        GivenCreatedNights(FinishedNight("e1", "m1") with { Date = TestDates.Upcoming, ClosedAt = null });

        await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        _ratingRepo.Verify(
            r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_RatingOfAMovieThatNoLongerWon_CountsForNothing()
    {
        GivenCreatedNights(FinishedNight("e1", "m1"));
        GivenViewerJoined("e1", "me");
        GivenRatings(Rating("e1", "former-winner", "me", 10));

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Null(row.AverageRating);
        Assert.Null(row.MyRating);
        Assert.True(row.HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_WinnerMovieGoneFromTheEvent_IsNotAskedToBeRated()
    {
        GivenCreatedNights(FinishedNight("e1", "m1", "gone"));
        GivenViewerJoined("e1", "me");
        GivenRatings(Rating("e1", "m1", "me", 8));
        _movieRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Movie { Id = "m1", Title = "m1" }]);

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        Assert.False(Assert.Single(result.Events).HasWinnerToRate);
    }

    [Fact]
    public async Task HandleAsync_KeepsEachRatingOnItsOwnEvent()
    {
        GivenCreatedNights(FinishedNight("e1", "m1"), FinishedNight("e2", "m2"));
        GivenRatings(Rating("e1", "m1", "other", 4), Rating("e2", "m2", "other", 10));

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        Assert.Equal(4, result.Events.Single(e => e.Id == "e1").AverageRating);
        Assert.Equal(10, result.Events.Single(e => e.Id == "e2").AverageRating);
    }

    [Fact]
    public async Task HandleAsync_LoadsTheRatingsOfThePageInOneRead()
    {
        GivenCreatedNights(
            FinishedNight("e1", "m1"),
            FinishedNight("e2", "m2"),
            FinishedNight("e3", "m3"));

        await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 2, offset: 0, q: null);

        _ratingRepo.Verify(
            r => r.ListByEventIdsAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 2),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _ratingRepo.Verify(
            r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _participantRepo.Verify(
            r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_PageWithoutAnyWinner_ReadsNoRating()
    {
        GivenCreatedNights(FinishedNight("e1"));

        await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        _ratingRepo.Verify(
            r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ActiveScope_ShowsTheThreeBestScoredPosters_InListOrderOnTies()
    {
        GivenCreatedNights(UpcomingNight("e1"));
        var start = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
        _movieRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                ProposedMovie("e1", "early", start),
                ProposedMovie("e1", "liked", start.AddMinutes(1)),
                ProposedMovie("e1", "later", start.AddMinutes(2)),
                ProposedMovie("e1", "disliked", start.AddMinutes(3)),
                ProposedMovie("e1", "last", start.AddMinutes(4)),
            ]);
        _voteRepo
            .Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate>
            {
                ["liked"] = new(2, 2, 0),
                ["disliked"] = new(-1, 0, 1),
            });

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Equal(["liked", "early", "later"], row.TopMovies.Select(m => m.Title));
        Assert.Equal("/posters/liked.jpg", row.TopMovies[0].PosterPath);
    }

    [Fact]
    public async Task HandleAsync_ActiveScope_PreviewsTheFirstFourParticipantsWithTheirAvatar()
    {
        GivenCreatedNights(UpcomingNight("e1"));
        var start = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
        _participantRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                Joined("e1", "p5", "Eve", start.AddMinutes(5)),
                Joined("e1", "p1", "Léa", start, userId: "u-lea"),
                Joined("e1", "p2", "Nico", start.AddMinutes(1)),
                Joined("e1", "p3", "Inès", start.AddMinutes(2)),
                Joined("e1", "p4", "Sam", start.AddMinutes(3)),
            ]);
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new UserCard("u-lea", "fox", "lea", true)]);

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        var row = Assert.Single(result.Events);
        Assert.Equal(["Léa", "Nico", "Inès", "Sam"], row.ParticipantsPreview.Select(p => p.Pseudo));
        Assert.Equal("fox", row.ParticipantsPreview[0].AvatarId);
        Assert.Equal(string.Empty, row.ParticipantsPreview[1].AvatarId);
    }

    [Fact]
    public async Task HandleAsync_ActiveScope_TellsWhetherTheViewerAlreadyVotedOnEachNight()
    {
        GivenCreatedNights(UpcomingNight("e1"), UpcomingNight("e2"));
        var start = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
        _participantRepo
            .Setup(r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                Joined("e1", "me-1", "Moi", start, userId: "u1"),
                Joined("e2", "me-2", "Moi", start, userId: "u1"),
            ]);
        _voteRepo
            .Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Vote { EventId = "e1", MovieId = "m1", ParticipantId = "me-1", Value = 1 }]);

        var result = await _sut.HandleAsync("u1", MyEventListScope.Active, limit: 10, offset: 0, q: null);

        Assert.True(result.Events.Single(e => e.Id == "e1").HasVoted);
        Assert.False(result.Events.Single(e => e.Id == "e2").HasVoted);
    }

    [Fact]
    public async Task HandleAsync_FinishedScope_ReadsNoPreview()
    {
        GivenCreatedNights(FinishedNight("e1", "m1"));

        var result = await _sut.HandleAsync("u1", MyEventListScope.Finished, limit: 10, offset: 0, q: null);

        Assert.Empty(Assert.Single(result.Events).TopMovies);
        _movieRepo.Verify(
            r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _participantRepo.Verify(
            r => r.ListByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static Event UpcomingNight(string id) => new()
    {
        Id = id,
        Title = id,
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = id,
        HostToken = "h",
        CreatorUserId = "u1",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Movie ProposedMovie(string eventId, string id, DateTimeOffset createdAt) => new()
    {
        Id = id,
        EventId = eventId,
        Title = id,
        PosterPath = $"/posters/{id}.jpg",
        CreatedAt = createdAt
    };

    private static Participant Joined(
        string eventId,
        string id,
        string pseudo,
        DateTimeOffset createdAt,
        string? userId = null) => new()
        {
            Id = id,
            EventId = eventId,
            Pseudo = pseudo,
            UserId = userId,
            CreatedAt = createdAt
        };
}
