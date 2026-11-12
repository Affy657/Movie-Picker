using MoviePicker.Api.Application.UseCases.MovieNights;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.MovieNights;

public sealed class GetMovieNightsHandlerTests
{
    private const string Me = "user-me";
    private const string Friend = "user-friend";
    private const string Stranger = "user-stranger";
    private const int Inception = 27_205;

    private static readonly DateTimeOffset Now = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);

    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly InMemoryMovieRepository _movies = new();
    private readonly InMemoryMovieRatingRepository _ratings = new();
    private readonly InMemorySeenMarkRepository _seenMarks = new();
    private readonly InMemoryUserRepository _users = new();

    private GetMovieNightsHandler CreateSut() =>
        new(_events, _participants, _movies, _ratings, _seenMarks, _users, new FixedClock(Now));

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private async Task<Event> NightAsync(
        string title,
        string? creatorUserId,
        string date = "2026-10-01",
        DateTimeOffset? createdAt = null,
        DateTimeOffset? closedAt = null) =>
        await _events.AddAsync(new Event
        {
            Title = title,
            Slug = "slug-" + Guid.NewGuid().ToString("N")[..10],
            RecapSlug = "recap-" + Guid.NewGuid().ToString("N")[..10],
            HostToken = "host",
            Date = date,
            Time = "20:30",
            CreatorUserId = creatorUserId,
            ClosedAt = closedAt,
            CreatedAt = createdAt ?? Now.AddDays(-60),
            UpdatedAt = createdAt ?? Now.AddDays(-60),
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

    private async Task<Movie> ProposeAsync(Event night, Participant proposer, int tmdbId = Inception, MovieMediaType mediaType = MovieMediaType.Movie) =>
        await _movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = proposer.Id,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId} {mediaType}",
            Year = "2010",
            CreatedAt = Now.AddDays(-30),
            UpdatedAt = Now.AddDays(-30),
        });

    private async Task<Event> WonByAsync(Event night, Movie winner) =>
        await _events.UpdateAsync(night with { Winners = TestWinners.Won(winner.Id) });

    private Task<SeenMark> SeenAsync(Movie movie, Participant participant) =>
        _seenMarks.AddAsync(new SeenMark { EventId = movie.EventId, MovieId = movie.Id, ParticipantId = participant.Id });

    private Task<MovieRating> RateAsync(Movie movie, Participant participant, int value) =>
        _ratings.UpsertAsync(new MovieRating { EventId = movie.EventId, MovieId = movie.Id, ParticipantId = participant.Id, Value = value });

    [Fact]
    public async Task HandleAsync_FilmNeverProposedInMyNights_AnswersAnEmptySummary()
    {
        var mine = await NightAsync("Ma soirée", Me);
        await ProposeAsync(mine, await JoinAsync(mine, "Moi", Me), tmdbId: 603);

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.Empty(result.Nights);
        Assert.Equal(0, result.ProposalCount);
        Assert.Equal(0, result.WinCount);
        Assert.Null(result.Rating);
        Assert.Empty(result.SeenBy);
        Assert.Equal(0, result.SeenCount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-4)]
    public async Task HandleAsync_InvalidTmdbId_AnswersAnEmptySummary(int tmdbId)
    {
        var mine = await NightAsync("Ma soirée", Me);
        await ProposeAsync(mine, await JoinAsync(mine, "Moi", Me), tmdbId: tmdbId);

        var result = await CreateSut().HandleAsync(Me, tmdbId, MovieMediaType.Movie);

        Assert.Empty(result.Nights);
        Assert.Equal(0, result.ProposalCount);
    }

    [Fact]
    public async Task HandleAsync_ListsTheNightsICreatedOrJoined_MostRecentFirst()
    {
        var created = await NightAsync("Créée", Me, date: "2026-10-01");
        var joined = await NightAsync("Rejointe", Friend, date: "2026-11-01");
        var foreign = await NightAsync("Étrangère", Stranger, date: "2026-11-05");
        await ProposeAsync(created, await JoinAsync(created, "Moi", Me));
        await JoinAsync(joined, "Moi aussi", Me);
        await ProposeAsync(joined, await JoinAsync(joined, "Ami", Friend));
        await ProposeAsync(foreign, await JoinAsync(foreign, "Inconnu", Stranger));

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.Equal(["Rejointe", "Créée"], result.Nights.Select(night => night.Title));
        Assert.Equal(joined.Slug, result.Nights[0].Slug);
        Assert.Equal("2026-11-01", result.Nights[0].Date);
        Assert.Equal("Ami", result.Nights[0].ProposerPseudo);
        Assert.Equal("Moi", result.Nights[1].ProposerPseudo);
        Assert.Equal(2, result.ProposalCount);
    }

    [Fact]
    public async Task HandleAsync_NightWithoutADate_HasNoDateAndSortsByItsCreation()
    {
        var dated = await NightAsync("Datée", Me, date: "2026-09-01");
        var undated = await NightAsync("Sans date", Me, date: string.Empty, createdAt: Now.AddDays(-2));
        await ProposeAsync(dated, await JoinAsync(dated, "Moi", Me));
        await ProposeAsync(undated, await JoinAsync(undated, "Moi", Me));

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.Equal(["Sans date", "Datée"], result.Nights.Select(night => night.Title));
        Assert.Null(result.Nights[0].Date);
    }

    [Fact]
    public async Task HandleAsync_CountsProposalsAndWinsOverEveryNight_ButListsTheTenLatest()
    {
        for (var day = 1; day <= 12; day++)
        {
            var night = await NightAsync($"Soirée {day}", Me, date: $"2026-08-{day:00}");
            var film = await ProposeAsync(night, await JoinAsync(night, "Moi", Me));
            if (day <= 3)
                await WonByAsync(night, film);
        }

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.Equal(10, result.Nights.Count);
        Assert.Equal("Soirée 12", result.Nights[0].Title);
        Assert.Equal("Soirée 3", result.Nights[^1].Title);
        Assert.Equal(12, result.ProposalCount);
        Assert.Equal(3, result.WinCount);
        Assert.True(result.Nights[^1].IsWinner);
        Assert.False(result.Nights[0].IsWinner);
    }

    [Fact]
    public async Task HandleAsync_FinishedNightWonByTheFilm_LinksItsRecap()
    {
        var won = await NightAsync("Gagnée", Me, date: "2026-10-01", closedAt: Now.AddDays(-40));
        var lost = await NightAsync("Perdue", Me, date: "2026-10-02", closedAt: Now.AddDays(-39));
        var upcoming = await NightAsync("À venir", Me, date: "2026-12-24");
        var me = await JoinAsync(won, "Moi", Me);
        won = await WonByAsync(won, await ProposeAsync(won, me));
        var lostMe = await JoinAsync(lost, "Moi", Me);
        await ProposeAsync(lost, lostMe);
        await WonByAsync(lost, await ProposeAsync(lost, lostMe, tmdbId: 603));
        await ProposeAsync(upcoming, await JoinAsync(upcoming, "Moi", Me));

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        var byTitle = result.Nights.ToDictionary(night => night.Title);
        Assert.True(byTitle["Gagnée"].IsWinner);
        Assert.True(byTitle["Gagnée"].IsFinished);
        Assert.Equal(won.RecapSlug, byTitle["Gagnée"].RecapSlug);
        Assert.False(byTitle["Perdue"].IsWinner);
        Assert.True(byTitle["Perdue"].IsFinished);
        Assert.Equal(lost.RecapSlug, byTitle["Perdue"].RecapSlug);
        Assert.False(byTitle["À venir"].IsFinished);
        Assert.Null(byTitle["À venir"].RecapSlug);
        Assert.Equal(1, result.WinCount);
    }

    [Fact]
    public async Task HandleAsync_FinishedNightWithoutAWinner_HasNoRecapYet()
    {
        var night = await NightAsync("Sans gagnant", Me, date: "2026-10-01", closedAt: Now.AddDays(-40));
        await ProposeAsync(night, await JoinAsync(night, "Moi", Me));

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        var listed = Assert.Single(result.Nights);
        Assert.True(listed.IsFinished);
        Assert.Null(listed.RecapSlug);
    }

    [Fact]
    public async Task HandleAsync_AveragesTheRatingsOfThatFilmOnly_RoundedToOneDecimal()
    {
        var first = await NightAsync("Une", Me, closedAt: Now.AddDays(-40));
        var second = await NightAsync("Deux", Me, date: "2026-10-02", closedAt: Now.AddDays(-39));
        var me = await JoinAsync(first, "Moi", Me);
        var friend = await JoinAsync(first, "Ami", Friend);
        var film = await ProposeAsync(first, me);
        var other = await ProposeAsync(first, me, tmdbId: 603);
        var meAgain = await JoinAsync(second, "Moi", Me);
        var filmAgain = await ProposeAsync(second, meAgain);
        await RateAsync(film, me, 7);
        await RateAsync(film, friend, 8);
        await RateAsync(other, friend, 1);
        await RateAsync(filmAgain, meAgain, 8);

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.NotNull(result.Rating);
        Assert.Equal(7.7, result.Rating!.Average);
        Assert.Equal(3, result.Rating.Count);
    }

    [Fact]
    public async Task HandleAsync_ListsWhoSawTheFilm_OncePerPerson()
    {
        var friendCard = await _users.AddAsync(new User { Id = Friend, Email = "friend@example.com", Handle = "ami", AvatarId = "fox" });
        var first = await NightAsync("Une", Me);
        var second = await NightAsync("Deux", Me, date: "2026-10-02");
        var me = await JoinAsync(first, "Moi", Me);
        var friend = await JoinAsync(first, "Ami", Friend);
        var guest = await JoinAsync(first, "Zoé", null);
        var unrelated = await JoinAsync(first, "Distrait", null);
        var film = await ProposeAsync(first, me);
        var other = await ProposeAsync(first, me, tmdbId: 603);
        var friendAgain = await JoinAsync(second, "Ami bis", Friend);
        var guestAgain = await JoinAsync(second, "Zoé", null);
        var filmAgain = await ProposeAsync(second, friendAgain);
        await SeenAsync(film, friend);
        await SeenAsync(film, guest);
        await SeenAsync(other, unrelated);
        await SeenAsync(filmAgain, friendAgain);
        await SeenAsync(filmAgain, guestAgain);

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.Equal(2, result.SeenCount);
        Assert.Equal(2, result.SeenBy.Count);
        var ami = Assert.Single(result.SeenBy, viewer => viewer.Pseudo.StartsWith("Ami", StringComparison.Ordinal));
        Assert.Equal(friendCard.AvatarId, ami.AvatarId);
        var zoe = Assert.Single(result.SeenBy, viewer => viewer.Pseudo == "Zoé");
        Assert.Null(zoe.AvatarId);
    }

    [Fact]
    public async Task HandleAsync_ManyViewers_ShowsEightButCountsThemAll()
    {
        var night = await NightAsync("Nombreuse", Me);
        var film = await ProposeAsync(night, await JoinAsync(night, "Moi", Me));
        for (var i = 0; i < 11; i++)
            await SeenAsync(film, await JoinAsync(night, $"Invité {i}", null));

        var result = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);

        Assert.Equal(8, result.SeenBy.Count);
        Assert.Equal(11, result.SeenCount);
    }

    [Fact]
    public async Task HandleAsync_SeriesSharingTheFilmId_IsCountedApart()
    {
        var night = await NightAsync("Mixte", Me);
        var me = await JoinAsync(night, "Moi", Me);
        await ProposeAsync(night, me);
        var series = await ProposeAsync(night, me, mediaType: MovieMediaType.Tv);
        await WonByAsync(night, series);

        var asFilm = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Movie);
        var asSeries = await CreateSut().HandleAsync(Me, Inception, MovieMediaType.Tv);

        Assert.Equal(0, asFilm.WinCount);
        Assert.False(Assert.Single(asFilm.Nights).IsWinner);
        Assert.Equal(1, asSeries.WinCount);
        Assert.True(Assert.Single(asSeries.Nights).IsWinner);
    }
}
