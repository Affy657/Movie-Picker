using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdWatchlistSynchronizerTests
{
    private const string UserId = "u1";
    private const string Username = "affy657";

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ILetterboxdWatchlistClient> _letterboxd = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IAddToWatchlistHandler> _addToWatchlist = new();
    private readonly LetterboxdWatchlistSynchronizer _sut;

    public LetterboxdWatchlistSynchronizerTests()
    {
        _watchlist
            .Setup(w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        GivenWatchlist();
        _sut = new LetterboxdWatchlistSynchronizer(
            _watchlist.Object,
            _letterboxd.Object,
            _tmdb.Object,
            _addToWatchlist.Object,
            NullLogger<LetterboxdWatchlistSynchronizer>.Instance);
    }

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
            .ReturnsAsync(new LetterboxdWatchlistSnapshot(films, isComplete));

    private void GivenTmdbResults(string query, params TmdbSearchItem[] results) =>
        _tmdb
            .Setup(t => t.SearchAsync(
                query, true, null, It.IsAny<int?>(), It.IsAny<int?>(),
                null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)results);

    private void GivenTmdbFindsNothing() =>
        _tmdb
            .Setup(t => t.SearchAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
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

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.False(outcome.Succeeded);
        Assert.Contains(Username, outcome.Error!, StringComparison.Ordinal);
        _watchlist.Verify(
            w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_ConfidentMatch_AddsSilently()
    {
        GivenLetterboxd(true, new LetterboxdFilm("the-polar-express", "The Polar Express", "2004"));
        GivenTmdbResults(
            "The Polar Express",
            new TmdbSearchItem(5255, MovieMediaType.Movie, "Le Pôle express", "2004", null, 6.8, "The Polar Express"));

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(1, outcome.Added);
        Assert.Empty(outcome.PendingChoices);
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

        Assert.Equal(0, outcome.Added);
        VerifyNothingAdded();
        var pending = Assert.Single(outcome.PendingChoices);
        Assert.Equal("Midnight Mass", pending.Title);
        Assert.Equal("midnight-mass-2021", pending.LetterboxdSlug);
        Assert.Equal(2, pending.Candidates.Count);
    }

    [Fact]
    public async Task SyncAsync_NoCandidate_IsReportedAsUnmatched()
    {
        GivenLetterboxd(true, new LetterboxdFilm("film-obscur", "Film Obscur", "1974"));
        GivenTmdbFindsNothing();

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal("Film Obscur (1974)", Assert.Single(outcome.UnmatchedTitles));
        Assert.Empty(outcome.PendingChoices);
        VerifyNothingAdded();
    }

    [Fact]
    public async Task SyncAsync_TrackedFilmGoneFromLetterboxd_IsRemoved()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", "the-polar-express"));
        GivenLetterboxd(true);

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(1, outcome.Removed);
        _watchlist.Verify(
            w => w.RemoveAsync(UserId, 5255, MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncAsync_FilmAddedInMoviePickerOnly_IsNeverRemoved()
    {
        GivenWatchlist(Item(5255, "Le Pôle express", null));
        GivenLetterboxd(true);

        var outcome = await _sut.SyncAsync(TheUser());

        Assert.Equal(0, outcome.Removed);
        _watchlist.Verify(
            w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
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

        Assert.Equal(0, outcome.Added);
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

        Assert.Equal(0, outcome.Added);
        Assert.Equal(0, outcome.Removed);
        _tmdb.Verify(
            t => t.SearchAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
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

        Assert.Equal(LetterboxdImportLimits.MaxRows + 4, outcome.TotalOnLetterboxd);
        Assert.Equal(4, outcome.TotalTruncated);
        Assert.Equal(LetterboxdImportLimits.MaxRows, outcome.UnmatchedTitles.Count);
    }
}
