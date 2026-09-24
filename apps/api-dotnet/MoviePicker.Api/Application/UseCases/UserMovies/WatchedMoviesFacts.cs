using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

internal static class WatchedMoviesFacts
{
    public static IEnumerable<(string MovieId, DateTimeOffset WatchedAt)> FinishedWinners(
        IEnumerable<Event> events,
        DateTimeOffset now) =>
        events
            .Where(e => e.HasWinner && e.IsFinished(now))
            .SelectMany(e => e.GetWinnerMovieIds().Select(id => (MovieId: id, WatchedAt: WatchedAtOf(e))));

    public static async Task<UserWatchedMoviesResponse> ToResponseAsync(
        IReadOnlyList<(string MovieId, DateTimeOffset WatchedAt)> watched,
        IMovieRepository movieRepository,
        ITmdbMovieSearch tmdb,
        MoviePickerOptions options,
        CancellationToken ct)
    {
        if (watched.Count == 0)
            return new UserWatchedMoviesResponse { Items = [] };

        var movies = await movieRepository.ListByIdsAsync(watched.Select(x => x.MovieId).Distinct().ToList(), ct);
        var movieById = movies.ToDictionary(m => m.Id);

        var items = watched
            .Select(x => (x.WatchedAt, Movie: movieById.GetValueOrDefault(x.MovieId)))
            .Where(x => x.Movie is not null)
            .Select(x => new UserWatchedMovieItem
            {
                TmdbId = x.Movie!.TmdbId,
                Title = x.Movie.Title,
                Year = x.Movie.Year,
                PosterPath = x.Movie.PosterPath,
                GenreIds = x.Movie.GenreIds,
                MediaType = x.Movie.MediaType,
                WatchedAt = x.WatchedAt,
            })
            .ToList();

        return new UserWatchedMoviesResponse { Items = await WithTmdbFactsAsync(items, tmdb, options, ct) };
    }

    public static async Task<IReadOnlyList<UserWatchedMovieItem>> WithTmdbFactsAsync(
        IReadOnlyList<UserWatchedMovieItem> items,
        ITmdbMovieSearch tmdb,
        MoviePickerOptions options,
        CancellationToken ct)
    {
        if (items.Count == 0 || !options.HasTmdbCredentials)
            return items;

        var region = string.IsNullOrWhiteSpace(options.TmdbWatchProvidersRegion)
            ? "FR"
            : options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var keys = items.Select(item => (item.TmdbId, item.MediaType)).Distinct().ToList();
        var enrichments = await tmdb.GetEnrichmentsAsync(keys, region, ct);
        if (enrichments.Count == 0)
            return items;

        return items
            .Select(item => enrichments.TryGetValue((item.TmdbId, item.MediaType), out var enrichment) && enrichment is not null
                ? WithFacts(item, enrichment)
                : item)
            .ToList();
    }

    private static DateTimeOffset WatchedAtOf(Event evt) =>
        EventSchedule.TryGetStartUtc(evt.Date, evt.Time, out var start) ? start : evt.ClosedAt ?? evt.UpdatedAt;

    private static UserWatchedMovieItem WithFacts(UserWatchedMovieItem item, TmdbMovieEnrichment enrichment) => new()
    {
        TmdbId = item.TmdbId,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = enrichment.VoteAverage,
        RuntimeMinutes = enrichment.RuntimeMinutes,
        GenreIds = item.GenreIds,
        MediaType = item.MediaType,
        WatchedAt = item.WatchedAt,
    };
}
