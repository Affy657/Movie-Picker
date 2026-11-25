using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.UseCases.Watched;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdWatchlistSynchronizerTests
{
    private const string UserId = "u1";
    private const string Username = "cinephile";
    private static readonly int[] DramaMysteryGenreIds = [18, 9648];
    private static readonly int[] AnimationSciFiGenreIds = [16, 878];

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ILetterboxdWatchlistClient> _letterboxd = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IAddToWatchlistHandler> _addToWatchlist = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly InMemoryWatchedTitleRepository _watched = new();
    private readonly LetterboxdWatchlistSynchronizer _sut;

    public LetterboxdWatchlistSynchronizerTests()
    {
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(TheUser());
        _watchlist
            .Setup(w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        GivenWatchlist();
        _participants
            .Setup(p => p.ListDistinctEventIdsByUserIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<string>)[]);
        GivenWatchedOnLetterboxd(true);
        _sut = Synchronizer(_watchlist.Object, _watched, _addToWatchlist.Object);
    }

    private LetterboxdWatchlistSynchronizer Synchronizer(
        IWatchlistRepository watchlist,
        InMemoryWatchedTitleRepository watched,
        IAddToWatchlistHandler addToWatchlist,
        LetterboxdSyncBudget? budget = null) =>
        new(
            watchlist,
            watched,
            _letterboxd.Object,
            _tmdb.Object,
            addToWatchlist,
            _participants.Object,
            _events.Object,
            _movies.Object,
            WatchedSynchronizerFor(watchlist, watched),
            budget ?? LetterboxdSyncBudget.Within(RequestTimeoutPolicies.LongRunningBudget),
            NullLogger<LetterboxdWatchlistSynchronizer>.Instance);

    private LetterboxdWatchedSynchronizer WatchedSynchronizerFor(IWatchlistRepository watchlist, InMemoryWatchedTitleRepository watched)
    {
        var facts = new MovieListItemFactory(_posters.Object, _tmdb.Object, NullLogger<MovieListItemFactory>.Instance);
        return new LetterboxdWatchedSynchronizer(
            watched,
            _tmdb.Object,
            new LetterboxdWatchedWriter(watched, watchlist, _users.Object, facts, TimeProvider.System),
            NullLogger<LetterboxdWatchedSynchronizer>.Instance);
    }

    private static LetterboxdListOutcome ToWatch(LetterboxdSyncOutcome outcome) => outcome.Of(LetterboxdImportTarget.Watchlist);

    private static LetterboxdListOutcome Watched(LetterboxdSyncOutcome outcome) => outcome.Of(LetterboxdImportTarget.Watched);

    private void GivenWatchedOnLetterboxd(bool isComplete, params LetterboxdFilm[] films) =>
        _letterboxd
            .Setup(l => l.GetWatchedFilmsAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot(films, isComplete));

    private void VerifyRemovedFromWatchlist(int tmdbId, Times times) =>
        _watchlist.Verify(
            w => w.RemoveAsync(UserId, tmdbId, MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            times);

    private static User TheUser() =>
        new() { Id = UserId, Email = "a@b.c", LetterboxdUsername = Username };

    private static WatchlistItem Item(int tmdbId, string title, string? slug) => new()
    {
        Id = $"i{tmdbId}",
        UserId = UserId,
        TmdbId = tmdbId,
        MediaType = MovieMediaType.Movie,
        Title = title,
        Year = "2004",
        LetterboxdSlug = slug,
        CreatedAt = DateTimeOffset.UnixEpoch
    };

    private void GivenWatchlist(params WatchlistItem[] items) =>
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)items);

    private void GivenLetterboxd(bool isComplete, params LetterboxdFilm[] films) =>
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot(films, isComplete));

    private void GivenTmdbResults(string query, params TmdbSearchItem[] results) =>
        _tmdb
            .Setup(t => t.SearchTitlesAsync(query, true, It.IsAny<CatalogLanguage>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)results);

    private void GivenTmdbFindsNothing() =>
        _tmdb
            .Setup(t => t.SearchTitlesAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CatalogLanguage>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[]);

    private void VerifyNothingAdded() =>
        _addToWatchlist.Verify(
            a => a.HandleAsync(It.IsAny<string>(), It.IsAny<AddWatchlistItemRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);

    [Fact]
    public async Task SyncAsync_IncompleteSnapshot_FailsWithoutTouchingTheWatchlist()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        GivenLetterboxd(false);

        var outcome = await _sut.SyncAsync(TheUser() with { LetterboxdSyncWatched = false });

        Assert.False(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, outcome.Error);
        _watchlist.Verify(
            w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_WatchlistLongerThanWhatWasRead_ImportsWithoutRemovingAnything()
    {
        const int announced = 2_000;
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Truncated([new LetterboxdFilm("akira", "Akira", "1988")], announced));
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.True(outcome.Succeeded);
        Assert.Equal(1, ToWatch(outcome).Added);
        Assert.Equal(0, ToWatch(outcome).Removed);
        Assert.Equal(announced, ToWatch(outcome).TotalOnLetterboxd);
        Assert.Equal(announced - 1, ToWatch(outcome).TotalTruncated);
        _watchlist.Verify(
            w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncAsync_ConfidentMatch_AddsSilently()
    {
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(1, ToWatch(outcome).Added);
        Assert.Empty(ToWatch(outcome).PendingChoices);
        _addToWatchlist.Verify(
            a => a.HandleAsync(
                UserId,
                It.Is<AddWatchlistItemRequest>(r => r.TmdbId == 5255 && r.LetterboxdSlug == "the-polar-express"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncAsync_AmbiguousMatch_IsLeftForArbitrationInsteadOfGuessing()
    {
        GivenLetterboxd(true, new LetterboxdFilm("midnight-mass-2021", "Midnight Mass", "2021"));
        GivenTmdbResults(
            "Midnight Mass",
            new TmdbSearchItem(97400, MovieMediaType.Tv, "Sermons de minuit", "2021", null, 7.5, "Midnight Mass 2021"),
            new TmdbSearchItem(714995, MovieMediaType.Movie, "The Manson Brothers", "2021", null, 4.2, "The Manson Brothers"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, ToWatch(outcome).Added);
        VerifyNothingAdded();
        var pending = Assert.Single(ToWatch(outcome).PendingChoices);
        Assert.Equal("Midnight Mass", pending.Title);
        Assert.Equal("midnight-mass-2021", pending.LetterboxdSlug);
        Assert.Equal(2, pending.Candidates.Count);
    }

    [Fact]
    public async Task SyncAsync_AmbiguousMatch_EnrichesCandidatesWithGenresAndRuntime()
    {
        GivenLetterboxd(true, new LetterboxdFilm("midnight-mass-2021", "Midnight Mass", "2021"));
        GivenTmdbResults(
            "Midnight Mass",
            new TmdbSearchItem(
                97400, MovieMediaType.Tv, "Sermons de minuit", "2021", null, 7.5, "Midnight Mass 2021",
                GenreIds: DramaMysteryGenreIds),
            new TmdbSearchItem(714995, MovieMediaType.Movie, "The Manson Brothers", "2021", null, 4.2, "The Manson Brothers"));
        _tmdb
            .Setup(t => t.GetDetailsAsync(97400, MovieMediaType.Tv, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(97400, "Sermons de minuit", null, null, null, [], 62, [], DramaMysteryGenreIds, null));

        var outcome = await _sut.SyncAsync(TheUser());

        var pending = Assert.Single(ToWatch(outcome).PendingChoices);
        var withRuntime = pending.Candidates.Single(c => c.TmdbId == 97400);
        Assert.Equal(62, withRuntime.RuntimeMinutes);
        Assert.Equal(DramaMysteryGenreIds, withRuntime.GenreIds);
        var withoutDetails = pending.Candidates.Single(c => c.TmdbId == 714995);
        Assert.Null(withoutDetails.RuntimeMinutes);
        Assert.Empty(withoutDetails.GenreIds);
    }

    [Fact]
    public async Task SyncAsync_NoCandidate_IsReportedAsUnmatched()
    {
        GivenLetterboxd(true, new LetterboxdFilm("film-obscur", "Film Obscur", "1974"));
        GivenTmdbFindsNothing();

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal("Film Obscur (1974)", Assert.Single(ToWatch(outcome).UnmatchedTitles));
        Assert.Empty(ToWatch(outcome).PendingChoices);
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_TrackedFilmGoneFromLetterboxd_IsRemoved()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        GivenLetterboxd(true);

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(1, ToWatch(outcome).Removed);
        _watchlist.Verify(
            w => w.RemoveAsync(UserId, 5255, MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncAsync_EntryRenamedOnLetterboxd_StaysInTheWatchlistUnderItsNewSlug()
    {
        var watchlist = new InMemoryWatchlistRepository();
        var createdAt = new DateTimeOffset(2026, 1, 5, 20, 0, 0, TimeSpan.Zero);
        await watchlist.AddAsync(Item(5255, "Le Pôle express", "the-polar-express") with { CreatedAt = createdAt });
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express-2004", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));
        var sut = Synchronizer(watchlist, _watched, _addToWatchlist.Object);

        var outcome = await sut.SyncAsync(TheUser());

        var kept = await watchlist.GetOneAsync(UserId, 5255, MovieMediaType.Movie);
        Assert.NotNull(kept);
        Assert.Equal("the-polar-express-2004", kept.LetterboxdSlug);
        Assert.Equal(createdAt, kept.CreatedAt);
        Assert.Equal(0, ToWatch(outcome).Removed);
        Assert.Equal(0, ToWatch(outcome).Added);
    }

    [Fact]
    public async Task SyncAsync_TmdbDetailsDownWhileImporting_KeepsTheGenresOfTheSearchResult()
    {
        var watchlist = new InMemoryWatchlistRepository();
        var posters = new Mock<IPosterImageStore>();
        posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? path) => path);
        _tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));
        GivenLetterboxd(true, new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults(
            "Akira",
            new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira", GenreIds: AnimationSciFiGenreIds));
        var sut = Synchronizer(
            watchlist,
            _watched,
            new AddToWatchlistHandler(
                watchlist, _users.Object, posters.Object, TimeProvider.System, _tmdb.Object, NullLogger<AddToWatchlistHandler>.Instance));

        var outcome = await sut.SyncAsync(TheUser());

        Assert.Equal(1, ToWatch(outcome).Added);
        var added = await watchlist.GetOneAsync(UserId, 149, MovieMediaType.Movie);
        Assert.Equal(AnimationSciFiGenreIds, added!.GenreIds);
    }

    [Fact]
    public async Task SyncAsync_FilmUnknownToTmdbDetails_IsSkipped_AndTheOthersAreImported()
    {
        var watchlist = new InMemoryWatchlistRepository();
        var posters = new Mock<IPosterImageStore>();
        posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? path) => path);
        _tmdb
            .Setup(t => t.GetDetailsAsync(149, MovieMediaType.Movie, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(149, "Akira", null, null, null, [], 124, [], AnimationSciFiGenreIds, "1988-07-16"));
        _tmdb
            .Setup(t => t.GetDetailsAsync(5255, MovieMediaType.Movie, It.IsAny<CatalogLanguage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
        GivenLetterboxd(
            true,
            new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"),
            new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));
        GivenTmdbResults(
            "Akira",
            new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));
        var sut = Synchronizer(
            watchlist,
            _watched,
            new AddToWatchlistHandler(
                watchlist, _users.Object, posters.Object, TimeProvider.System, _tmdb.Object, NullLogger<AddToWatchlistHandler>.Instance));

        var outcome = await sut.SyncAsync(TheUser() with { LetterboxdSyncWatched = false });

        Assert.True(outcome.Succeeded);
        Assert.Equal(1, ToWatch(outcome).Added);
        Assert.NotNull(await watchlist.GetOneAsync(UserId, 149, MovieMediaType.Movie));
        Assert.Null(await watchlist.GetOneAsync(UserId, 5255, MovieMediaType.Movie));
    }

    [Fact]
    public async Task SyncAsync_FilmAddedInMoviePickerOnly_IsNeverRemoved()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", null));
        GivenLetterboxd(true);

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, ToWatch(outcome).Removed);
        _watchlist.Verify(
            w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncAsync_AmbiguousMatchAlreadyChosen_StaysPendingWithoutAttachingSlug()
    {
        GivenWatchlist(Item(97400, "Sermons de minuit", null) with { MediaType = MovieMediaType.Tv });
        GivenLetterboxd(true, new LetterboxdFilm("midnight-mass-2021", "Midnight Mass", "2021"));
        GivenTmdbResults(
            "Midnight Mass",
            new TmdbSearchItem(97400, MovieMediaType.Tv, "Sermons de minuit", "2021", null, 7.5, "Midnight Mass 2021"),
            new TmdbSearchItem(714995, MovieMediaType.Movie, "The Manson Brothers", "2021", null, 4.2, "The Manson Brothers"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, ToWatch(outcome).Added);
        Assert.Equal("Midnight Mass", Assert.Single(ToWatch(outcome).PendingChoices).Title);
        VerifyNothingAdded();
        _watchlist.Verify(
            w => w.SetLetterboxdSlugAsync(
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<MovieMediaType>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncAsync_ConfidentMatchAlreadyPresentWithoutSlug_AttachesSlugInsteadOfDuplicating()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", null));
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, ToWatch(outcome).Added);
        VerifyNothingAdded();
        _watchlist.Verify(
            w => w.SetLetterboxdSlugAsync(
                UserId, 5255, MovieMediaType.Movie, "the-polar-express", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncAsync_AlreadyTrackedFilm_IsSkippedWithoutTmdbCall()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, ToWatch(outcome).Added);
        Assert.Equal(0, ToWatch(outcome).Removed);
        _tmdb.Verify(
            t => t.SearchTitlesAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CatalogLanguage>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncAsync_MoreFilmsThanTheLimit_ReportsTruncation()
    {
        var films = Enumerable.Range(0, LetterboxdImportLimits.MaxRows + 4)
            .Select(i => new LetterboxdFilm($"film-{i}", $"Film {i}", "2000"))
            .ToArray();
        GivenLetterboxd(true, films);
        GivenTmdbFindsNothing();

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(LetterboxdImportLimits.MaxRows + 4, ToWatch(outcome).TotalOnLetterboxd);
        Assert.Equal(4, ToWatch(outcome).TotalTruncated);
        Assert.Equal(LetterboxdImportLimits.MaxRows, ToWatch(outcome).UnmatchedTitles.Count);
    }

    private void GivenWatchedAtAMovieNight(int tmdbId, bool cleanedUp)
    {
        _participants
            .Setup(p => p.ListDistinctEventIdsByUserIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<string>)["evt1"]);
        _events
            .Setup(e => e.ListByIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Contains("evt1")), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Event>)
            [
                new Event
                {
                    Id = "evt1",
                    Title = "Soirée",
                    Date = "2026-09-01",
                    Time = "20:00",
                    Slug = "soiree",
                    HostToken = "ht",
                    Winners = [new EventWinner { MovieId = "m-win", PickedAt = DateTimeOffset.UnixEpoch }],
                    WatchlistCleanedAt = cleanedUp ? DateTimeOffset.UnixEpoch : null
                }
            ]);
        _movies
            .Setup(m => m.ListByIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Contains("m-win")), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Movie>)
            [
                new Movie { Id = "m-win", EventId = "evt1", TmdbId = tmdbId, MediaType = MovieMediaType.Movie, Title = "The Polar Express" }
            ]);
    }

    [Fact]
    public async Task SyncAsync_FilmWatchedAtAMovieNight_IsNotImportedAgain()
    {
        GivenWatchedAtAMovieNight(5255, cleanedUp: true);
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, ToWatch(outcome).Added);
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_TitleMarkedWatchedByHand_DoesNotComeBackFromTheLetterboxdWatchlist()
    {
        var kit = new WatchedTestKit();
        await kit.Watchlist.AddAsync(Item(5255, "Le Pôle express", null));
        await kit.AccountAsync(UserId);
        await kit.MarkHandler().HandleAsync(UserId, WatchedTestKit.Title(5255));
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));
        var sut = Synchronizer(
            kit.Watchlist,
            kit.Watched,
            new AddToWatchlistHandler(
                kit.Watchlist, kit.Users, _posters.Object, TimeProvider.System, _tmdb.Object, NullLogger<AddToWatchlistHandler>.Instance));

        var outcome = await sut.SyncAsync(TheUser() with { LetterboxdSyncWatched = false });

        Assert.True(outcome.Succeeded);
        Assert.Equal(0, ToWatch(outcome).Added);
        Assert.Null(await kit.Watchlist.GetOneAsync(UserId, 5255, MovieMediaType.Movie));
        Assert.NotNull(await kit.Watched.GetAsync(UserId, 5255, MovieMediaType.Movie));
    }

    [Fact]
    public async Task SyncAsync_WatchlistOverItsShareOfTheBudget_LeavesTheWatchedFilmsTheirOwnShare()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .Returns(async (string _, CancellationToken token) =>
            {
                await Task.Delay(Timeout.Infinite, token);
                return new LetterboxdFilmsSnapshot([], true);
            });
        GivenWatchedOnLetterboxd(true, new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));
        var sut = Synchronizer(
            _watchlist.Object,
            _watched,
            _addToWatchlist.Object,
            new LetterboxdSyncBudget(FirstList: TimeSpan.FromMilliseconds(50), Total: TimeSpan.FromMinutes(1)));

        var outcome = await sut.SyncAsync(TheUser());

        Assert.True(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, outcome.Error);
        Assert.Equal(1, Watched(outcome).Added);
        Assert.NotNull(await _watched.GetAsync(UserId, 149, MovieMediaType.Movie));
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_WatchedFilmsAlreadyOfferedAsChoices_AreResolvedAfterTheNewOnes()
    {
        GivenLetterboxd(true);
        GivenTmdbFindsNothing();
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));
        var offered = Enumerable.Range(1, LetterboxdImportLimits.MaxRows)
            .Select(i => new LetterboxdFilm($"offered-{i}", $"Offered {i}", "2001"))
            .ToList();
        GivenWatchedOnLetterboxd(true, [.. offered, new LetterboxdFilm("akira", "Akira", "1988")]);
        var user = new User
        {
            Id = UserId,
            Email = "a@b.c",
            LetterboxdUsername = Username,
            LetterboxdPendingChoiceKeys = [.. offered.Select(film => $"watched:{film.Slug}"), "offered-1"]
        };

        var outcome = await _sut.SyncAsync(user);

        Assert.Equal(1, Watched(outcome).Added);
    }

    [Fact]
    public async Task SyncAsync_WatchedFilmsOverTheBudget_KeepTheWatchlistSync_AndReportTheWatchedError()
    {
        GivenLetterboxd(true, new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));
        _letterboxd
            .Setup(l => l.GetWatchedFilmsAsync(Username, It.IsAny<CancellationToken>()))
            .Returns(async (string _, CancellationToken token) =>
            {
                await Task.Delay(Timeout.Infinite, token);
                return new LetterboxdFilmsSnapshot([], true);
            });
        var sut = Synchronizer(
            _watchlist.Object,
            _watched,
            _addToWatchlist.Object,
            new LetterboxdSyncBudget(FirstList: TimeSpan.FromMinutes(1), Total: TimeSpan.FromSeconds(2)));

        var outcome = await sut.SyncAsync(TheUser());

        Assert.True(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchedIncomplete, outcome.Error);
        Assert.Equal((1, 0), (ToWatch(outcome).Added, Watched(outcome).Added));
    }

    [Fact]
    public async Task SyncAsync_BothListsOverTheBudget_Fail()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .Returns(async (string _, CancellationToken token) =>
            {
                await Task.Delay(Timeout.Infinite, token);
                return new LetterboxdFilmsSnapshot([], true);
            });
        _letterboxd
            .Setup(l => l.GetWatchedFilmsAsync(Username, It.IsAny<CancellationToken>()))
            .Returns(async (string _, CancellationToken token) =>
            {
                await Task.Delay(Timeout.Infinite, token);
                return new LetterboxdFilmsSnapshot([], true);
            });
        var sut = Synchronizer(
            _watchlist.Object,
            _watched,
            _addToWatchlist.Object,
            new LetterboxdSyncBudget(FirstList: TimeSpan.FromMilliseconds(50), Total: TimeSpan.FromMilliseconds(200)));

        var outcome = await sut.SyncAsync(TheUser());

        Assert.False(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, outcome.Error);
    }

    [Fact]
    public async Task SyncAsync_CancelledByTheCaller_StopsInsteadOfReportingAnIncompleteList()
    {
        using var caller = new CancellationTokenSource();
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .Returns(async (string _, CancellationToken token) =>
            {
                await caller.CancelAsync();
                await Task.Delay(Timeout.Infinite, token);
                return new LetterboxdFilmsSnapshot([], true);
            });

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _sut.SyncAsync(TheUser(), ct: caller.Token));

        _letterboxd.Verify(l => l.GetWatchedFilmsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void Budget_WithinTheRequestTimeout_LeavesTheCallerSomeTime_AndTheSecondListAtLeastHalf()
    {
        var budget = LetterboxdSyncBudget.Within(RequestTimeoutPolicies.LongRunningBudget);

        Assert.True(budget.Total < RequestTimeoutPolicies.LongRunningBudget);
        Assert.True(budget.Total >= RequestTimeoutPolicies.LongRunningBudget - TimeSpan.FromMinutes(1));
        Assert.Equal(budget.Total / 2, budget.FirstList);
    }

    [Fact]
    public async Task SyncAsync_WinnerOfAMovieNightNotYetCleanedUp_IsStillImported()
    {
        GivenWatchedAtAMovieNight(5255, cleanedUp: false);
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(1, ToWatch(outcome).Added);
    }

    [Fact]
    public async Task SyncAsync_EveryFilmAlreadyTracked_DoesNotLookUpTheMovieNights()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));

        await _sut.SyncAsync(TheUser());

        _participants.Verify(
            p => p.ListDistinctEventIdsByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncAsync_WatchlistSyncSwitchedOff_NeverReadsTheWatchlist_ButSyncsTheWatchedFilms()
    {
        GivenWatchedOnLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004", Rating: 6));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));

        var outcome = await _sut.SyncAsync(TheUser() with { LetterboxdSyncWatchlist = false });

        Assert.True(outcome.Succeeded);
        Assert.Equal((0, 1), (ToWatch(outcome).Added, Watched(outcome).Added));
        _letterboxd.Verify(l => l.GetWatchlistAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        VerifyNothingAdded();
        Assert.Equal(WatchedOrigin.Letterboxd, (await _watched.GetAsync(UserId, 5255, MovieMediaType.Movie))!.Origin);
    }

    [Fact]
    public async Task SyncAsync_WatchedSyncSwitchedOff_NeverReadsTheWatchedFilms()
    {
        GivenLetterboxd(true);

        var outcome = await _sut.SyncAsync(TheUser() with { LetterboxdSyncWatched = false });

        Assert.True(outcome.Succeeded);
        _letterboxd.Verify(l => l.GetWatchedFilmsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SyncAsync_IncompleteWatchedFilms_StillSyncsTheWatchlist_AndReportsTheWatchedError()
    {
        await _watched.AddIfAbsentAsync(new WatchedTitle { OwnerId = UserId, TmdbId = 1, Origin = WatchedOrigin.Letterboxd, LetterboxdSlug = "one" });
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        GivenLetterboxd(true, new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));
        GivenWatchedOnLetterboxd(false);

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.True(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchedIncomplete, outcome.Error);
        Assert.Equal((1, 1, 0, 0), (ToWatch(outcome).Added, ToWatch(outcome).Removed, Watched(outcome).Added, Watched(outcome).Removed));
        Assert.NotNull(await _watched.GetAsync(UserId, 1, MovieMediaType.Movie));
    }

    [Fact]
    public async Task SyncAsync_IncompleteWatchlist_StillSyncsTheWatchedFilms_KeepingToWatchWhatLetterboxdBrought()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"), Item(149, "Akira", null), Item(78, "Blade Runner", "blade-runner"));
        GivenLetterboxd(false);
        GivenWatchedOnLetterboxd(
            true,
            new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"),
            new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.True(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, outcome.Error);
        Assert.Equal((0, 1, 2), (ToWatch(outcome).Added, ToWatch(outcome).Removed, Watched(outcome).Added));
        VerifyRemovedFromWatchlist(5255, Times.Never());
        VerifyRemovedFromWatchlist(78, Times.Never());
        VerifyRemovedFromWatchlist(149, Times.Once());
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_BothListsUnreadable_FailsWithTheWatchlistError()
    {
        GivenLetterboxd(false);
        GivenWatchedOnLetterboxd(false);

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.False(outcome.Succeeded);
        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, outcome.Error);
    }

    [Fact]
    public async Task SyncAsync_NewlyWatchedFilm_LeavesToWatch_UnlessStillOnTheLetterboxdWatchlist()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"), Item(149, "Akira", null));
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenWatchedOnLetterboxd(
            true,
            new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"),
            new LetterboxdFilm("akira", "Akira", "1988"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal((2, 1), (Watched(outcome).Added, ToWatch(outcome).Removed));
        VerifyRemovedFromWatchlist(5255, Times.Never());
        VerifyRemovedFromWatchlist(149, Times.Once());
    }

    [Fact]
    public async Task SyncAsync_PendingChoicesOfBothLists_AreNumberedWithinTheirListAndSayWhichListTheyFeed()
    {
        GivenLetterboxd(true, new LetterboxdFilm("solaris", "Solaris", "1972"));
        GivenWatchedOnLetterboxd(true, new LetterboxdFilm("solaris", "Solaris", "1972", Rating: 8));
        GivenTmdbResults(
            "Solaris",
            new TmdbSearchItem(593, MovieMediaType.Movie, "Solaris (1972)", "1972", null),
            new TmdbSearchItem(2103, MovieMediaType.Movie, "Solaris (2002)", "2002", null));

        var outcome = await _sut.SyncAsync(TheUser());

        var toWatch = Assert.Single(ToWatch(outcome).PendingChoices);
        var watched = Assert.Single(Watched(outcome).PendingChoices);
        Assert.Equal((LetterboxdImportTarget.Watchlist, LetterboxdImportTarget.Watched), (toWatch.Target, watched.Target));
        Assert.Equal((1, 1), (toWatch.RowIndex, watched.RowIndex));
        Assert.Equal((int?)8, watched.Rating);
    }

    [Fact]
    public async Task SyncAsync_KnownFilmsDoNotUseTheRowBudget_SoTheFollowingOnesAreImported()
    {
        var tracked = Enumerable.Range(0, LetterboxdImportLimits.MaxRows)
            .Select(i => Item(10_000 + i, $"Film {i}", $"film-{i}"))
            .ToArray();
        GivenWatchlist(tracked);
        GivenLetterboxd(
            true,
            [.. tracked.Select(item => new LetterboxdFilm(item.LetterboxdSlug!, item.Title, "2004")), new LetterboxdFilm("akira", "Akira", "1988")]);
        GivenTmdbResults("Akira", new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal((1, 0), (ToWatch(outcome).Added, ToWatch(outcome).TotalTruncated));
    }
}
