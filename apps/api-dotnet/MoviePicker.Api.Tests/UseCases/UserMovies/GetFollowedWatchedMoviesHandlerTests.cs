using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

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
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
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

    private GetFollowedWatchedMoviesHandler Build(string? tmdbApiKey = "key")
    {
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>());
        return new GetFollowedWatchedMoviesHandler(
            _follows.Object,
            _users.Object,
            _participants.Object,
            _events.Object,
            _movies.Object,
            _tmdb.Object,
            Options.Create(new MoviePickerOptions { TmdbApiKey = tmdbApiKey }),
            new FixedTimeProvider(_now));
    }

    private void FollowedFriendWatched(params Movie[] movies)
    {
        _follows.Setup(r => r.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["friend"]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Usr("friend")]);
        _participants.Setup(r => r.ListByUserIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(movies.Select((_, index) => Part($"p{index}", $"e{index}", "friend")).ToList());
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(movies.Select((movie, index) => Evt($"e{index}", $"2026-06-0{index + 1}", movie.Id)).ToList());
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(movies);
    }

    [Fact]
    public async Task CarriesTheTmdbRatingAndRuntime_AndLeavesAnUnresolvedTitleWithoutThem()
    {
        FollowedFriendWatched(Mov("m1", 111), Mov("m2", 222));
        var handler = Build();
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.Is<IReadOnlyCollection<(int, MovieMediaType)>>(keys => keys.Count == 2),
                "FR",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(111, MovieMediaType.Movie)] = new TmdbMovieEnrichment(7.4, [], null, 128),
                [(222, MovieMediaType.Movie)] = null,
            });

        var result = await handler.HandleAsync("me", 20);

        var first = Assert.Single(result.Items, item => item.TmdbId == 111);
        Assert.Equal(7.4, first.VoteAverage);
        Assert.Equal(128, first.RuntimeMinutes);
        Assert.Equal("Film 111", first.Title);
        Assert.Equal("2024", first.Year);
        var second = Assert.Single(result.Items, item => item.TmdbId == 222);
        Assert.Null(second.VoteAverage);
        Assert.Null(second.RuntimeMinutes);
    }

    [Fact]
    public async Task WithoutTmdbCredentials_SkipsTheEnrichment()
    {
        FollowedFriendWatched(Mov("m1", 111));
        var handler = Build(tmdbApiKey: null);

        var result = await handler.HandleAsync("me", 20);

        Assert.Single(result.Items);
        Assert.Null(result.Items[0].VoteAverage);
        _tmdb.Verify(
            s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

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
