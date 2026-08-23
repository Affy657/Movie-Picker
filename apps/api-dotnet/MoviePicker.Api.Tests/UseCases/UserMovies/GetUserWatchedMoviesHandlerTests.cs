using System.Linq;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UserMovies;

public sealed class GetUserWatchedMoviesHandlerTests
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

    private static Movie Mov(string id, int tmdbId = 1) => new()
    {
        Id = id,
        EventId = "irrelevant",
        ParticipantId = "irrelevant",
        TmdbId = tmdbId,
        Title = $"Movie {id}",
        Year = "2024",
        PosterPath = "/poster.jpg",
        GenreIds = [28],
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Event Evt(
        string id,
        string date = "2026-06-01",
        string? winnerMovieId = null,
        DateTimeOffset? closedAt = null) => new()
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

    private GetUserWatchedMoviesHandler Build()
    {
        _participants.Setup(r => r.ListByUserIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Participant>());
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Event>());
        return new GetUserWatchedMoviesHandler(
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
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice", 6));
    }

    [Fact]
    public async Task UnknownHandle_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("ghost", 6));
    }

    [Fact]
    public async Task NoParticipants_ReturnsEmpty()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());

        var res = await handler.HandleAsync("alice", 6);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task EventsWithoutWinner_AreExcluded()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", winnerMovieId: null) });

        var res = await handler.HandleAsync("alice", 6);

        Assert.Empty(res.Items);
        _movies.Verify(m => m.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UnfinishedEventWithWinner_IsExcluded()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        // Winner already picked, but the soirée itself is scheduled in the future and not yet finished.
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", date: "2030-01-01", winnerMovieId: "m1") });

        var res = await handler.HandleAsync("alice", 6);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task ReturnsWinnerMovies_MostRecentEventFirst()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A"), Part("p2", "B") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                Evt("A", date: "2026-01-01", winnerMovieId: "m-old"),
                Evt("B", date: "2026-05-01", winnerMovieId: "m-recent"),
            });
        _movies.Setup(m => m.GetByIdAsync("m-old", It.IsAny<CancellationToken>())).ReturnsAsync(Mov("m-old", tmdbId: 10));
        _movies.Setup(m => m.GetByIdAsync("m-recent", It.IsAny<CancellationToken>())).ReturnsAsync(Mov("m-recent", tmdbId: 20));

        var res = await handler.HandleAsync("alice", 6);

        Assert.Equal(2, res.Items.Count);
        Assert.Equal(20, res.Items[0].TmdbId);
        Assert.Equal(10, res.Items[1].TmdbId);
    }

    [Fact]
    public async Task MissingWinnerMovie_IsSkipped()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", winnerMovieId: "m-deleted") });
        _movies.Setup(m => m.GetByIdAsync("m-deleted", It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        var res = await handler.HandleAsync("alice", 6);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task ExcessiveTake_IsCappedAtMax()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = Enumerable.Range(0, 40).Select(i => Part($"p{i}", $"e{i}")).ToArray();
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(parts);
        var events = Enumerable.Range(0, 40)
            .Select(i => Evt($"e{i}", date: $"2026-01-{(i % 28) + 1:D2}", winnerMovieId: $"m{i}"))
            .ToArray();
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(events);
        _movies.Setup(m => m.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string id, CancellationToken _) => Mov(id));

        var res = await handler.HandleAsync("alice", 500);

        Assert.Equal(30, res.Items.Count);
    }
}
