using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

internal static class TmdbEnrichments
{
    public static async Task<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>> LoadAsync(
        IEnumerable<(int TmdbId, MovieMediaType MediaType)> films,
        ITmdbMovieSearch tmdb,
        MoviePickerOptions options,
        CatalogLanguage language,
        CancellationToken ct)
    {
        var keys = films.Distinct().ToList();
        if (keys.Count == 0 || !options.HasTmdbCredentials)
            return new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>();

        var region = WatchRegion.Of(options.TmdbWatchProvidersRegion);
        return await tmdb.GetEnrichmentsAsync(keys, region, language, ct);
    }
}
