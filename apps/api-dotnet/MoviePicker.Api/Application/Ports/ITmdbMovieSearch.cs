namespace MoviePicker.Api.Application.Ports;

/// <summary>Ligne brute issue de l’API TMDB search/movie (avant enrichissement providers).</summary>
public sealed record TmdbSearchItem(int Id, string Title, string Year, string? PosterPath, double? VoteAverage = null);

public sealed record TmdbWatchProviderOffer(int ProviderId, string ProviderName, string? LogoUrl, string MonetizationType);

/// <summary>Données TMDB mises en cache (détail + watch providers) pour un film et une région.</summary>
public sealed record TmdbMovieEnrichment(
    double? VoteAverage,
    IReadOnlyList<TmdbWatchProviderOffer> WatchProviders,
    string? TmdbWatchPageUrl);

public interface ITmdbMovieSearch
{
    Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, CancellationToken ct = default);

    /// <summary>
    /// Détail TMDB + watch providers pour la région ; résultat mis en cache (TTL configuré).
    /// Retourne <c>null</c> si indisponible (clé absente, erreur HTTP, JSON inattendu).
    /// </summary>
    Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, string region, CancellationToken ct = default);
}
