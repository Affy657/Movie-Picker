using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UserMovies;

public sealed class GetMyNightMoviesHandlerTests
{
    private const string Me = "user-me";
    private const string Friend = "user-friend";
    private const string Stranger = "user-stranger";
    private const int Inception = 27_205;
    private const int Matrix = 603;

    private static readonly DateTimeOffset Now = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);

    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly InMemoryMovieRepository _movies = new();
    private readonly InMemoryMovieRatingRepository _ratings = new();
    private readonly InMemoryWatchedTitleRepository _watchedTitles = new();
    private readonly InMemoryUserRepository _users = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();

    public GetMyNightMoviesHandlerTests()
    {
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CatalogLanguage>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>());
    }

    private GetMyNightMoviesHandler CreateSut()
    {
        var clock = new FixedClock(Now);
        var history = new WatchedHistoryReader(_participants, _events, _movies, _ratings, _watchedTitles, clock);
        return new GetMyNightMoviesHandler(
            _events,
            _participants,
            _movies,
            _users,
            history,
            _tmdb.Object,
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private async Task<Event> NightAsync(string title, string? creatorUserId, string date = "2026-10-01") =>
        await _events.AddAsync(new Event
        {
            Title = title,
            Slug = "slug-" + Guid.NewGuid().ToString("N")[..10],
            HostToken = "host",
            Date = date,
            Time = "20:30",
            CreatorUserId = creatorUserId,
            CreatedAt = Now.AddDays(-60),
            UpdatedAt = Now.AddDays(-60),
        });

    private async Task<Participant> JoinAsync(Event night, string pseudo, string? userId) =>
        await _participants.AddAsync(new Participant
        {
            EventId = night.Id,
            Pseudo = pseudo,
            UserId = userId,
            CreatedAt = Now.AddDays(-30),
            UpdatedAt = Now.AddDays(-30),
        });

    private async Task<Movie> ProposeAsync(
        Event night,
        Participant proposer,
        int tmdbId = Inception,
        int daysAgo = 30,
        MovieMediaType mediaType = MovieMediaType.Movie) =>
        await _movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = proposer.Id,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId}",
            Year = "2010",
            PosterPath = $"/p{tmdbId}.jpg",
            GenreIds = [878],
            CreatedAt = Now.AddDays(-daysAgo),
            UpdatedAt = Now.AddDays(-daysAgo),
        });

    private async Task WonByAsync(Event night, Movie winner) =>
        await _events.UpdateAsync(night with { Winners = TestWinners.Won(winner.Id) });

    [Fact]
    public async Task HandleAsync_NoNights_AnswersAnEmptyList()
    {
        var foreign = await NightAsync("Étrangère", Stranger);
        await ProposeAsync(foreign, await JoinAsync(foreign, "Inconnu", Stranger));

        var result = await CreateSut().HandleAsync(Me);

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_ListsTheFilmsOfTheNightsICreatedOrJoined_WhoeverProposedThem()
    {
        var created = await NightAsync("Créée", Me);
        var joined = await NightAsync("Rejointe", Friend);
        var foreign = await NightAsync("Étrangère", Stranger);
        await ProposeAsync(created, await JoinAsync(created, "Ami", Friend), tmdbId: Inception);
        await JoinAsync(joined, "Moi", Me);
        await ProposeAsync(joined, await JoinAsync(joined, "Ami", Friend), tmdbId: Matrix);
        await ProposeAsync(foreign, await JoinAsync(foreign, "Inconnu", Stranger), tmdbId: 680);

        var result = await CreateSut().HandleAsync(Me);

        Assert.Equal([Matrix, Inception], result.Items.Select(item => item.TmdbId).Order());
    }

    [Fact]
    public async Task HandleAsync_FilmProposedInSeveralNights_AppearsOnce_WithItsLatestProposal()
    {
        var first = await NightAsync("Première", Me);
        var second = await NightAsync("Seconde", Friend);
        await ProposeAsync(first, await JoinAsync(first, "Moi", Me), daysAgo: 40);
        await JoinAsync(second, "Moi", Me);
        var latest = await ProposeAsync(second, await JoinAsync(second, "Ami", Friend), daysAgo: 5);

        var item = Assert.Single((await CreateSut().HandleAsync(Me)).Items);

        Assert.Equal(Inception, item.TmdbId);
        Assert.Equal(latest.CreatedAt, item.LastProposedAt);
        Assert.Equal("Ami", item.LastProposer?.Pseudo);
        Assert.False(item.LastProposer?.IsMe);
    }

    [Fact]
    public async Task HandleAsync_LatestProposalInAnAnonymousNight_NamesNobodyButMe()
    {
        var byFriend = await NightAsync("Anonyme", Friend);
        await _events.UpdateAsync((await _events.GetByIdOrSlugAsync(byFriend.Slug))! with { Config = new EventConfig { AnonymousProposals = true } });
        await JoinAsync(byFriend, "Moi", Me);
        await ProposeAsync(byFriend, await JoinAsync(byFriend, "Ami", Friend), daysAgo: 5);
        var mine = await NightAsync("Anonyme aussi", Friend);
        await _events.UpdateAsync((await _events.GetByIdOrSlugAsync(mine.Slug))! with { Config = new EventConfig { AnonymousProposals = true } });
        await ProposeAsync(mine, await JoinAsync(mine, "Moi", Me), tmdbId: Matrix, daysAgo: 3);

        var items = (await CreateSut().HandleAsync(Me)).Items;

        Assert.Null(items.Single(item => item.TmdbId == Inception).LastProposer);
        Assert.True(items.Single(item => item.TmdbId == Matrix).LastProposer?.IsMe);
    }

    [Fact]
    public async Task HandleAsync_FilmsOfAnAnonymousNight_AreDatedFromTheNightNotFromTheirProposal()
    {
        var night = await NightAsync("Anonyme", Friend);
        night = await _events.UpdateAsync(night with { Config = new EventConfig { AnonymousProposals = true } });
        await JoinAsync(night, "Moi", Me);
        var friend = await JoinAsync(night, "Ami", Friend);
        await ProposeAsync(night, friend, tmdbId: Inception, daysAgo: 20);
        await ProposeAsync(night, friend, tmdbId: Matrix, daysAgo: 2);
        await ProposeAsync(night, friend, tmdbId: 680, daysAgo: 10);

        var items = (await CreateSut().HandleAsync(Me)).Items;

        Assert.Equal(3, items.Count);
        Assert.All(items, item => Assert.Equal(night.CreatedAt, item.LastProposedAt));
    }

    [Fact]
    public async Task HandleAsync_SameIdButAnotherMediaType_IsAnotherTitle()
    {
        var night = await NightAsync("Séries et films", Me);
        var me = await JoinAsync(night, "Moi", Me);
        await ProposeAsync(night, me, mediaType: MovieMediaType.Movie);
        await ProposeAsync(night, me, mediaType: MovieMediaType.Tv);

        var result = await CreateSut().HandleAsync(Me);

        Assert.Equal(
            [MovieMediaType.Movie, MovieMediaType.Tv],
            result.Items.Select(item => item.MediaType).Order());
    }

    [Fact]
    public async Task HandleAsync_SortsTheLatestProposalFirst()
    {
        var night = await NightAsync("Soirée", Me);
        var me = await JoinAsync(night, "Moi", Me);
        await ProposeAsync(night, me, tmdbId: Inception, daysAgo: 20);
        await ProposeAsync(night, me, tmdbId: Matrix, daysAgo: 2);
        await ProposeAsync(night, me, tmdbId: 680, daysAgo: 10);

        var result = await CreateSut().HandleAsync(Me);

        Assert.Equal([Matrix, 680, Inception], result.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task HandleAsync_FlagsTheFilmsIProposedInAnyOfMyNights()
    {
        var first = await NightAsync("Première", Me);
        var second = await NightAsync("Seconde", Friend);
        await ProposeAsync(first, await JoinAsync(first, "Moi", Me), tmdbId: Inception, daysAgo: 40);
        await JoinAsync(second, "Moi", Me);
        var friend = await JoinAsync(second, "Ami", Friend);
        await ProposeAsync(second, friend, tmdbId: Inception, daysAgo: 5);
        await ProposeAsync(second, friend, tmdbId: Matrix, daysAgo: 4);

        var byId = (await CreateSut().HandleAsync(Me)).Items.ToDictionary(item => item.TmdbId);

        Assert.True(byId[Inception].ProposedByMe);
        Assert.False(byId[Matrix].ProposedByMe);
    }

    [Fact]
    public async Task HandleAsync_LastProposerIsMe_WhenMyProposalIsTheLatest()
    {
        var night = await NightAsync("Soirée", Me);
        await ProposeAsync(night, await JoinAsync(night, "Moi", Me));

        var item = Assert.Single((await CreateSut().HandleAsync(Me)).Items);

        Assert.True(item.LastProposer?.IsMe);
        Assert.Equal("Moi", item.LastProposer?.Pseudo);
    }

    [Fact]
    public async Task HandleAsync_LastProposerCarriesTheAvatarOfTheLinkedAccount()
    {
        await _users.AddAsync(new User { Id = Friend, Email = "friend@example.com", Handle = "ami", AvatarId = "fox" });
        var night = await NightAsync("Soirée", Me);
        await JoinAsync(night, "Moi", Me);
        await ProposeAsync(night, await JoinAsync(night, "Ami", Friend), tmdbId: Inception);
        await ProposeAsync(night, await JoinAsync(night, "Sans compte", null), tmdbId: Matrix);

        var byId = (await CreateSut().HandleAsync(Me)).Items.ToDictionary(item => item.TmdbId);

        Assert.Equal("fox", byId[Inception].LastProposer?.AvatarId);
        Assert.Null(byId[Matrix].LastProposer?.AvatarId);
        Assert.Equal("Sans compte", byId[Matrix].LastProposer?.Pseudo);
    }

    [Fact]
    public async Task HandleAsync_FlagsTheFilmsThatWonOneOfMyNights()
    {
        var night = await NightAsync("Soirée", Me);
        var me = await JoinAsync(night, "Moi", Me);
        var winner = await ProposeAsync(night, me, tmdbId: Inception);
        await ProposeAsync(night, me, tmdbId: Matrix);
        await WonByAsync(night, winner);

        var byId = (await CreateSut().HandleAsync(Me)).Items.ToDictionary(item => item.TmdbId);

        Assert.True(byId[Inception].IsWinner);
        Assert.False(byId[Matrix].IsWinner);
    }

    [Fact]
    public async Task HandleAsync_FlagsTheFilmsIAlreadyWatched()
    {
        var night = await NightAsync("Soirée", Me);
        var me = await JoinAsync(night, "Moi", Me);
        await ProposeAsync(night, me, tmdbId: Inception);
        await ProposeAsync(night, me, tmdbId: Matrix);
        await _watchedTitles.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = Me,
            TmdbId = Matrix,
            Title = "Matrix",
            WatchedAt = Now.AddDays(-3),
        });

        var byId = (await CreateSut().HandleAsync(Me)).Items.ToDictionary(item => item.TmdbId);

        Assert.True(byId[Matrix].IsWatched);
        Assert.False(byId[Inception].IsWatched);
    }

    [Fact]
    public async Task HandleAsync_CopiesTheTitleAndAddsTheTmdbFacts()
    {
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CatalogLanguage>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(Inception, MovieMediaType.Movie)] = new(8.4, [], null, 148),
            });
        var night = await NightAsync("Soirée", Me);
        await ProposeAsync(night, await JoinAsync(night, "Moi", Me));

        var item = Assert.Single((await CreateSut().HandleAsync(Me)).Items);

        Assert.Equal("Film 27205", item.Title);
        Assert.Equal("2010", item.Year);
        Assert.Equal("/p27205.jpg", item.PosterPath);
        Assert.Equal([878], item.GenreIds);
        Assert.Equal(8.4, item.VoteAverage);
        Assert.Equal(148, item.RuntimeMinutes);
    }

    [Fact]
    public async Task HandleAsync_ProposalLeftInADeletedNight_IsIgnored()
    {
        var kept = await NightAsync("Gardée", Me);
        var deleted = await NightAsync("Supprimée", Me);
        var me = await JoinAsync(kept, "Moi", Me);
        await ProposeAsync(kept, me, tmdbId: Inception);
        await ProposeAsync(deleted, await JoinAsync(deleted, "Moi", Me), tmdbId: Matrix);
        await _events.DeleteAsync(deleted.Id);

        var result = await CreateSut().HandleAsync(Me);

        Assert.Equal([Inception], result.Items.Select(item => item.TmdbId));
    }
}
