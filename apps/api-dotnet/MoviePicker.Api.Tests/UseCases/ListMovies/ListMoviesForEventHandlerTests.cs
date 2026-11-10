using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMovies;

public sealed class ListMoviesForEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo;
    private readonly Mock<IMovieRatingRepository> _ratingRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<ITmdbMovieSearch> _tmdb;
    private readonly Mock<IPosterImageStore> _posterStore;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly ListMoviesForEventHandler _sut;
    private static readonly string[] ParticipantIds = new[] { "p2", "p3" };
    private static readonly string[] expected = new[] { "Bob", "Chloé" };
    private static readonly int[] GenreIds = new[] { 28, 878 };

    private static Event ActiveEvent() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public ListMoviesForEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _seenMarkRepo = new Mock<ISeenMarkRepository>();
        _ratingRepo = new Mock<IMovieRatingRepository>();
        _userRepo = new Mock<IUserRepository>();
        _tmdb = new Mock<ITmdbMovieSearch>();
        _posterStore = new Mock<IPosterImageStore>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _seenMarkRepo
            .Setup(r => r.AggregateByMovieIdsAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, SeenMarkAggregate>());
        _voteRepo
            .Setup(r => r.AggregateSummariesByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, MovieVoteSummary>());
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Participant>());
        _ratingRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MovieRating>());
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<UserCard>)[]);
        var opts = Options.Create(new MoviePickerOptions { TmdbApiKey = null });
        _sut = new ListMoviesForEventHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _participantRepo.Object,
            _seenMarkRepo.Object,
            _ratingRepo.Object,
            _userRepo.Object,
            _tmdb.Object,
            _posterStore.Object,
            _currentUser.Object,
            opts);
    }

    private ListMoviesForEventHandler SutWithTmdbKey() =>
        new(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _participantRepo.Object,
            _seenMarkRepo.Object,
            _ratingRepo.Object,
            _userRepo.Object,
            _tmdb.Object,
            _posterStore.Object,
            _currentUser.Object,
            Options.Create(new MoviePickerOptions { TmdbApiKey = "k", TmdbWatchProvidersRegion = "FR" }));

    private void GivenParticipants(params (string Id, string Pseudo)[] participants) =>
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(participants.Select(p => new Participant { Id = p.Id, EventId = "evt1", Pseudo = p.Pseudo }).ToList());

    private void GivenEnrichments(params ((int TmdbId, MovieMediaType MediaType) Key, TmdbMovieEnrichment? Enrichment)[] rows) =>
        _tmdb
            .Setup(t => t.GetEnrichmentsAsync(It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(), "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(rows.ToDictionary(row => row.Key, row => row.Enrichment));

    private void GivenSelectionOf(params Movie[] stored)
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _movieRepo
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) => stored.Where(m => ids.Contains(m.Id)).ToList());
        _voteRepo
            .Setup(r => r.AggregateSummariesByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, MovieVoteSummary>());
        GivenParticipants();
    }

    private static Movie StoredMovie(string id, int tmdbId, string eventId = "evt1") => new()
    {
        Id = id,
        EventId = eventId,
        ParticipantId = "p1",
        TmdbId = tmdbId,
        MediaType = MovieMediaType.Movie,
        Title = id,
        Year = "2000"
    };

    [Fact]
    public async Task HandleSelectionAsync_EnrichesTheSelectedMoviesAndNoneOfTheOthers()
    {
        GivenSelectionOf(StoredMovie("m1", 101), StoredMovie("m2", 102), StoredMovie("m3", 103));
        GivenEnrichments(((101, MovieMediaType.Movie), new TmdbMovieEnrichment(null, [], null, 118)));

        var movies = await SutWithTmdbKey().HandleSelectionAsync("soiree", ["m1"]);

        var movie = Assert.Single(movies);
        Assert.Equal("m1", movie.Id);
        Assert.Equal(118, movie.RuntimeMinutes);
        var selectedKey = (101, MovieMediaType.Movie);
        _tmdb.Verify(
            t => t.GetEnrichmentsAsync(
                It.Is<IReadOnlyCollection<(int, MovieMediaType)>>(keys => keys.Count == 1 && keys.Contains(selectedKey)),
                "FR",
                It.IsAny<CancellationToken>()),
            Times.Once);
        _movieRepo.Verify(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleSelectionAsync_MovieOfAnotherEvent_IsLeftOut()
    {
        GivenSelectionOf(StoredMovie("m1", 101), StoredMovie("foreign", 102, eventId: "evt2"));

        var movies = await _sut.HandleSelectionAsync("soiree", ["m1", "foreign"]);

        Assert.Equal("m1", Assert.Single(movies).Id);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_Success_ReturnsMoviesWithScoresAndPseudos()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", GenreIds = GenreIds, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Film B", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        var votes = new Dictionary<string, MovieVoteSummary>
        {
            ["mov1"] = new(2, 3, 1, []),
            ["mov2"] = new(-1, 0, 1, [])
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _voteRepo.Setup(r => r.AggregateSummariesByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(votes);
        GivenParticipants(("p1", "Alice"), ("p2", "Bob"));

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(2, result.Count);
        var a = result.First(m => m.Id == "mov1");
        Assert.Equal("Film A", a.Title);
        Assert.Equal("Alice", a.ProposerPseudo);
        Assert.Equal(2, a.Score);
        Assert.Equal(3, a.Up);
        Assert.Equal(1, a.Down);
        Assert.Equal(GenreIds, a.GenreIds);
        var b = result.First(m => m.Id == "mov2");
        Assert.Equal("Film B", b.Title);
        Assert.Equal("Bob", b.ProposerPseudo);
        Assert.Equal(-1, b.Score);
        Assert.Empty(b.GenreIds);
        Assert.Equal(0, a.SeenCount);
        Assert.Empty(a.SeenByPseudos);
        Assert.Empty(a.VotersUpPseudos);
        Assert.Equal(0, b.SeenCount);
        Assert.Empty(b.SeenByPseudos);
        Assert.Empty(b.VotersUpPseudos);
    }

    [Fact]
    public async Task HandleAsync_ResolvesPseudosFromTheParticipantsAndVotesFromOneAggregate()
    {
        var evt = ActiveEvent();
        var now = DateTimeOffset.UtcNow;
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "A", Year = "2020", CreatedAt = now, UpdatedAt = now }
        ]);
        GivenParticipants(("p1", "Alice"));

        await _sut.HandleAsync("evt1");

        _voteRepo.Verify(
            r => r.AggregateSummariesByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _voteRepo.Verify(
            r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _participantRepo.Verify(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ParticipantRemovedSinceItsMovie_ListsTheMovieWithoutAPseudo()
    {
        var evt = ActiveEvent();
        var now = DateTimeOffset.UtcNow;
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "gone", TmdbId = 1, Title = "A", Year = "2020", CreatedAt = now, UpdatedAt = now }
        ]);
        _voteRepo
            .Setup(r => r.AggregateSummariesByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, MovieVoteSummary> { ["mov1"] = new(1, 1, 0, ["gone"]) });

        var movie = Assert.Single(await _sut.HandleAsync("evt1"));

        Assert.Equal(string.Empty, movie.ProposerPseudo);
        Assert.Equal(1, movie.Up);
        Assert.Empty(movie.VotersUpPseudos);
    }

    [Fact]
    public async Task HandleAsync_AggregatesSeenMarksAndResolvesPseudos()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };

        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _seenMarkRepo
            .Setup(r => r.AggregateByMovieIdsAsync(evt.Id, It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, SeenMarkAggregate>
            {
                ["mov1"] = new SeenMarkAggregate(2, ParticipantIds)
            });
        GivenParticipants(("p1", "Alice"), ("p2", "Bob"), ("p3", "Chloé"));

        var result = await _sut.HandleAsync("evt1");

        var m = Assert.Single(result);
        Assert.Equal(2, m.SeenCount);
        Assert.Equal(expected, m.SeenByPseudos);
    }

    [Fact]
    public async Task HandleAsync_AggregatesUpVotersAndResolvesPseudos()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p1", TmdbId = 2, Title = "Film B", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };

        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _voteRepo
            .Setup(r => r.AggregateSummariesByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, MovieVoteSummary> { ["mov1"] = new(2, 2, 0, ParticipantIds) });
        GivenParticipants(("p1", "Alice"), ("p2", "Bob"), ("p3", "Chloé"));

        var result = await _sut.HandleAsync("evt1");

        var a = result.First(m => m.Id == "mov1");
        Assert.Equal(expected, a.VotersUpPseudos);
        var b = result.First(m => m.Id == "mov2");
        Assert.Empty(b.VotersUpPseudos);
    }

    [Fact]
    public async Task HandleAsync_WithoutParticipantId_DoesNotExposeMyVote()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);

        var result = await _sut.HandleAsync("evt1");

        var m = Assert.Single(result);
        Assert.Null(m.MyVote);
        _voteRepo.Verify(
            r => r.GetParticipantVotesByEventAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WithOwnParticipantId_PopulatesMyVotePerMovie()
    {
        var evt = ActiveEvent();
        _currentUser.Setup(a => a.GetUserId()).Returns("user-me");
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new Participant { Id = "me", EventId = evt.Id, Pseudo = "Moi", UserId = "user-me" } });
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "B", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov3", EventId = evt.Id, ParticipantId = "p3", TmdbId = 3, Title = "C", Year = "2022", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _voteRepo
            .Setup(r => r.GetParticipantVotesByEventAsync(evt.Id, "me", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["mov1"] = 1, ["mov3"] = -1 });

        var result = await _sut.HandleAsync("evt1", "me");

        Assert.Equal(1, result.First(m => m.Id == "mov1").MyVote);
        Assert.Null(result.First(m => m.Id == "mov2").MyVote);
        Assert.Equal(-1, result.First(m => m.Id == "mov3").MyVote);
    }

    [Theory]
    [InlineData(null, "user-other")]
    [InlineData("user-me", "user-other")]
    [InlineData("user-me", null)]
    public async Task HandleAsync_WithSomeoneElsesParticipantId_KeepsTheirVotesPrivate(string? callerUserId, string? participantUserId)
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new Participant { Id = "p1", EventId = evt.Id, Pseudo = "Alice", UserId = participantUserId } });
        _currentUser.Setup(a => a.GetUserId()).Returns(callerUserId);
        _voteRepo
            .Setup(r => r.GetParticipantVotesByEventAsync(evt.Id, "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["mov1"] = 1 });

        var result = await _sut.HandleAsync("evt1", "p1");

        Assert.Null(Assert.Single(result).MyVote);
        _voteRepo.Verify(
            r => r.GetParticipantVotesByEventAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AttachesTheRatingsOfEachMovie()
    {
        var evt = ActiveEvent() with { Winners = TestWinners.Won("mov1") };
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Film B", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        var updatedAt = new DateTimeOffset(2026, 6, 2, 9, 0, 0, TimeSpan.Zero);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _ratingRepo
            .Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new() { Id = "r1", EventId = evt.Id, MovieId = "mov1", ParticipantId = "p1", Value = 7, CreatedAt = updatedAt, UpdatedAt = updatedAt },
                new() { Id = "r2", EventId = evt.Id, MovieId = "mov1", ParticipantId = "p2", Value = 9, CreatedAt = updatedAt, UpdatedAt = updatedAt }
            ]);

        var result = await _sut.HandleAsync("evt1");

        var a = result.First(m => m.Id == "mov1");
        Assert.Collection(
            a.Ratings,
            r => { Assert.Equal("p1", r.ParticipantId); Assert.Equal(7, r.Value); Assert.Equal(updatedAt, r.UpdatedAt); },
            r => { Assert.Equal("p2", r.ParticipantId); Assert.Equal(9, r.Value); });
        Assert.Empty(result.First(m => m.Id == "mov2").Ratings);
    }

    [Fact]
    public async Task HandleAsync_NoWinnerDrawnYet_DoesNotLookForRatings()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);

        var result = await _sut.HandleAsync("evt1");

        Assert.Empty(Assert.Single(result).Ratings);
        _ratingRepo.Verify(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NoMovies_ReturnsEmptyList()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var result = await _sut.HandleAsync("evt1");

        Assert.Empty(result);
    }

    [Fact]
    public async Task HandleAsync_WithTmdbKey_EnrichesFromTheBatchRead()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new()
            {
                Id = "mov1",
                EventId = evt.Id,
                ParticipantId = "p1",
                TmdbId = 42,
                Title = "Film A",
                Year = "2020",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            }
        };
        var offers = new[]
        {
            new TmdbWatchProviderOffer(8, "Netflix", "https://image.tmdb.org/t/p/w45/x.png", "flatrate"),
        };
        var enrichment = new TmdbMovieEnrichment(7.2, offers, "https://www.themoviedb.org/movie/42/watch", 148);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        GivenEnrichments(((42, MovieMediaType.Movie), enrichment));

        var result = await SutWithTmdbKey().HandleAsync("evt1");

        var m = Assert.Single(result);
        Assert.Equal(7.2, m.VoteAverage);
        Assert.Equal(148, m.RuntimeMinutes);
        Assert.Equal("https://www.themoviedb.org/movie/42/watch", m.TmdbWatchPageUrl);
        var p = Assert.Single(m.WatchProviders);
        Assert.Equal(8, p.ProviderId);
        Assert.Equal("Netflix", p.Name);
        Assert.Equal("flatrate", p.Type);
        _tmdb.Verify(
            t => t.GetEnrichmentAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_MovieBeyondTheFetchBudget_StaysListedWithoutItsEnrichment()
    {
        var evt = ActiveEvent();
        var now = DateTimeOffset.UtcNow;
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Within", Year = "2020", CreatedAt = now, UpdatedAt = now },
            new Movie { Id = "mov2", EventId = evt.Id, ParticipantId = "p1", TmdbId = 2, Title = "Beyond", Year = "2021", CreatedAt = now, UpdatedAt = now }
        ]);
        GivenEnrichments(((1, MovieMediaType.Movie), new TmdbMovieEnrichment(7.2, [], null, 148)));

        var result = await SutWithTmdbKey().HandleAsync("evt1");

        Assert.Equal(2, result.Count);
        Assert.Equal(148, result.First(m => m.TmdbId == 1).RuntimeMinutes);
        var beyond = result.First(m => m.TmdbId == 2);
        Assert.Equal("Beyond", beyond.Title);
        Assert.Null(beyond.RuntimeMinutes);
        Assert.Null(beyond.VoteAverage);
        Assert.Empty(beyond.WatchProviders);
    }

    [Fact]
    public async Task HandleAsync_ProposerWithAPublicProfile_ShowsItsHandleFromTheUserCard()
    {
        var evt = ActiveEvent();
        var now = DateTimeOffset.UtcNow;
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = now, UpdatedAt = now }
        ]);
        _participantRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new Participant { Id = "p1", EventId = evt.Id, Pseudo = "Alice", UserId = "u1", CreatedAt = now, UpdatedAt = now }
        ]);
        _userRepo
            .Setup(r => r.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<UserCard>)[new UserCard("u1", "avatar-1", "alice", IsProfilePublic: true)]);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("alice", Assert.Single(result).ProposerHandle);
        _userRepo.Verify(
            r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
