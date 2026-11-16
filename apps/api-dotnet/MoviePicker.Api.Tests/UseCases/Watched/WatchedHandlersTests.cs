using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Application.UseCases.Watched;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.Watched.WatchedTestKit;

namespace MoviePicker.Api.Tests.UseCases.Watched;

public sealed class MarkWatchedHandlerTests
{
    private static readonly int[] DetailGenres = [28, 878];

    private readonly WatchedTestKit _kit = new();

    private static DateTimeOffset AtStoragePrecision(DateTimeOffset value) =>
        new(value.Ticks - (value.Ticks % TimeSpan.TicksPerMillisecond), value.Offset);

    [Fact]
    public async Task HandleAsync_NewTitle_IsWatchedElsewhere_DatedAtTheStoragePrecision_WithItsFacts()
    {
        _kit.Clock.Advance(TimeSpan.FromTicks(1_234_567));
        var expected = AtStoragePrecision(_kit.Clock.Now);
        var poster = "https://image.tmdb.org/t/p/w500/matrix.jpg";

        var status = await _kit.MarkHandler().HandleAsync(
            Me,
            Title(603, rating: 8, posterPath: poster, genreIds: [878, 28], runtimeMinutes: 136, voteAverage: 8.2));

        Assert.Equal(WatchedStatus.Elsewhere, status.Status);
        Assert.Equal(expected, status.WatchedAt);
        Assert.Equal(8, status.Rating);
        Assert.Null(status.NightSlug);
        Assert.Null(status.NightTitle);
        var stored = await _kit.Watched.GetAsync(Me, 603, MovieMediaType.Movie);
        Assert.NotNull(stored);
        Assert.Equal(
            ("Film 603", "1999", (string?)poster, (double?)8.2, (int?)136, expected, (int?)8, expected, expected),
            (stored!.Title, stored.Year, stored.PosterPath, stored.VoteAverage, stored.RuntimeMinutes, stored.WatchedAt, stored.Rating, stored.CreatedAt, stored.UpdatedAt));
        Assert.Equal([878, 28], stored.GenreIds);
    }

    [Fact]
    public async Task HandleAsync_MarkedByHand_IsAManualEntry_WithAManualRating()
    {
        await _kit.MarkAsync(603, rating: 8);
        await _kit.MarkAsync(680);

        var rated = await _kit.Watched.GetAsync(Me, 603, MovieMediaType.Movie);
        var unrated = await _kit.Watched.GetAsync(Me, 680, MovieMediaType.Movie);
        Assert.Equal((WatchedOrigin.Manual, (WatchedOrigin?)WatchedOrigin.Manual), (rated!.Origin, rated.RatingOrigin));
        Assert.Equal((WatchedOrigin.Manual, (WatchedOrigin?)null), (unrated!.Origin, unrated.RatingOrigin));
    }

    [Fact]
    public async Task HandleAsync_MissingFacts_AreTakenFromTmdb()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(603, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(603, "Matrix", null, null, null, [], 136, [], DetailGenres, "1999-03-31", VoteAverage: 8.2));

        await _kit.MarkAsync(603);

        var stored = await _kit.Watched.GetAsync(Me, 603, MovieMediaType.Movie);
        Assert.Equal(((int?)136, (double?)8.2), (stored!.RuntimeMinutes, stored.VoteAverage));
        Assert.Equal(DetailGenres, stored.GenreIds);
    }

    [Fact]
    public async Task HandleAsync_AlreadyWatchedElsewhere_KeepsTheDate_AndTakesANewRating()
    {
        var first = await _kit.MarkAsync(603, rating: 4);
        _kit.Clock.Advance(TimeSpan.FromDays(2));

        var rerated = await _kit.MarkAsync(603, rating: 6);
        var unrated = await _kit.MarkAsync(603);

        Assert.Equal(first.WatchedAt, rerated.WatchedAt);
        Assert.Equal(6, rerated.Rating);
        Assert.Equal(first.WatchedAt, unrated.WatchedAt);
        Assert.Equal(6, unrated.Rating);
        Assert.Single(await _kit.Watched.ListByOwnerAsync(Me));
    }

    [Fact]
    public async Task HandleAsync_RemovesThatTitleFromTheWatchlist_AndNothingElse()
    {
        foreach (var (tmdbId, mediaType) in new[] { (603, MovieMediaType.Movie), (603, MovieMediaType.Tv), (680, MovieMediaType.Movie) })
        {
            await _kit.Watchlist.AddAsync(new WatchlistItem
            {
                UserId = Me,
                TmdbId = tmdbId,
                MediaType = mediaType,
                Title = $"Film {tmdbId}",
                CreatedAt = Start
            });
        }

        await _kit.MarkAsync(603);

        var left = await _kit.Watchlist.ListByUserIdAsync(Me);
        Assert.Equal(
            [(603, MovieMediaType.Tv), (680, MovieMediaType.Movie)],
            left.Select(item => (item.TmdbId, item.MediaType)).Order());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public async Task HandleAsync_RatingOutOfRange_IsRejected_AndStoresNothing(int rating)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _kit.MarkAsync(603, rating: rating));

        Assert.Equal(ErrorCodes.RatingOutOfRange, ex.Reason);
        Assert.Empty(await _kit.Watched.ListByOwnerAsync(Me));
    }

    [Fact]
    public async Task HandleAsync_TitleWonAtANight_StaysANight_WithTheNightRating()
    {
        var night = await _kit.WinNightAsync(603, "2026-03-14", rating: 7);

        var status = await _kit.MarkAsync(603, rating: 3);

        Assert.Equal(WatchedStatus.Night, status.Status);
        Assert.Equal(7, status.Rating);
        Assert.Equal(NightStart("2026-03-14"), status.WatchedAt);
        Assert.Equal(night.Slug, status.NightSlug);
    }
}

public sealed class GetWatchedStatusHandlerTests
{
    private readonly WatchedTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_NeverWatched_IsNone_WithoutAnyDetail()
    {
        var status = await _kit.StatusAsync(603);

        Assert.Equal(WatchedStatus.None, status.Status);
        Assert.Null(status.WatchedAt);
        Assert.Null(status.Rating);
        Assert.Null(status.NightSlug);
        Assert.Null(status.NightTitle);
    }

    [Fact]
    public async Task HandleAsync_WatchedElsewhere_GivesItsDateAndRating_ForThatOwnerAndMediaTypeOnly()
    {
        var marked = await _kit.MarkAsync(603, rating: 9);

        var status = await _kit.StatusAsync(603);

        Assert.Equal(WatchedStatus.Elsewhere, status.Status);
        Assert.Equal(marked.WatchedAt, status.WatchedAt);
        Assert.Equal(9, status.Rating);
        Assert.Equal(WatchedStatus.None, (await _kit.StatusAsync(603, MovieMediaType.Tv)).Status);
        Assert.Equal(WatchedStatus.None, (await _kit.StatusAsync(603, owner: Someone)).Status);
    }

    [Fact]
    public async Task HandleAsync_WonAtSeveralNights_GivesTheLatestNight_AndTheLatestNightRating()
    {
        await _kit.WinNightAsync(603, "2026-01-10", rating: 7);
        var latest = await _kit.WinNightAsync(603, "2026-03-14", slug: "matrix-again");
        await _kit.MarkAsync(603, rating: 2);

        var status = await _kit.StatusAsync(603);

        Assert.Equal(WatchedStatus.Night, status.Status);
        Assert.Equal(NightStart("2026-03-14"), status.WatchedAt);
        Assert.Equal(7, status.Rating);
        Assert.Equal("matrix-again", status.NightSlug);
        Assert.Equal(latest.Title, status.NightTitle);
    }

    [Fact]
    public async Task HandleAsync_NightWithoutRating_TakesTheRatingGivenElsewhere()
    {
        await _kit.WinNightAsync(603, "2026-03-14");
        await _kit.MarkAsync(603, rating: 5);

        var status = await _kit.StatusAsync(603);

        Assert.Equal(WatchedStatus.Night, status.Status);
        Assert.Equal(5, status.Rating);
    }

    [Fact]
    public async Task HandleAsync_ReadsOnlyWhatConcernsThatTitle_NotTheWholeHistory()
    {
        await _kit.WinNightAsync(603, "2026-01-10", rating: 7);
        await _kit.WinNightAsync(680, "2026-02-10", rating: 4);
        await _kit.JoinNightWonByAnotherFilmAsync(603, "2026-02-01");
        await _kit.MarkAsync(550, rating: 9);
        var watched = new Mock<IWatchedTitleRepository>();
        watched
            .Setup(w => w.GetAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .Returns((string owner, int tmdbId, MovieMediaType mediaType, CancellationToken ct) => _kit.Watched.GetAsync(owner, tmdbId, mediaType, ct));
        var movies = new Mock<IMovieRepository>();
        movies
            .Setup(m => m.ListByEventIdsAndTmdbIdAsync(
                It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .Returns((IReadOnlyCollection<string> eventIds, int tmdbId, MovieMediaType mediaType, CancellationToken ct) =>
                _kit.Movies.ListByEventIdsAndTmdbIdAsync(eventIds, tmdbId, mediaType, ct));
        var history = new WatchedHistoryReader(_kit.Participants, _kit.Events, movies.Object, _kit.Ratings, watched.Object, _kit.Clock);

        var night = await new GetWatchedStatusHandler(history).HandleAsync(Me, 603, MovieMediaType.Movie);
        var elsewhere = await new GetWatchedStatusHandler(history).HandleAsync(Me, 550, MovieMediaType.Movie);

        Assert.Equal((WatchedStatus.Night, 7, NightStart("2026-01-10")), (night.Status, night.Rating, night.WatchedAt));
        Assert.Equal((WatchedStatus.Elsewhere, 9), (elsewhere.Status, elsewhere.Rating));
        watched.Verify(w => w.ListByOwnerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        movies.Verify(m => m.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NightsThatDoNotCount_LeaveTheTitleUnwatched()
    {
        await _kit.WinNightAsync(603, "2026-12-24", closed: false);
        await _kit.JoinNightWonByAnotherFilmAsync(603, "2026-02-01");
        await _kit.WinNightAsync(603, "2026-03-14", owner: Someone);
        await _kit.WinNightAsync(603, "2026-04-01", mediaType: MovieMediaType.Tv);

        var status = await _kit.StatusAsync(603);

        Assert.Equal(WatchedStatus.None, status.Status);
    }
}

public sealed class SetWatchedRatingHandlerTests
{
    private readonly WatchedTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_SetsThenClearsTheRating_WithoutMovingTheDate()
    {
        var marked = await _kit.MarkAsync(603);
        _kit.Clock.Advance(TimeSpan.FromHours(1));

        var rated = await _kit.RatingHandler().HandleAsync(Me, 603, MovieMediaType.Movie, 10);
        var cleared = await _kit.RatingHandler().HandleAsync(Me, 603, MovieMediaType.Movie, null);

        Assert.Equal((WatchedStatus.Elsewhere, (int?)10, marked.WatchedAt), (rated.Status, rated.Rating, rated.WatchedAt));
        Assert.Null(cleared.Rating);
        Assert.Equal(_kit.Clock.Now, (await _kit.Watched.GetAsync(Me, 603, MovieMediaType.Movie))!.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_TitleNotWatchedElsewhere_IsNotFound_EvenWhenWonAtANight()
    {
        await _kit.WinNightAsync(603, "2026-03-14");
        await _kit.MarkAsync(603, mediaType: MovieMediaType.Tv);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _kit.RatingHandler().HandleAsync(Me, 603, MovieMediaType.Movie, 8));

        Assert.Equal(ErrorCodes.WatchedTitleNotFound, ex.Reason);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public async Task HandleAsync_RatingOutOfRange_IsRejected(int rating)
    {
        await _kit.MarkAsync(603, rating: 4);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _kit.RatingHandler().HandleAsync(Me, 603, MovieMediaType.Movie, rating));

        Assert.Equal(ErrorCodes.RatingOutOfRange, ex.Reason);
        Assert.Equal(4, (await _kit.StatusAsync(603)).Rating);
    }
}

public sealed class UnmarkWatchedHandlerTests
{
    private readonly WatchedTestKit _kit = new();

    [Fact]
    public async Task HandleAsync_ForgetsTheTitleWatchedElsewhere_AndCanBeRepeated()
    {
        await _kit.MarkAsync(603);
        await _kit.MarkAsync(603, mediaType: MovieMediaType.Tv);

        await _kit.UnmarkHandler().HandleAsync(Me, 603, MovieMediaType.Movie);
        await _kit.UnmarkHandler().HandleAsync(Me, 603, MovieMediaType.Movie);

        Assert.Equal(WatchedStatus.None, (await _kit.StatusAsync(603)).Status);
        Assert.Equal(WatchedStatus.Elsewhere, (await _kit.StatusAsync(603, MovieMediaType.Tv)).Status);
    }

    [Fact]
    public async Task HandleAsync_NeverTouchesANight_NorPutsTheTitleBackInTheWatchlist()
    {
        await _kit.WinNightAsync(603, "2026-03-14", rating: 7);
        await _kit.MarkAsync(603, rating: 2);

        await _kit.UnmarkHandler().HandleAsync(Me, 603, MovieMediaType.Movie);

        var status = await _kit.StatusAsync(603);
        Assert.Equal((WatchedStatus.Night, (int?)7), (status.Status, status.Rating));
        Assert.Null(await _kit.Watched.GetAsync(Me, 603, MovieMediaType.Movie));
        Assert.Empty(await _kit.Watchlist.ListByUserIdAsync(Me));
    }
}
