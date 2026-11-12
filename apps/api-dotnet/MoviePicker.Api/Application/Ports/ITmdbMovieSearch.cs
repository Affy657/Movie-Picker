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
    string? TrailerUrl = null,
    double? VoteAverage = null,
    string? PosterUrl = null,
    string? BackdropUrl = null,
    int? SeasonCount = null,
    int? EpisodeCount = null,
    TmdbMovieDetailsExtras? Extras = null);

public sealed record TmdbMovieDetailsExtras(
    string? OriginalTitle,
    string? OriginalLanguage,
    IReadOnlyList<string> ProductionCountries,
    long? Budget,
    int? VoteCount,
    string? Certification,
    TmdbCollectionReference? Collection,
    int? DirectorId,
    IReadOnlyList<TmdbCastMember> CastMembers,
    IReadOnlyList<TmdbCrewCredit> Crew,
    IReadOnlyList<TmdbVideo> Videos);

public sealed record TmdbCollectionReference(int Id, string Name);

public sealed record TmdbCastMember(string Name, string? Character, string? ProfileUrl);

public sealed record TmdbCrewCredit(string Job, string Name);

public sealed record TmdbVideo(string Key, string Name, string Type, string? Language);

public static class TmdbCrewJobs
{
    public const string Creator = "creator";
    public const string Director = "director";
    public const string Writer = "writer";
    public const string Composer = "composer";
    public const string Photography = "photography";
}

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
    int MovieCount,
    IReadOnlyList<string> PartPosterPaths);

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

    Task<IReadOnlyList<TmdbSearchItem>> SearchTitlesAsync(
        string query,
        bool allowSeries,
        int? yearFrom = null,
        int? yearTo = null,
        CancellationToken ct = default);

    Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, MovieMediaType mediaType, string region, CancellationToken ct = default);

    Task<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>> GetEnrichmentsAsync(
        IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)> keys,
        string region,
        CancellationToken ct = default);

    Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetTrendingMoviesAsync(int pages, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetNowPlayingMoviesAsync(string region, int pages, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(TmdbDiscoveryCriteria criteria, int pages, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetRecommendationsAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default);

    Task<TmdbCollectionSummary?> GetCollectionAsync(int collectionId, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetCollectionMoviesAsync(int collectionId, CancellationToken ct = default);

    Task<IReadOnlyList<TmdbSearchItem>> GetDirectedMoviesAsync(int personId, CancellationToken ct = default);
}
