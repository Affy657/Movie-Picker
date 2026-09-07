using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public sealed record TmdbSearchItem(
    int Id,
    MovieMediaType MediaType,
    string Title,
    string Year,
    string? PosterPath,
    double? VoteAverage = null,
    string? OriginalTitle = null,
    IReadOnlyList<int>? GenreIds = null);

public sealed record TmdbWatchProviderOffer(int ProviderId, string ProviderName, string? LogoUrl, string MonetizationType);

public sealed record TmdbMovieEnrichment(
    double? VoteAverage,
    IReadOnlyList<TmdbWatchProviderOffer> WatchProviders,
    string? TmdbWatchPageUrl,
    int? RuntimeMinutes,
    string? ReleaseDate = null);

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

public sealed record TmdbDiscoveryCriteria(
    IReadOnlyList<int>? GenreIds = null,
    int? YearFrom = null,
    int? YearTo = null,
    double? VoteMin = null,
    string? OriginalLanguage = null,
    int? RuntimeMin = null,
    int? RuntimeMax = null,
    string? SortBy = null,
    IReadOnlyList<int>? CompanyIds = null,
    int? VoteCountMin = null,
    IReadOnlyList<int>? WatchProviderIds = null,
    string? WatchRegion = null);

public sealed record TmdbCollectionSummary(
    int Id,
    string Name,
    string? Overview,
    string? PosterPath,
    int MovieCount);

public interface ITmdbMovieSearch
{
    Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(
        string query,
        bool allowSeries,
        IReadOnlyList<int>? genreIds = null,
        int? yearFrom = null,
        int? yearTo = null,
        double? voteMin = null,
        string? originalLanguage = null,
        int? runtimeMin = null,
        int? runtimeMax = null,
        CancellationToken ct = default);

    Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, MovieMediaType mediaType, string region, CancellationToken ct = default);

    Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetTrendingMoviesAsync(int pages, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetNowPlayingMoviesAsync(string region, int pages, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(TmdbDiscoveryCriteria criteria, int pages, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetRecommendationsAsync(
        int tmdbId,
        CancellationToken ct = default);

    Task<TmdbCollectionSummary?> GetCollectionAsync(int collectionId, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetCollectionMoviesAsync(int collectionId, CancellationToken ct = default);
}
