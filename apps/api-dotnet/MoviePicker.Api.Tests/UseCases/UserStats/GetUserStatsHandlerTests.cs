using System.Linq;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserStats;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UserStats;

public sealed class GetUserStatsHandlerTests
{
    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IVoteRepository> _votes = new();
    private readonly Mock<ISeenMarkRepository> _seen = new();
    private readonly DateTimeOffset _now = new(2026, 6, 15, 0, 0, 0, TimeSpan.Zero);

    private static User PublicUser(bool isPublic = true) => new()
    {
        Id = "u1",
        Email = "a@b.co",
        PasswordHash = "h",
        DisplayName = "Alice",
        Handle = "alice",
        AvatarId = "alpha",
        IsProfilePublic = isPublic,
        CreatedAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Participant Part(string id, string eventId, DateTimeOffset createdAt) => new()
    {
        Id = id,
        EventId = eventId,
        UserId = "u1",
        Pseudo = "Alice",
        CreatedAt = createdAt,
        UpdatedAt = createdAt
    };

    private static Movie Mov(string id, string participantId, params int[] genreIds) => new()
    {
        Id = id,
        EventId = "e",
        ParticipantId = participantId,
        TmdbId = 1,
        Title = "M",
        Year = "2024",
        GenreIds = genreIds,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Event Evt(string id) => new()
    {
        Id = id,
        Title = "E",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = id,
        HostToken = "ht",
        CreatorUserId = "u1",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private GetUserStatsHandler Build()
    {
        _participants.Setup(r => r.ListByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Participant>());
        _events.Setup(r => r.ListByCreatorUserIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());
        _events.Setup(r => r.CountByWinnerMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _movies.Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Movie>());
        _votes.Setup(r => r.CountByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _seen.Setup(r => r.CountByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        return new GetUserStatsHandler(
            _users.Object,
            _participants.Object,
            _events.Object,
            _movies.Object,
            _votes.Object,
            _seen.Object,
            new FixedTimeProvider(_now));
    }

    [Fact]
    public async Task PrivateProfile_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser(isPublic: false));
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice"));
    }

    [Fact]
    public async Task UnknownHandle_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("ghost"));
    }

    [Fact]
    public async Task ZeroActivity_ReturnsZerosAndTwelveZeroFilledMonths()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());

        var res = await handler.HandleAsync("alice");

        Assert.Equal(0, res.EventsCreated);
        Assert.Equal(0, res.EventsJoined);
        Assert.Equal(0, res.MoviesProposed);
        Assert.Equal(0, res.VotesCast);
        Assert.Equal(0, res.WinningProposals);
        Assert.Equal(0, res.MoviesSeen);
        Assert.Empty(res.FavoriteGenres);
        Assert.Equal(12, res.MonthlyActivity.Count);
        Assert.Equal("2025-07", res.MonthlyActivity[0].Month);
        Assert.Equal("2026-06", res.MonthlyActivity[^1].Month);
        Assert.All(res.MonthlyActivity, p => Assert.Equal(0, p.Count));
    }

    [Fact]
    public async Task PopulatedUser_AggregatesAllStats()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());

        // p1 → event A (created by the user), p2 → event B (joined only).
        var parts = new[]
        {
            Part("p1", "A", new DateTimeOffset(2026, 6, 1, 0, 0, 0, TimeSpan.Zero)),
            Part("p2", "B", new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero)),
        };
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(parts);
        _events.Setup(r => r.ListByCreatorUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A") });
        _movies.Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m1", "p1", 28, 878), Mov("m2", "p1", 28), Mov("m3", "p2") });
        _votes.Setup(r => r.CountByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(5);
        _seen.Setup(r => r.CountByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(2);
        _events.Setup(r => r.CountByWinnerMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var res = await handler.HandleAsync("alice");

        Assert.Equal(1, res.EventsCreated);
        Assert.Equal(1, res.EventsJoined); // participated in {A,B}, created {A} → 1 joined
        Assert.Equal(3, res.MoviesProposed);
        Assert.Equal(5, res.VotesCast);
        Assert.Equal(2, res.MoviesSeen);
        Assert.Equal(1, res.WinningProposals);

        // Genre 28 ×2, genre 878 ×1 → sorted by count desc then id asc.
        Assert.Equal(2, res.FavoriteGenres.Count);
        Assert.Equal(28, res.FavoriteGenres[0].GenreId);
        Assert.Equal(2, res.FavoriteGenres[0].Count);
        Assert.Equal(878, res.FavoriteGenres[1].GenreId);
        Assert.Equal(1, res.FavoriteGenres[1].Count);

        Assert.Equal(1, res.MonthlyActivity.Single(p => p.Month == "2026-06").Count);
        Assert.Equal(1, res.MonthlyActivity.Single(p => p.Month == "2026-05").Count);
    }

    [Fact]
    public async Task MonthlyActivity_DropsParticipationsOlderThan12Months()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = new[]
        {
            Part("p1", "A", new DateTimeOffset(2026, 6, 10, 0, 0, 0, TimeSpan.Zero)), // current month
            Part("p2", "B", new DateTimeOffset(2025, 7, 10, 0, 0, 0, TimeSpan.Zero)), // oldest in-window bucket
            Part("p3", "C", new DateTimeOffset(2025, 5, 10, 0, 0, 0, TimeSpan.Zero)), // 13 months ago → dropped
        };
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(parts);

        var res = await handler.HandleAsync("alice");

        Assert.Equal(12, res.MonthlyActivity.Count);
        Assert.Equal(1, res.MonthlyActivity.Single(p => p.Month == "2026-06").Count);
        Assert.Equal(1, res.MonthlyActivity.Single(p => p.Month == "2025-07").Count);
        Assert.Equal(2, res.MonthlyActivity.Sum(p => p.Count)); // 2025-05 participation excluded
    }
}
