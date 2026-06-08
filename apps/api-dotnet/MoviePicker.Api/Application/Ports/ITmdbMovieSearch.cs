using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public sealed record TmdbSearchItem(
    int Id,
    MovieMediaType MediaType,
    string Title,
    string Year,
    string? PosterPath,
    double? VoteAverage = null);

public sealed record TmdbWatchProviderOffer(int ProviderId, string ProviderName, string? LogoUrl, string MonetizationType);

public sealed record TmdbMovieEnrichment(
    double? VoteAverage,
    IReadOnlyList<TmdbWatchProviderOffer> WatchProviders,
    string? TmdbWatchPageUrl,
    int? RuntimeMinutes);

public sealed record TmdbMovieDetails(
    int Id,
    string Title,
    string? Overview,
    string? Tagline,
    string? Director,
    IReadOnlyList<string> Cast,
    int? Runtime,
    IReadOnlyList<string> Genres,
    IReadOnlyList<int> GenreIds,
    string? ReleaseDate,
    string? TrailerUrl = null);

public interface ITmdbMovieSearch
{
    Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, bool allowSeries, CancellationToken ct = default);

    Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, MovieMediaType mediaType, string region, CancellationToken ct = default);

    Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);
}
