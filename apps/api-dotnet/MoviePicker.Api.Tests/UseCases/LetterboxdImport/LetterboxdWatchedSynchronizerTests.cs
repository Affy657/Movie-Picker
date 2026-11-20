using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.UseCases.MovieLists;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdWatchedSynchronizerTests
{
    private const string UserId = "u1";

    private static readonly DateTimeOffset Start = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    private readonly InMemoryWatchedTitleRepository _watched = new();
    private readonly InMemoryWatchlistRepository _watchlist = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly SteppingClock _clock = new(Start);
    private readonly LetterboxdWatchedSynchronizer _sut;

    public LetterboxdWatchedSynchronizerTests()
    {
        _tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
        _tmdb
            .Setup(t => t.SearchTitlesAsync(It.IsAny<string>(), true, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[]);
        var facts = new MovieListItemFactory(_posters.Object, _tmdb.Object, NullLogger<MovieListItemFactory>.Instance);
        var users = new Mock<IUserRepository>();
        users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = UserId });
        var writer = new LetterboxdWatchedWriter(_watched, _watchlist, users.Object, facts, _clock);
        _sut = new LetterboxdWatchedSynchronizer(
            _watched,
            _tmdb.Object,
            writer,
            NullLogger<LetterboxdWatchedSynchronizer>.Instance);
    }

    private static LetterboxdFilmsSnapshot Complete(params LetterboxdFilm[] films) => new(films, true);

    private void GivenTmdbMovie(string title, int tmdbId, string year)
    {
        _tmdb
            .Setup(t => t.SearchTitlesAsync(title, true, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[new TmdbSearchItem(tmdbId, MovieMediaType.Movie, title, year, null, 7.5, title)]);
    }

    private void GivenTmdbAmbiguous(string title, params int[] tmdbIds)
    {
        _tmdb
            .Setup(t => t.SearchTitlesAsync(title, true, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)tmdbIds
                .Select(id => new TmdbSearchItem(id, MovieMediaType.Movie, $"{title} {id}", "2001", null))
                .ToList());
    }

    private Task<WatchedTitle> AlreadyWatched(int tmdbId, WatchedOrigin origin = WatchedOrigin.Manual, string? slug = null, int? rating = null, WatchedOrigin? ratingOrigin = null) =>
        _watched.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = UserId,
            TmdbId = tmdbId,
            Title = $"Film {tmdbId}",
            Year = "2001",
            WatchedAt = Start.AddDays(-30),
            Rating = rating,
            RatingOrigin = ratingOrigin,
            Origin = origin,
            LetterboxdSlug = slug,
            CreatedAt = Start.AddDays(-30),
            UpdatedAt = Start.AddDays(-30)
        });

    private Task<bool> OnWatchlist(int tmdbId, string? slug = null) =>
        _watchlist.AddAsync(new WatchlistItem
        {
            UserId = UserId,
            TmdbId = tmdbId,
            Title = $"Film {tmdbId}",
            Year = "2001",
            LetterboxdSlug = slug,
            CreatedAt = Start.AddDays(-60)
        });

    private Task<WatchedTitle?> StoredAsync(int tmdbId) => _watched.GetAsync(UserId, tmdbId, MovieMediaType.Movie);

    [Fact]
    public async Task ApplyAsync_ConfidentMatch_IsWatchedFromLetterboxd_WithItsSlugRatingAndDiaryDate()
    {
        GivenTmdbMovie("Dune", 438631, "2021");

        var outcome = await _sut.ApplyAsync(
            UserId,
            Complete(new LetterboxdFilm("dune-2021", "Dune", "2021", Rating: 9, WatchedOn: new DateOnly(2026, 11, 2))),
            null);

        var stored = await StoredAsync(438631);
        Assert.Equal(1, outcome.Added);
        Assert.Equal(
            (WatchedOrigin.Letterboxd, "dune-2021", (int?)9, (WatchedOrigin?)WatchedOrigin.Letterboxd, new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero)),
            (stored!.Origin, stored.LetterboxdSlug, stored.Rating, stored.RatingOrigin, stored.WatchedAt));
        Assert.Equal(("Dune", "2021"), (stored.Title, stored.Year));
    }

    [Fact]
    public async Task ApplyAsync_FilmOutsideTheDiary_IsDatedWhenTheSyncFirstSeesIt()
    {
        _clock.Advance(TimeSpan.FromTicks(4_567));
        GivenTmdbMovie("Akira", 149, "1988");

        await _sut.ApplyAsync(UserId, Complete(new LetterboxdFilm("akira", "Akira", "1988")), null);

        var stored = await StoredAsync(149);
        Assert.Equal(Start, stored!.WatchedAt);
        Assert.Equal((null, null), (stored.Rating, stored.RatingOrigin));
    }

    [Fact]
    public async Task ApplyAsync_DiaryDateAfterNow_IsCappedAtNow()
    {
        GivenTmdbMovie("Akira", 149, "1988");

        await _sut.ApplyAsync(UserId, Complete(new LetterboxdFilm("akira", "Akira", "1988", WatchedOn: new DateOnly(2026, 11, 14))), null);

        Assert.Equal(Start, (await StoredAsync(149))!.WatchedAt);
    }

    [Fact]
    public async Task ApplyAsync_TitleMarkedByHand_StaysManual_TakesTheSlug_AndALetterboxdRatingOnlyWhenUnrated()
    {
        GivenTmdbMovie("Dune", 438631, "2021");
        GivenTmdbMovie("Akira", 149, "1988");
        await AlreadyWatched(438631, rating: 9, ratingOrigin: WatchedOrigin.Manual);
        await AlreadyWatched(149);

        var outcome = await _sut.ApplyAsync(
            UserId,
            Complete(new LetterboxdFilm("dune-2021", "Dune", "2021", Rating: 4), new LetterboxdFilm("akira", "Akira", "1988", Rating: 7)),
            null);

        var dune = await StoredAsync(438631);
        var akira = await StoredAsync(149);
        Assert.Equal(0, outcome.Added);
        Assert.Equal((WatchedOrigin.Manual, "dune-2021", (int?)9, (WatchedOrigin?)WatchedOrigin.Manual), (dune!.Origin, dune.LetterboxdSlug, dune.Rating, dune.RatingOrigin));
        Assert.Equal((WatchedOrigin.Manual, "akira", (int?)7, (WatchedOrigin?)WatchedOrigin.Letterboxd), (akira!.Origin, akira.LetterboxdSlug, akira.Rating, akira.RatingOrigin));
        Assert.Equal(Start.AddDays(-30), akira.WatchedAt);
    }

    [Fact]
    public async Task ApplyAsync_KnownSlug_FollowsTheLetterboxdRating_ButNeverOverridesAManualOne()
    {
        await AlreadyWatched(1, WatchedOrigin.Letterboxd, "one", rating: 6, ratingOrigin: WatchedOrigin.Letterboxd);
        await AlreadyWatched(2, WatchedOrigin.Letterboxd, "two", rating: 9, ratingOrigin: WatchedOrigin.Manual);
        await AlreadyWatched(3, WatchedOrigin.Letterboxd, "three", rating: 5, ratingOrigin: WatchedOrigin.Letterboxd);

        var outcome = await _sut.ApplyAsync(
            UserId,
            Complete(
                new LetterboxdFilm("one", "One", "2001", Rating: 8),
                new LetterboxdFilm("two", "Two", "2001", Rating: 2),
                new LetterboxdFilm("three", "Three", "2001")),
            null);

        Assert.Equal((0, 0), (outcome.Added, outcome.Removed));
        Assert.Equal(8, (await StoredAsync(1))!.Rating);
        Assert.Equal(9, (await StoredAsync(2))!.Rating);
        Assert.Null((await StoredAsync(3))!.Rating);
        _tmdb.Verify(
            t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ApplyAsync_FilmNoLongerWatchedOnLetterboxd_LeavesOnlyIfItCameFromLetterboxd()
    {
        await AlreadyWatched(1, WatchedOrigin.Letterboxd, "one", rating: 6, ratingOrigin: WatchedOrigin.Letterboxd);
        await AlreadyWatched(2, WatchedOrigin.Manual, "two");
        await AlreadyWatched(3);

        var outcome = await _sut.ApplyAsync(UserId, Complete(), null);

        Assert.Equal(1, outcome.Removed);
        Assert.Null(await StoredAsync(1));
        Assert.NotNull(await StoredAsync(2));
        Assert.NotNull(await StoredAsync(3));
    }

    [Fact]
    public async Task ApplyAsync_FilmImportedFromTheExport_WithoutASlug_IsNeverTakenAsDeparted()
    {
        await AlreadyWatched(1, WatchedOrigin.Letterboxd);

        var outcome = await _sut.ApplyAsync(UserId, Complete(), null);

        Assert.Equal(0, outcome.Removed);
        Assert.NotNull(await StoredAsync(1));
    }

    [Fact]
    public async Task ApplyAsync_TruncatedRead_RemovesNothing()
    {
        await AlreadyWatched(1, WatchedOrigin.Letterboxd, "one");

        var outcome = await _sut.ApplyAsync(UserId, LetterboxdFilmsSnapshot.Truncated([new LetterboxdFilm("two", "Two", "2001")], 5_000), null);

        Assert.Equal(0, outcome.Removed);
        Assert.NotNull(await StoredAsync(1));
        Assert.Equal(5_000, outcome.TotalOnLetterboxd);
        Assert.Equal(4_999, outcome.TotalTruncated);
    }

    [Fact]
    public async Task ApplyAsync_EmptyReadWithoutCounter_RemovesNothing()
    {
        await AlreadyWatched(1, WatchedOrigin.Letterboxd, "one");
        await AlreadyWatched(2, WatchedOrigin.Letterboxd, "two");

        var outcome = await _sut.ApplyAsync(UserId, LetterboxdFilmsSnapshot.EmptyWithoutCounter(), null);

        Assert.Equal((0, 0), (outcome.Added, outcome.Removed));
        Assert.NotNull(await StoredAsync(1));
        Assert.NotNull(await StoredAsync(2));
    }

    [Fact]
    public async Task ApplyAsync_EntryRelinkedUnderANewSlug_IsNotRemovedAsDeparted()
    {
        GivenTmdbMovie("Dune", 438631, "2021");
        await AlreadyWatched(438631, WatchedOrigin.Letterboxd, "dune-old-slug");

        var outcome = await _sut.ApplyAsync(UserId, Complete(new LetterboxdFilm("dune-2021", "Dune", "2021")), null);

        Assert.Equal(0, outcome.Removed);
        Assert.Equal("dune-2021", (await StoredAsync(438631))!.LetterboxdSlug);
    }

    [Fact]
    public async Task ApplyAsync_NewlyWatched_LeavesTheWatchlist_UnlessStillOnTheLetterboxdWatchlistReadInTheSamePass()
    {
        GivenTmdbMovie("Dune", 438631, "2021");
        GivenTmdbMovie("Akira", 149, "1988");
        await OnWatchlist(438631, "dune-2021");
        await OnWatchlist(149);

        var outcome = await _sut.ApplyAsync(
            UserId,
            Complete(new LetterboxdFilm("dune-2021", "Dune", "2021"), new LetterboxdFilm("akira", "Akira", "1988")),
            new HashSet<string>(["dune-2021"], StringComparer.OrdinalIgnoreCase));

        Assert.Equal(1, outcome.RemovedFromWatchlist);
        Assert.NotNull(await _watchlist.GetOneAsync(UserId, 438631, MovieMediaType.Movie));
        Assert.Null(await _watchlist.GetOneAsync(UserId, 149, MovieMediaType.Movie));
    }

    [Fact]
    public async Task ApplyAsync_WatchlistNotReadInThisPass_EveryNewlyWatchedTitleLeavesIt()
    {
        GivenTmdbMovie("Dune", 438631, "2021");
        await OnWatchlist(438631, "dune-2021");

        var outcome = await _sut.ApplyAsync(UserId, Complete(new LetterboxdFilm("dune-2021", "Dune", "2021")), null);

        Assert.Equal(1, outcome.RemovedFromWatchlist);
        Assert.Null(await _watchlist.GetOneAsync(UserId, 438631, MovieMediaType.Movie));
    }

    [Fact]
    public async Task ApplyAsync_TitleAlreadyWatchedByHand_StaysOnTheWatchlistUntouched()
    {
        GivenTmdbMovie("Dune", 438631, "2021");
        await AlreadyWatched(438631);
        await OnWatchlist(438631);

        var outcome = await _sut.ApplyAsync(UserId, Complete(new LetterboxdFilm("dune-2021", "Dune", "2021")), null);

        Assert.Equal(0, outcome.RemovedFromWatchlist);
        Assert.NotNull(await _watchlist.GetOneAsync(UserId, 438631, MovieMediaType.Movie));
    }

    [Fact]
    public async Task ApplyAsync_AmbiguousAndUnknownFilms_GoToTheConfirmationBanner_AsWatchedChoices()
    {
        GivenTmdbAmbiguous("Solaris", 593, 2_103);

        var outcome = await _sut.ApplyAsync(
            UserId,
            Complete(
                new LetterboxdFilm("solaris", "Solaris", "1972", Rating: 10, WatchedOn: new DateOnly(2026, 10, 1)),
                new LetterboxdFilm("lost-film", "Lost Film", "1931")),
            null);

        var choice = Assert.Single(outcome.PendingChoices);
        Assert.Equal(
            (LetterboxdImportTarget.Watched, "solaris", (int?)10, (DateOnly?)new DateOnly(2026, 10, 1)),
            (choice.Target, choice.LetterboxdSlug, choice.Rating, choice.WatchedOn));
        Assert.Equal([593, 2_103], choice.Candidates.Select(c => c.TmdbId));
        Assert.True(choice.RowIndex > LetterboxdImportLimits.MaxRows);
        Assert.Equal(["Lost Film (1931)"], outcome.UnmatchedTitles);
        Assert.Empty(await _watched.ListByOwnerAsync(UserId));
    }

    [Fact]
    public async Task ApplyAsync_ResolvesAtMostTheRowBudgetOfUnknownFilms_KnownOnesDoNotCount()
    {
        await AlreadyWatched(1, WatchedOrigin.Letterboxd, "known");
        var unknown = Enumerable.Range(0, LetterboxdImportLimits.MaxRows + 5)
            .Select(i => new LetterboxdFilm($"film-{i}", $"Film {i}", "2001"));
        var films = new[] { new LetterboxdFilm("known", "Known", "2001") }.Concat(unknown).ToArray();

        var outcome = await _sut.ApplyAsync(UserId, Complete(films), null);

        _tmdb.Verify(
            t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Exactly(LetterboxdImportLimits.MaxRows));
        Assert.Equal(5, outcome.TotalTruncated);
        Assert.Equal(LetterboxdImportLimits.MaxRows, outcome.UnmatchedTitles.Count);
    }
}
