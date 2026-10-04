using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class RewriteLegacyPosterPathsMigrationTests
{
    private const string CachedSource = "https://image.tmdb.org/t/p/w500/cached.jpg";

    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly RewriteLegacyPosterPathsMigration _sut;

    public RewriteLegacyPosterPathsMigrationTests()
    {
        GivenLegacyMovies();
        GivenLegacyWatchlistItems();
        _sut = new RewriteLegacyPosterPathsMigration(
            _movies.Object,
            _watchlist.Object,
            _posters.Object,
            _tmdb.Object,
            NullLogger<RewriteLegacyPosterPathsMigration>.Instance);
    }

    private static string LegacyPath(string source) =>
        TmdbPosterUrlNormalizer.ApiPosterPathPrefix + TmdbPosterUrlNormalizer.ComputeKey(source);

    private static Movie LegacyMovie(string id, int tmdbId, string source) =>
        new() { Id = id, TmdbId = tmdbId, MediaType = MovieMediaType.Movie, PosterPath = LegacyPath(source) };

    private static WatchlistItem LegacyItem(string id, int tmdbId, string source) =>
        new() { Id = id, TmdbId = tmdbId, MediaType = MovieMediaType.Tv, PosterPath = LegacyPath(source) };

    private static TmdbMovieDetails DetailsWithPoster(string? posterUrl) =>
        new(1, "Titre", null, null, null, [], 100, [], [], null, PosterUrl: posterUrl);

    private void GivenLegacyMovies(params Movie[] movies)
    {
        var queue = new Queue<IReadOnlyList<Movie>>([movies, []]);
        _movies.Setup(r => r.ListWithLegacyPosterPathAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => queue.Count > 0 ? queue.Dequeue() : []);
    }

    private void GivenLegacyWatchlistItems(params WatchlistItem[] items)
    {
        var queue = new Queue<IReadOnlyList<WatchlistItem>>([items, []]);
        _watchlist.Setup(r => r.ListWithLegacyPosterPathAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => queue.Count > 0 ? queue.Dequeue() : []);
    }

    private void GivenCachedSource(string source) =>
        _posters.Setup(p => p.FindSourceUrlAsync(TmdbPosterUrlNormalizer.ComputeKey(source), It.IsAny<CancellationToken>()))
            .ReturnsAsync(source);

    [Fact]
    public void Id_IsDatedAndStable()
    {
        Assert.Equal("2026-09-23-001-rewrite-legacy-poster-paths", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_SourceStillCached_RewritesToTheStatelessRouteWithoutCallingTmdb()
    {
        GivenLegacyMovies(LegacyMovie("m1", 11, CachedSource));
        GivenCachedSource(CachedSource);

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _movies.Verify(r => r.UpdatePosterPathAsync("m1", "/api/v1/posters/tmdb/w500/cached.jpg", It.IsAny<CancellationToken>()), Times.Once);
        _tmdb.Verify(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_SourceLostWithTheCache_ResolvesThePosterFromTmdb()
    {
        GivenLegacyMovies(LegacyMovie("m1", 11, "https://image.tmdb.org/t/p/w500/lost.jpg"));
        _tmdb.Setup(t => t.GetDetailsAsync(11, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DetailsWithPoster("https://image.tmdb.org/t/p/w185/fresh.jpg"));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _movies.Verify(r => r.UpdatePosterPathAsync("m1", "/api/v1/posters/tmdb/w500/fresh.jpg", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_TitleGoneFromTmdb_ClearsThePoster()
    {
        GivenLegacyMovies(LegacyMovie("m1", 11, "https://image.tmdb.org/t/p/w500/lost.jpg"));
        _tmdb.Setup(t => t.GetDetailsAsync(11, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);

        await _sut.ExecuteAsync();

        _movies.Verify(r => r.UpdatePosterPathAsync("m1", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_TmdbFails_KeepsTheLegacyPathAndReportsTheMigrationIncomplete()
    {
        GivenLegacyMovies(
            LegacyMovie("m1", 11, "https://image.tmdb.org/t/p/w500/lost.jpg"),
            LegacyMovie("m2", 22, CachedSource));
        GivenCachedSource(CachedSource);
        _tmdb.Setup(t => t.GetDetailsAsync(11, It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));

        var ex = await Assert.ThrowsAsync<BackfillIncompleteException>(() => _sut.ExecuteAsync());

        Assert.Equal(1, ex.Failed);
        _movies.Verify(r => r.UpdatePosterPathAsync("m1", It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        _movies.Verify(r => r.UpdatePosterPathAsync("m2", "/api/v1/posters/tmdb/w500/cached.jpg", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WatchlistItems_AreRewrittenWithTheirOwnMediaType()
    {
        GivenLegacyWatchlistItems(LegacyItem("w1", 33, "https://image.tmdb.org/t/p/w500/lost.jpg"));
        _tmdb.Setup(t => t.GetDetailsAsync(33, MovieMediaType.Tv, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DetailsWithPoster("https://image.tmdb.org/t/p/w500/series.jpg"));

        var updated = await _sut.ExecuteAsync();

        Assert.Equal(1, updated);
        _watchlist.Verify(r => r.UpdatePosterPathAsync("w1", "/api/v1/posters/tmdb/w500/series.jpg", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NothingLegacy_WritesNothing()
    {
        var updated = await _sut.ExecuteAsync();

        Assert.Equal(0, updated);
        _movies.Verify(r => r.UpdatePosterPathAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
