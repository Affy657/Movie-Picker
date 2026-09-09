using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillMovieGenresMigrationTests
{
    private static readonly int[] ExpectedActionAdventureGenres = [28, 12];
    private static readonly int[] ExpectedComedyGenres = [35];

    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly BackfillMovieGenresMigration _sut;

    public BackfillMovieGenresMigrationTests()
    {
        GivenMoviesMissingGenres();
        GivenWatchlistItemsMissingGenres();

        _sut = new BackfillMovieGenresMigration(
            _movies.Object,
            _watchlist.Object,
            _tmdb.Object,
            NullLogger<BackfillMovieGenresMigration>.Instance);
    }

    private static Movie MovieWithoutGenres(string id, int tmdbId) =>
        new() { Id = id, TmdbId = tmdbId, MediaType = MovieMediaType.Movie, GenreIds = [] };

    private static WatchlistItem WatchlistItemWithoutGenres(string id, int tmdbId) =>
        new() { Id = id, TmdbId = tmdbId, MediaType = MovieMediaType.Movie, GenreIds = [] };

    private static TmdbMovieDetails Details(params int[] genreIds) =>
        new(1, "Titre", null, null, null, [], 100, [], genreIds, null);

    private void GivenMoviesMissingGenres(params Movie[] movies)
    {
        var queue = new Queue<IReadOnlyList<Movie>>([movies, []]);
        _movies.Setup(r => r.ListMissingGenresAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => queue.Count > 0 ? queue.Dequeue() : []);
    }

    private void GivenWatchlistItemsMissingGenres(params WatchlistItem[] items)
    {
        var queue = new Queue<IReadOnlyList<WatchlistItem>>([items, []]);
        _watchlist.Setup(r => r.ListMissingGenresAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => queue.Count > 0 ? queue.Dequeue() : []);
    }

    private void GivenTmdbDetails(int tmdbId, TmdbMovieDetails? details) =>
        _tmdb.Setup(t => t.GetDetailsAsync(tmdbId, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);

    [Fact]
    public void Id_IsStableAndDated()
    {
        Assert.Equal("2026-09-05-002-backfill-movie-genres", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_FillsGenresOnMoviesAndWatchlistItems()
    {
        GivenMoviesMissingGenres(MovieWithoutGenres("m1", 11));
        GivenWatchlistItemsMissingGenres(WatchlistItemWithoutGenres("w1", 22));
        GivenTmdbDetails(11, Details(28, 12));
        GivenTmdbDetails(22, Details(35));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(2, updated);
        _movies.Verify(
            r => r.UpdateGenresAsync("m1", It.Is<IReadOnlyList<int>>(g => g.SequenceEqual(ExpectedActionAdventureGenres)), It.IsAny<CancellationToken>()),
            Times.Once);
        _watchlist.Verify(
            r => r.UpdateGenresAsync("w1", It.Is<IReadOnlyList<int>>(g => g.SequenceEqual(ExpectedComedyGenres)), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NothingToBackfill_WritesNothing()
    {
        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _movies.Verify(
            r => r.UpdateGenresAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _watchlist.Verify(
            r => r.UpdateGenresAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbReturnsNoGenre_LeavesTheDocumentUntouched()
    {
        GivenMoviesMissingGenres(MovieWithoutGenres("m1", 11));
        GivenTmdbDetails(11, Details());

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _movies.Verify(
            r => r.UpdateGenresAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbReturnsNothing_LeavesTheDocumentUntouched()
    {
        GivenMoviesMissingGenres(MovieWithoutGenres("m1", 11));
        GivenTmdbDetails(11, null);

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _movies.Verify(
            r => r.UpdateGenresAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbFailsOnOneItem_KeepsGoingWithTheNextOnes()
    {
        GivenMoviesMissingGenres(
            MovieWithoutGenres("m1", 11),
            MovieWithoutGenres("m2", 22),
            MovieWithoutGenres("m3", 33));
        GivenTmdbDetails(11, Details(28));
        _tmdb.Setup(t => t.GetDetailsAsync(22, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB indisponible"));
        GivenTmdbDetails(33, Details(18));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(2, updated);
        _movies.Verify(
            r => r.UpdateGenresAsync("m3", It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_RepositoryKeepsReturningTheSamePage_StopsInsteadOfLooping()
    {
        var page = new List<Movie> { MovieWithoutGenres("m1", 11) };
        _movies.Setup(r => r.ListMissingGenresAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(page);
        GivenTmdbDetails(11, Details(28));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _movies.Verify(
            r => r.UpdateGenresAsync("m1", It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_ReplayedOnAnAlreadyMigratedBase_WritesNothing()
    {
        GivenMoviesMissingGenres(MovieWithoutGenres("m1", 11));
        GivenTmdbDetails(11, Details(28));

        var first = await _sut.ExecuteAsync();

        GivenMoviesMissingGenres();
        GivenWatchlistItemsMissingGenres();
        _movies.Invocations.Clear();

        var second = await _sut.ExecuteAsync();

        Assert.Equal(1, first);
        Assert.Equal(0, second);
        _movies.Verify(
            r => r.UpdateGenresAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_UsesTheMediaTypeOfEachDocument()
    {
        GivenMoviesMissingGenres(MovieWithoutGenres("m1", 11) with { MediaType = MovieMediaType.Tv });
        GivenTmdbDetails(11, Details(28));

        await _sut.ExecuteAsync();

        _tmdb.Verify(
            t => t.GetDetailsAsync(11, MovieMediaType.Tv, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_Cancelled_Throws()
    {
        GivenMoviesMissingGenres(MovieWithoutGenres("m1", 11));
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _sut.ExecuteAsync(cts.Token));
    }
}
