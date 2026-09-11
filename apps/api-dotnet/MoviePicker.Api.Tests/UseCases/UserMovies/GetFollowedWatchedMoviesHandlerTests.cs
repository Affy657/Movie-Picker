using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using Xunit;
using MoviePicker.Api.Tests.Builders;

namespace MoviePicker.Api.Tests.UseCases.UserMovies;

public sealed class GetFollowedWatchedMoviesHandlerTests
{
    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly DateTimeOffset _now = new(2026, 6, 15, 0, 0, 0, TimeSpan.Zero);

    private static Participant Part(string id, string eventId, string userId) => new()
    {
        Id = id,
        EventId = eventId,
        UserId = userId,
        Pseudo = "P",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Event Evt(string id, string date, string? winnerMovieId) => new()
    {
        Id = id,
        Title = "E",
        Date = date,
        Time = "20:00",
        Slug = id,
        HostToken = "ht",
        CreatorUserId = "friend",
        Winners = TestWinners.Won(winnerMovieId),
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Movie Mov(string id, int tmdbId) => new()
    {
        Id = id,
        EventId = "e",
        ParticipantId = "p",
        TmdbId = tmdbId,
        Title = $"Film {tmdbId}",
        Year = "2024",
        PosterPath = "/p.jpg",
        GenreIds = [28],
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static User Usr(string id, bool isPublic = true) => new()
    {
        Id = id,
        Email = $"{id}@test.local",
        PasswordHash = "h",
        DisplayName = id,
        Handle = id,
        AvatarId = "alpha",
        IsProfilePublic = isPublic,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private GetFollowedWatchedMoviesHandler Build() =>
        new(
            _follows.Object,
            _users.Object,
            _participants.Object,
            _events.Object,
            _movies.Object,
            new FixedTimeProvider(_now));

    [Fact]
    public async Task NoUser_ReturnsEmpty()
    {
        var result = await Build().HandleAsync(string.Empty, 20);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task NoFollowing_ReturnsEmptyWithoutTouchingParticipants()
    {
        _follows.Setup(r => r.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());

        var result = await Build().HandleAsync("me", 20);

        Assert.Empty(result.Items);
        _participants.Verify(
            r => r.ListByUserIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task KeepsOnlyFinishedEventsWithAWinner()
    {
        _follows.Setup(r => r.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["friend"]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Usr("friend")]);
        _participants.Setup(r => r.ListByUserIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([Part("p1", "past", "friend"), Part("p2", "future", "friend"), Part("p3", "nowinner", "friend")]);
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                Evt("past", "2026-06-01", "m1"),
                Evt("future", "2026-12-01", "m2"),
                Evt("nowinner", "2026-05-01", null),
            ]);
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Mov("m1", 111), Mov("m2", 222)]);

        var result = await Build().HandleAsync("me", 20);

        Assert.Single(result.Items);
        Assert.Equal(111, result.Items[0].TmdbId);
    }

    [Fact]
    public async Task DeduplicatesAMovieSeenInSeveralNights()
    {
        _follows.Setup(r => r.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["a", "b"]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Usr("a"), Usr("b")]);
        _participants.Setup(r => r.ListByUserIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([Part("p1", "e1", "a"), Part("p2", "e2", "b")]);
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Evt("e1", "2026-06-01", "m1"), Evt("e2", "2026-06-02", "m1")]);
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Mov("m1", 111)]);

        var result = await Build().HandleAsync("me", 20);

        Assert.Single(result.Items);
    }

    [Fact]
    public async Task HonoursTheTakeParameter()
    {
        _follows.Setup(r => r.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["a"]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Usr("a")]);
        _participants.Setup(r => r.ListByUserIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([Part("p1", "e1", "a"), Part("p2", "e2", "a")]);
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Evt("e1", "2026-06-01", "m1"), Evt("e2", "2026-06-02", "m2")]);
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Mov("m1", 111), Mov("m2", 222)]);

        var result = await Build().HandleAsync("me", 1);

        Assert.Single(result.Items);
        Assert.Equal(222, result.Items[0].TmdbId);
    }

    [Fact]
    public async Task PrivateProfiles_AreExcluded()
    {
        _follows.Setup(r => r.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["secret"]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Usr("secret", isPublic: false)]);

        var result = await Build().HandleAsync("me", 20);

        Assert.Empty(result.Items);
        _participants.Verify(
            r => r.ListByUserIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
