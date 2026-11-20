using System.Linq;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
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
    private readonly Mock<IMovieRatingRepository> _ratings = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly InMemoryWatchedTitleRepository _watched = new();
    private const string NightAfterNow = "2026-12-01";

    private readonly DateTimeOffset _now = new(2026, 6, 15, 0, 0, 0, TimeSpan.Zero);

    private static User PublicUser(bool isPublic = true, bool isWatchedPublic = true) => new()
    {
        Id = "u1",
        Email = "a@b.co",
        PasswordHash = "h",
        DisplayName = "Alice",
        Handle = "alice",
        AvatarId = "alpha",
        IsProfilePublic = isPublic,
        IsWatchedPublic = isWatchedPublic,
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
            Winners = TestWinners.Won(winnerMovieId),
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
        _ratings.Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MovieRating>());
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>());
        var history = new WatchedHistoryReader(
            _participants.Object,
            _events.Object,
            _movies.Object,
            _ratings.Object,
            _watched,
            new FixedTimeProvider(_now));
        return new GetUserWatchedMoviesHandler(
            _users.Object,
            history,
            _tmdb.Object,
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
    }

    private static DateTimeOffset NightStart(string date)
    {
        EventSchedule.TryGetStartUtc(date, "20:00", out var start);
        return start;
    }

    private Task<WatchedTitle> WatchElsewhereAsync(int tmdbId, DateTimeOffset watchedAt, int? rating = null) =>
        _watched.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = "u1",
            TmdbId = tmdbId,
            Title = $"Ailleurs {tmdbId}",
            Year = "2001",
            PosterPath = "/elsewhere.jpg",
            VoteAverage = 7.5,
            RuntimeMinutes = 101,
            GenreIds = [35],
            WatchedAt = watchedAt,
            Rating = rating,
            CreatedAt = watchedAt,
            UpdatedAt = watchedAt
        });

    private void ParticipatesIn(params Event[] nights)
    {
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(nights.Select((night, index) => Part($"p{index}", night.Id)).ToArray());
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(nights);
    }

    private void WinnerMoviesAre(params Movie[] movies) =>
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) => movies.Where(movie => ids.Contains(movie.Id)).ToList());

    private void RatedAtNights(params (string ParticipantId, string MovieId, int Value)[] ratings) =>
        _ratings.Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ratings
                .Select(x => new MovieRating
                {
                    Id = $"r-{x.MovieId}",
                    EventId = "e",
                    MovieId = x.MovieId,
                    ParticipantId = x.ParticipantId,
                    Value = x.Value,
                    CreatedAt = _now,
                    UpdatedAt = _now
                })
                .ToList());

    [Fact]
    public async Task PrivateProfile_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser(isPublic: false));
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice", null, 6));
    }

    [Fact]
    public async Task UnknownHandle_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("ghost", null, 6));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("stranger")]
    public async Task HiddenWatchedFilms_AreNotFound_ForAnyoneButTheMember(string? viewerId)
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser(isWatchedPublic: false));

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice", viewerId, 6));

        Assert.Equal(ErrorCodes.WatchedNotFound, ex.Reason);
    }

    [Fact]
    public async Task HiddenWatchedFilms_StayVisibleToTheMemberHimself()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser(isWatchedPublic: false));

        var res = await handler.HandleAsync("alice", "u1", 6);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task NoParticipants_ReturnsEmpty()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());

        var res = await handler.HandleAsync("alice", null, 6);

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

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Empty(res.Items);
        _movies.Verify(
            m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UnfinishedEventWithWinner_IsExcluded()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", date: NightAfterNow, winnerMovieId: "m1") });

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task NightOverWithADrawLeft_CountsItsDrawnFilmAsWatched()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var lastNight = Evt("A", date: "2026-06-14", winnerMovieId: "m1") with { Config = new EventConfig { WinnerCount = 2 } };
        ParticipatesIn(lastNight);
        WinnerMoviesAre(Mov("m1", tmdbId: 10));

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Equal(10, Assert.Single(res.Items).TmdbId);
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
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m-old", tmdbId: 10), Mov("m-recent", tmdbId: 20) });

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Equal(2, res.Items.Count);
        Assert.Equal(20, res.Items[0].TmdbId);
        Assert.Equal(10, res.Items[1].TmdbId);
    }

    [Fact]
    public async Task CarriesTheOwnersRatingOfEachWatchedMovie()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A"), Part("p2", "B") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                Evt("A", date: "2026-01-01", winnerMovieId: "m-rated"),
                Evt("B", date: "2026-05-01", winnerMovieId: "m-unrated"),
            });
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m-rated", tmdbId: 10), Mov("m-unrated", tmdbId: 20) });
        _ratings.Setup(r => r.ListByParticipantIdsAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Contains("p1") && ids.Contains("p2")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new MovieRating { Id = "r1", EventId = "A", MovieId = "m-rated", ParticipantId = "p1", Value = 7, CreatedAt = _now, UpdatedAt = _now }
            });

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Null(res.Items.Single(i => i.TmdbId == 20).MyRating);
        Assert.Equal(7, res.Items.Single(i => i.TmdbId == 10).MyRating);
    }

    [Fact]
    public async Task KeepsTheOwnersRatingOnceTmdbFactsAreAdded()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", date: "2026-01-01", winnerMovieId: "m-rated") });
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m-rated", tmdbId: 10) });
        _ratings.Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new MovieRating { Id = "r1", EventId = "A", MovieId = "m-rated", ParticipantId = "p1", Value = 7, CreatedAt = _now, UpdatedAt = _now }
            });
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(10, MovieMediaType.Movie)] = new TmdbMovieEnrichment(8.1, [], null, 112)
            });

        var item = Assert.Single((await handler.HandleAsync("alice", null, 6)).Items);

        Assert.Equal(8.1, item.VoteAverage);
        Assert.Equal(112, item.RuntimeMinutes);
        Assert.Equal(7, item.MyRating);
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
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Movie>());

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task ExcessiveTake_IsCappedAtAThousand()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        var parts = Enumerable.Range(0, 1_200).Select(i => Part($"p{i}", $"e{i}")).ToArray();
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(parts);
        var events = Enumerable.Range(0, 1_200)
            .Select(i => Evt($"e{i}", date: $"2026-01-{(i % 28) + 1:D2}", winnerMovieId: $"m{i}"))
            .ToArray();
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(events);
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Select(id => Mov(id, tmdbId: int.Parse(id[1..]) + 1)).ToList());

        var res = await handler.HandleAsync("alice", null, 5_000);

        Assert.Equal(1_000, res.Items.Count);
        Assert.Equal(1_200, res.Total);
    }

    [Fact]
    public async Task Total_CountsEachFilmOnce_BeyondTheTake()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        ParticipatesIn(
            Evt("A", date: "2026-01-01", winnerMovieId: "m-first"),
            Evt("B", date: "2026-03-01", winnerMovieId: "m-again"),
            Evt("C", date: "2026-05-01", winnerMovieId: "m-again-later"),
            Evt("D", date: NightAfterNow, winnerMovieId: "m-upcoming"),
            Evt("E", date: "2026-04-01", winnerMovieId: null));
        WinnerMoviesAre(
            Mov("m-first", tmdbId: 1),
            Mov("m-again", tmdbId: 2),
            Mov("m-again-later", tmdbId: 2),
            Mov("m-upcoming", tmdbId: 3));

        var res = await handler.HandleAsync("alice", null, 1);

        var item = Assert.Single(res.Items);
        Assert.Equal(2, item.TmdbId);
        Assert.Equal(NightStart("2026-05-01"), item.WatchedAt);
        Assert.Equal(2, res.Total);
    }

    [Fact]
    public async Task MergesTheTitlesWatchedElsewhere_LatestFirst_WithTheirStoredFacts_WithoutAskingTmdbForThem()
    {
        var handler = Build();
        ParticipatesIn(Evt("A", date: "2026-01-01", winnerMovieId: "m-night"));
        WinnerMoviesAre(Mov("m-night", tmdbId: 10));
        var watchedAt = new DateTimeOffset(2026, 3, 1, 12, 0, 0, TimeSpan.Zero);
        await WatchElsewhereAsync(20, watchedAt, rating: 6);
        IReadOnlyCollection<(int, MovieMediaType)>? enriched = null;
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Callback((IReadOnlyCollection<(int, MovieMediaType)> keys, string _, CancellationToken _) => enriched = keys)
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>());

        var res = await handler.HandleForUserAsync("u1", 0);

        Assert.Equal([(20, WatchedSource.Elsewhere), (10, WatchedSource.Night)], res.Items.Select(i => (i.TmdbId, i.Source)));
        Assert.Equal(2, res.Total);
        var elsewhere = res.Items[0];
        Assert.Equal(
            ("Ailleurs 20", "2001", (string?)"/elsewhere.jpg", (double?)7.5, (int?)101, (int?)6, watchedAt),
            (elsewhere.Title, elsewhere.Year, elsewhere.PosterPath, elsewhere.VoteAverage, elsewhere.RuntimeMinutes, elsewhere.MyRating, elsewhere.WatchedAt));
        Assert.Equal([35], elsewhere.GenreIds);
        Assert.Equal([(10, MovieMediaType.Movie)], enriched);
    }

    [Fact]
    public async Task AFilmWatchedBothWays_IsOneNightFilm_WithTheNightDateAndRating()
    {
        var handler = Build();
        ParticipatesIn(Evt("A", date: "2026-01-01", winnerMovieId: "m-night"));
        WinnerMoviesAre(Mov("m-night", tmdbId: 10));
        RatedAtNights(("p0", "m-night", 7));
        await WatchElsewhereAsync(10, new DateTimeOffset(2026, 5, 1, 12, 0, 0, TimeSpan.Zero), rating: 3);

        var res = await handler.HandleForUserAsync("u1", 6);

        var item = Assert.Single(res.Items);
        Assert.Equal((WatchedSource.Night, NightStart("2026-01-01"), (int?)7), (item.Source, item.WatchedAt, item.MyRating));
        Assert.Equal("Movie m-night", item.Title);
        Assert.Equal(1, res.Total);
    }

    [Fact]
    public async Task AFilmWatchedBothWays_WithoutANightRating_TakesTheRatingGivenElsewhere()
    {
        var handler = Build();
        ParticipatesIn(Evt("A", date: "2026-01-01", winnerMovieId: "m-night"));
        WinnerMoviesAre(Mov("m-night", tmdbId: 10));
        await WatchElsewhereAsync(10, new DateTimeOffset(2026, 5, 1, 12, 0, 0, TimeSpan.Zero), rating: 3);

        var item = Assert.Single((await handler.HandleForUserAsync("u1", 6)).Items);

        Assert.Equal((WatchedSource.Night, (int?)3), (item.Source, item.MyRating));
    }

    [Fact]
    public async Task AFilmWonAtThreeNights_IsListedOnce_AtItsLatestNight_WithTheLatestNightRating()
    {
        var handler = Build();
        ParticipatesIn(
            Evt("A", date: "2026-01-01", winnerMovieId: "m-first"),
            Evt("B", date: "2026-03-01", winnerMovieId: "m-second"),
            Evt("C", date: "2026-05-01", winnerMovieId: "m-third"));
        WinnerMoviesAre(Mov("m-first", tmdbId: 10), Mov("m-second", tmdbId: 10), Mov("m-third", tmdbId: 10));
        RatedAtNights(("p0", "m-first", 4), ("p1", "m-second", 8));

        var res = await handler.HandleForUserAsync("u1", 6);

        var item = Assert.Single(res.Items);
        Assert.Equal((NightStart("2026-05-01"), (int?)8), (item.WatchedAt, item.MyRating));
        Assert.Equal(1, res.Total);
    }

    [Fact]
    public async Task NoNightAtAll_StillListsTheTitlesWatchedElsewhere()
    {
        var handler = Build();
        await WatchElsewhereAsync(20, new DateTimeOffset(2026, 3, 1, 12, 0, 0, TimeSpan.Zero));
        await WatchElsewhereAsync(30, new DateTimeOffset(2026, 4, 1, 12, 0, 0, TimeSpan.Zero));

        var res = await handler.HandleForUserAsync("u1", 1);

        var item = Assert.Single(res.Items);
        Assert.Equal((30, WatchedSource.Elsewhere), (item.TmdbId, item.Source));
        Assert.Equal(2, res.Total);
    }

    [Fact]
    public async Task Total_IsZero_WhenNothingWasWatched()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());

        Assert.Equal(0, (await handler.HandleAsync("alice", null, 6)).Total);
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", winnerMovieId: null) });
        Assert.Equal(0, (await handler.HandleAsync("alice", null, 6)).Total);
    }

    [Fact]
    public async Task ThePublicProfile_ListsOnlyTheFilmsWatchedAtANight_AndCountsOnlyThem()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(PublicUser());
        ParticipatesIn(
            Evt("A", date: "2026-01-01", winnerMovieId: "m-night"),
            Evt("B", date: "2026-02-01", winnerMovieId: "m-both"));
        WinnerMoviesAre(Mov("m-night", tmdbId: 10), Mov("m-both", tmdbId: 11));
        await WatchElsewhereAsync(11, new DateTimeOffset(2026, 5, 1, 12, 0, 0, TimeSpan.Zero));
        await WatchElsewhereAsync(20, new DateTimeOffset(2026, 6, 1, 12, 0, 0, TimeSpan.Zero));

        var res = await handler.HandleAsync("alice", null, 6);

        Assert.Equal([(11, WatchedSource.Night), (10, WatchedSource.Night)], res.Items.Select(i => (i.TmdbId, i.Source)));
        Assert.Equal(2, res.Total);
    }

    [Fact]
    public async Task TheNightsOfAMember_LeaveOutTheTitlesWatchedElsewhere()
    {
        var handler = Build();
        ParticipatesIn(Evt("A", date: "2026-01-01", winnerMovieId: "m-night"));
        WinnerMoviesAre(Mov("m-night", tmdbId: 10));
        await WatchElsewhereAsync(20, new DateTimeOffset(2026, 3, 1, 12, 0, 0, TimeSpan.Zero));

        var res = await handler.HandleNightsForUserAsync("u1", 6);

        Assert.Equal(10, Assert.Single(res.Items).TmdbId);
        Assert.Equal(1, res.Total);
    }

    [Fact]
    public async Task HandleForUser_PrivateProfile_StillReturnsWatchedMovies()
    {
        var handler = Build();
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Part("p1", "A") });
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Evt("A", winnerMovieId: "m1") });
        _movies.Setup(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Mov("m1", tmdbId: 27_205) });

        var res = await handler.HandleForUserAsync("u1", 1);

        Assert.Equal(27_205, Assert.Single(res.Items).TmdbId);
        _users.Verify(
            r => r.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
