using System.Collections.Generic;
using System.Linq;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMyEvents;

public sealed class ListMyEventsHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IRecurringEventPass> _recurringEvents = new();
    private readonly ListMyEventsHandler _sut;
    private static readonly string[] value = new[] { "e1", "e2" };

    public ListMyEventsHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo
            .Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Distinct().ToDictionary(id => id, _ => 0));
        _movieRepo
            .Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Distinct().ToDictionary(id => id, _ => 0));
        _sut = new ListMyEventsHandler(
            _eventRepo.Object, _participantRepo.Object, _movieRepo.Object, _recurringEvents.Object);
    }

    [Fact]
    public async Task HandleAsync_MergesCreatedAndJoined_DedupesByEventId()
    {
        var created = new Event
        {
            Id = "e1",
            Title = "Créée",
            Date = "2030-01-01",
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
            Date = "2030-02-01",
            Time = "21:00",
            Slug = "j",
            HostToken = "h2",
            CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
            UpdatedAt = DateTimeOffset.Parse("2026-01-04T00:00:00Z")
        };

        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { created });
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
            Date = "2030-01-01",
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
            Date = "2030-01-02",
            Time = "20:00",
            Slug = "b",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-02T00:00:00Z")
        };
        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1, e2 });
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
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "u",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-02T00:00:00Z")
        };
        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1 });
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
            Date = "2030-01-01",
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
            Date = "2030-02-01",
            Time = "21:00",
            Slug = "free",
            HostToken = "h",
            CreatorUserId = "u1",
            Config = new EventConfig { MaxParticipants = null },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.Parse("2026-06-01T00:00:00Z")
        };

        _eventRepo
            .Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>()))
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
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "u",
            HostToken = "h",
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { e1 });
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
            Date = "2030-01-01",
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
        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>()))
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
            WinnerMovieId = "m1",
            ClosedAt = DateTimeOffset.Parse("2025-02-02T00:00:00Z"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.ListByCreatorUserIdAsync("u1", 200, It.IsAny<CancellationToken>()))
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
}
