using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMovies;

public sealed class ListMoviesForEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo;
    private readonly Mock<ITmdbMovieSearch> _tmdb;
    private readonly Mock<IPosterImageStore> _posterStore;
    private readonly ListMoviesForEventHandler _sut;

    private static Event ActiveEvent() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
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
        _tmdb = new Mock<ITmdbMovieSearch>();
        _posterStore = new Mock<IPosterImageStore>();
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _posterStore.Setup(s => s.RegisterTmdbSourceAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _posterStore
            .Setup(s => s.RegisterTmdbSourcesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _seenMarkRepo
            .Setup(r => r.AggregateByMovieIdsAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, SeenMarkAggregate>());
        var opts = Options.Create(new MoviePickerOptions { TmdbApiKey = null });
        _sut = new ListMoviesForEventHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _participantRepo.Object,
            _seenMarkRepo.Object,
            _tmdb.Object,
            _posterStore.Object,
            opts);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_ReturnsMoviesWithScoresAndPseudos()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Film B", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        var scores = new Dictionary<string, VoteScoreAggregate>
        {
            ["mov1"] = new(2, 3, 1),
            ["mov2"] = new(-1, 0, 1)
        };
        var pseudos = new Dictionary<string, string> { ["p1"] = "Alice", ["p2"] = "Bob" };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _voteRepo.Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(scores);
        _participantRepo.Setup(r => r.GetPseudosByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(pseudos);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal(2, result.Count);
        var a = result.First(m => m.Id == "mov1");
        Assert.Equal("Film A", a.Title);
        Assert.Equal("Alice", a.ProposerPseudo);
        Assert.Equal(2, a.Score);
        Assert.Equal(3, a.Up);
        Assert.Equal(1, a.Down);
        var b = result.First(m => m.Id == "mov2");
        Assert.Equal("Film B", b.Title);
        Assert.Equal("Bob", b.ProposerPseudo);
        Assert.Equal(-1, b.Score);
        Assert.Equal(0, a.SeenCount);
        Assert.Empty(a.SeenByPseudos);
        Assert.Equal(0, b.SeenCount);
        Assert.Empty(b.SeenByPseudos);
    }

    [Fact]
    public async Task HandleAsync_AggregatesSeenMarksAndResolvesPseudos()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Film A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        var pseudos = new Dictionary<string, string> { ["p1"] = "Alice", ["p2"] = "Bob", ["p3"] = "Chloé" };

        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _voteRepo
            .Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate> { ["mov1"] = new(0, 0, 0) });
        _seenMarkRepo
            .Setup(r => r.AggregateByMovieIdsAsync(evt.Id, It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, SeenMarkAggregate>
            {
                ["mov1"] = new SeenMarkAggregate(2, new[] { "p2", "p3" })
            });
        _participantRepo
            .Setup(r => r.GetPseudosByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(pseudos);

        var result = await _sut.HandleAsync("evt1");

        var m = Assert.Single(result);
        Assert.Equal(2, m.SeenCount);
        Assert.Equal(new[] { "Bob", "Chloé" }, m.SeenByPseudos);
    }

    [Fact]
    public async Task HandleAsync_NoMovies_ReturnsEmptyList()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(new List<Movie>());
        _voteRepo.Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new Dictionary<string, VoteScoreAggregate>());
        _participantRepo.Setup(r => r.GetPseudosByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new Dictionary<string, string>());

        var result = await _sut.HandleAsync("evt1");

        Assert.Empty(result);
    }

    [Fact]
    public async Task HandleAsync_WithTmdbKey_EnrichesFromGetEnrichmentAsync()
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
        _voteRepo.Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new Dictionary<string, VoteScoreAggregate> { ["mov1"] = new(0, 0, 0) });
        _participantRepo.Setup(r => r.GetPseudosByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new Dictionary<string, string> { ["p1"] = "Alice" });
        _tmdb
            .Setup(t => t.GetEnrichmentAsync(42, "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(enrichment);

        var sutWithKey = new ListMoviesForEventHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _participantRepo.Object,
            _seenMarkRepo.Object,
            _tmdb.Object,
            _posterStore.Object,
            Options.Create(
                new MoviePickerOptions
                {
                    TmdbApiKey = "k",
                    TmdbWatchProvidersRegion = "FR",
                }));

        var result = await sutWithKey.HandleAsync("evt1");

        var m = Assert.Single(result);
        Assert.Equal(7.2, m.VoteAverage);
        Assert.Equal(148, m.RuntimeMinutes);
        Assert.Equal("https://www.themoviedb.org/movie/42/watch", m.TmdbWatchPageUrl);
        var p = Assert.Single(m.WatchProviders);
        Assert.Equal(8, p.ProviderId);
        Assert.Equal("Netflix", p.Name);
        Assert.Equal("flatrate", p.Type);
    }
}
