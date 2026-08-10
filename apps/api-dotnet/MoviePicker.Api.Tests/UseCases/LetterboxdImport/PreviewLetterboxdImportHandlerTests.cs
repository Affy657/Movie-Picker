using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class PreviewLetterboxdImportHandlerTests
{
    private const string UserId = "u1";

    private const string LetterboxdUsername = "affy657";

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ILetterboxdWatchlistClient> _letterboxd = new();
    private readonly PreviewLetterboxdImportHandler _sut;

    public PreviewLetterboxdImportHandlerTests()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)[]);
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = UserId, Email = "a@b.c", LetterboxdUsername = LetterboxdUsername });
        _sut = new PreviewLetterboxdImportHandler(
            _watchlist.Object,
            _tmdb.Object,
            _users.Object,
            _letterboxd.Object);
    }

    private static string Csv(params (string Title, string Year)[] rows)
    {
        var lines = new List<string> { "Name,Year" };
        lines.AddRange(rows.Select(r => $"{r.Title},{r.Year}"));
        return string.Join("\n", lines);
    }

    [Fact]
    public async Task HandleAsync_RowAlreadyInWatchlist_SkipsTmdbSearch()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)
            [
                new WatchlistItem
                {
                    Id = "1",
                    UserId = UserId,
                    TmdbId = 1,
                    MediaType = MovieMediaType.Movie,
                    Title = "Matrix",
                    Year = "1999",
                    CreatedAt = DateTimeOffset.UtcNow
                }
            ]);

        var result = await _sut.HandleAsync(UserId, new LetterboxdImportPreviewRequest { Csv = Csv(("matrix", "1999")) });

        Assert.True(result.Rows[0].AlreadyInWatchlist);
        Assert.Empty(result.Rows[0].Candidates);
        _watchlist.Verify(
            w => w.ListByUserIdAsync(UserId, int.MaxValue, It.IsAny<CancellationToken>()),
            Times.Once);
        _tmdb.Verify(
            t => t.SearchAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_RowNotInWatchlist_SearchesTmdbWithYearTolerance()
    {
        _tmdb
            .Setup(t => t.SearchAsync(
                "Inception", false, null, 2009, 2011, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)
            [
                new TmdbSearchItem(27205, MovieMediaType.Movie, "Inception", "2010", "/poster.jpg", 8.4)
            ]);

        var result = await _sut.HandleAsync(UserId, new LetterboxdImportPreviewRequest { Csv = Csv(("Inception", "2010")) });

        Assert.False(result.Rows[0].AlreadyInWatchlist);
        Assert.Single(result.Rows[0].Candidates);
        Assert.Equal(27205, result.Rows[0].Candidates[0].TmdbId);
        Assert.Equal(8.4, result.Rows[0].Candidates[0].VoteAverage);
    }

    [Fact]
    public async Task HandleAsync_TmdbThrows_ReturnsEmptyCandidatesInsteadOfFailing()
    {
        _tmdb
            .Setup(t => t.SearchAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("boom"));

        var result = await _sut.HandleAsync(UserId, new LetterboxdImportPreviewRequest { Csv = Csv(("Inception", "2010")) });

        Assert.Empty(result.Rows[0].Candidates);
    }

    [Fact]
    public async Task HandleAsync_PropagatesParseCounts()
    {
        var lines = new List<string> { "Name,Year" };
        for (var i = 0; i < LetterboxdCsvParser.MaxRows + 3; i++)
            lines.Add($"Film {i},2000");
        _tmdb
            .Setup(t => t.SearchAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[]);

        var result = await _sut.HandleAsync(
            UserId,
            new LetterboxdImportPreviewRequest { Csv = string.Join("\n", lines) });

        Assert.Equal(LetterboxdCsvParser.MaxRows + 3, result.TotalParsed);
        Assert.Equal(3, result.TotalTruncated);
        Assert.Equal(LetterboxdCsvParser.MaxRows, result.Rows.Count);
    }

    private void GivenLetterboxdWatchlist(bool isComplete, params LetterboxdFilm[] films) =>
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(LetterboxdUsername, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdWatchlistSnapshot(films, isComplete));

    [Fact]
    public async Task HandleFromAccountAsync_ReturnsRowsCarryingTheLetterboxdSlug()
    {
        GivenLetterboxdWatchlist(true, new LetterboxdFilm("inception", "Inception", "2010"));
        _tmdb
            .Setup(t => t.SearchAsync(
                "Inception", false, null, 2009, 2011, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)
            [
                new TmdbSearchItem(27205, MovieMediaType.Movie, "Inception", "2010", "/poster.jpg", 8.4)
            ]);

        var result = await _sut.HandleFromAccountAsync(UserId);

        var row = Assert.Single(result.Rows);
        Assert.Equal("inception", row.LetterboxdSlug);
        Assert.Equal("Inception", row.Title);
        Assert.Equal(27205, Assert.Single(row.Candidates).TmdbId);
        Assert.Equal(1, result.TotalParsed);
        Assert.Equal(0, result.TotalTruncated);
    }

    [Fact]
    public async Task HandleFromAccountAsync_SlugAlreadyTracked_SkipsTmdbSearch()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)
            [
                new WatchlistItem
                {
                    Id = "1",
                    UserId = UserId,
                    TmdbId = 27205,
                    MediaType = MovieMediaType.Movie,
                    Title = "Le Titre Français",
                    Year = "2010",
                    LetterboxdSlug = "Inception",
                    CreatedAt = DateTimeOffset.UtcNow
                }
            ]);
        GivenLetterboxdWatchlist(true, new LetterboxdFilm("inception", "Inception", "2010"));

        var result = await _sut.HandleFromAccountAsync(UserId);

        Assert.True(Assert.Single(result.Rows).AlreadyInWatchlist);
        _tmdb.Verify(
            t => t.SearchAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<IReadOnlyList<int>?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<double?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleFromAccountAsync_NoUsernameConfigured_ThrowsBadRequest()
    {
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = UserId, Email = "a@b.c", LetterboxdUsername = null });

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleFromAccountAsync(UserId));
    }

    [Fact]
    public async Task HandleFromAccountAsync_IncompleteSnapshot_ThrowsBadRequest()
    {
        GivenLetterboxdWatchlist(false);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleFromAccountAsync(UserId));
    }

    [Fact]
    public async Task HandleFromAccountAsync_EmptyLetterboxdWatchlist_ReturnsNoRow()
    {
        GivenLetterboxdWatchlist(true);

        var result = await _sut.HandleFromAccountAsync(UserId);

        Assert.Empty(result.Rows);
        Assert.Equal(0, result.TotalParsed);
    }
}
