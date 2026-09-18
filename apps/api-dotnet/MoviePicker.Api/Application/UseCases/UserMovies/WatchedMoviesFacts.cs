using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

internal static class WatchedMoviesFacts
{
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
