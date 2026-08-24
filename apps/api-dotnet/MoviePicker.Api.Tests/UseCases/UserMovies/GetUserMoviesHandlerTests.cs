using System.Linq;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UserMovies;

public sealed class GetUserMoviesHandlerTests
{
    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly DateTimeOffset _now = new(2026, 6, 15, 0, 0, 0, TimeSpan.Zero);
    private static readonly string[] SingleParticipantId = ["p1"];

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

    private static Participant Part(string id, string eventId) => new()
    {
        Id = id,
        EventId = eventId,
        UserId = "u1",
        Pseudo = "Alice",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Movie Mov(
        string id,
        string participantId,
        string eventId,
        DateTimeOffset createdAt,
        MovieMediaType mediaType = MovieMediaType.Movie) => new()
        {
            Id = id,
            EventId = eventId,
            ParticipantId = participantId,
            TmdbId = 1,
            MediaType = mediaType,
            Title = $"Movie {id}",
            Year = "2024",
            PosterPath = "/poster.jpg",
            GenreIds = [28],
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        };

    private static Event Evt(string id, string? winnerMovieId = null, DateTimeOffset? closedAt = null, string date = "2026-06-01") => new()
    {
        Id = id,
        Title = "E",
        Date = date,
        Time = "20:00",
        Slug = id,
        HostToken = "ht",
        CreatorUserId = "u1",
        WinnerMovieId = winnerMovieId,
        ClosedAt = closedAt,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private GetUserMoviesHandler Build()
    {
        _participants.Setup(r => r.ListByUserIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Participant>());
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());
        _movies.Setup(r => r.ListByParticipantIdsPagedAsync(
                It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Movie>());
        _movies.Setup(r => r.CountByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        return new GetUserMoviesHandler(
            _users.Object,
            _participants.Object,
            _events.Object,
            _movies.Object,
            new FixedTimeProvider(_now));
    }

    [Fact]
    public async Task PrivateProfile_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser(isPublic: false));
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice", 0, 6));
    }

    [Fact]
    public async Task UnknownHandle_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("ghost", 0, 6));
    }

    [Fact]
    public async Task NoParticipants_ReturnsEmptyWithZeroTotal()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());

        var res = await handler.HandleAsync("alice", 0, 6);

        Assert.Empty(res.Items);
        Assert.Equal(0, res.TotalCount);
        _movies.Verify(
            r => r.ListByParticipantIdsPagedAsync(
                It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PopulatedUser_MapsFieldsAndForwardsPagingToRepository()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = new[] { Part("p1", "A") };
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(parts);

        var proposedAt = new DateTimeOffset(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);
        _movies.Setup(r => r.ListByParticipantIdsPagedAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.SequenceEqual(SingleParticipantId)), 2, 6, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m1", "p1", "A", proposedAt, MovieMediaType.Tv) });
        _movies.Setup(r => r.CountByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(11);
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", winnerMovieId: "m1", closedAt: _now) });

        var res = await handler.HandleAsync("alice", 2, 6);

        Assert.Equal(11, res.TotalCount);
        var item = Assert.Single(res.Items);
        Assert.Equal(1, item.TmdbId);
        Assert.Equal("Movie m1", item.Title);
        Assert.Equal("2024", item.Year);
        Assert.Equal("/poster.jpg", item.PosterPath);
        Assert.Equal([28], item.GenreIds);
        Assert.Equal(MovieMediaType.Tv, item.MediaType);
        Assert.Equal(proposedAt, item.ProposedAt);
        Assert.True(item.IsWinner);
    }

    [Fact]
    public async Task Winner_NotMarked_WhenEventNotYetFinished()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = new[] { Part("p1", "A") };
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(parts);
        _movies.Setup(r => r.ListByParticipantIdsPagedAsync(
                It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m1", "p1", "A", DateTimeOffset.UtcNow) });
        // Winner already picked, but the soirée itself hasn't finished (future date, no ClosedAt).
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", winnerMovieId: "m1", closedAt: null, date: "2030-01-01") });

        var res = await handler.HandleAsync("alice", 0, 6);

        Assert.False(Assert.Single(res.Items).IsWinner);
    }

    [Fact]
    public async Task NegativeSkipAndZeroTake_FallBackToDefaults()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = new[] { Part("p1", "A") };
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(parts);

        await handler.HandleAsync("alice", -5, 0);

        _movies.Verify(
            r => r.ListByParticipantIdsPagedAsync(It.IsAny<IReadOnlyCollection<string>>(), 0, 6, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExcessiveTake_IsCappedAtMax()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = new[] { Part("p1", "A") };
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(parts);

        await handler.HandleAsync("alice", 0, 500);

        _movies.Verify(
            r => r.ListByParticipantIdsPagedAsync(It.IsAny<IReadOnlyCollection<string>>(), 0, 60, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
