using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.UseCases.Watched;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.Watched.WatchedTestKit;

namespace MoviePicker.Api.Tests.UseCases.UserMovies;

public sealed class WatchedHistoryReaderTests
{
    private static readonly int[] FixtureTmdbIds = [603, 1399, 680, 1396, 278, 279, 550, 13, 11];

    private readonly WatchedTestKit _kit = new();

    [Fact]
    public async Task ReadKeysAsync_HoldsExactlyTheTitlesTheFullHistoryCountsAsWatched()
    {
        await _kit.MarkAsync(603);
        await _kit.MarkAsync(1399, mediaType: MovieMediaType.Tv);
        await _kit.MarkAsync(680);
        await _kit.WinNightAsync(680, "2026-09-12");
        await _kit.WinNightAsync(1396, "2026-10-03", mediaType: MovieMediaType.Tv);
        await _kit.JoinNightWonByAnotherFilmAsync(278, "2026-10-17");
        await _kit.WinNightAsync(550, "2026-12-24", closed: false);
        await _kit.WinNightAsync(13, "2026-08-01", owner: Someone);
        await _kit.MarkAsync(11, owner: Someone);
        (int TmdbId, MovieMediaType MediaType)[] candidates =
        [
            .. FixtureTmdbIds.SelectMany(tmdbId => new[] { (tmdbId, MovieMediaType.Movie), (tmdbId, MovieMediaType.Tv) })
        ];

        var history = await _kit.History.ReadRatedAsync(Me);
        var keys = await _kit.History.ReadKeysAsync(Me);

        var watchedInHistory = history.Films.Select(film => (film.TmdbId, film.MediaType)).ToHashSet();
        Assert.Equal(
            [(279, MovieMediaType.Movie), (603, MovieMediaType.Movie), (680, MovieMediaType.Movie), (1396, MovieMediaType.Tv), (1399, MovieMediaType.Tv)],
            watchedInHistory.OrderBy(key => key.TmdbId));
        Assert.Equal(
            candidates.Where(watchedInHistory.Contains),
            candidates.Where(key => keys.Contains(key.TmdbId, key.MediaType)));
        Assert.Equal(
            watchedInHistory.Count,
            keys.CountAmong(candidates.Select(key => new MovieListTitle(key.TmdbId, key.MediaType))));
    }
}
