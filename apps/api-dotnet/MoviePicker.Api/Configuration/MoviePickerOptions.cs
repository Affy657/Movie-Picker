namespace MoviePicker.Api.Configuration;

/// <summary>
/// Variables d'environnement : MONGODB_URI (obligatoire dès branchement Mongo), TMDB_API_KEY (optionnel),
/// ALLOWED_ORIGINS (obligatoire hors Development — liste d'origines CORS séparées par des virgules),
/// PUBLIC_WEB_BASE_URL (optionnel — Open Graph / page share-preview).
/// </summary>
public sealed class MoviePickerOptions
{
    public string MongoDbUri { get; set; } = string.Empty;

    public string? TmdbApiKey { get; set; }

    /// <summary>Région ISO pour TMDB watch providers (ex. FR). Variable : <c>TMDB_WATCH_REGION</c>.</summary>
    public string TmdbWatchProvidersRegion { get; set; } = "FR";

    /// <summary>Durée de cache enrichissement TMDB (heures). Variable : <c>TMDB_ENRICHMENT_CACHE_HOURS</c>.</summary>
    public int TmdbEnrichmentCacheHours { get; set; } = 24;

    /// <summary>Nombre max de résultats recherche enrichis en providers (limite appels TMDB à froid).</summary>
    public int TmdbSearchMaxWatchProviderLookups { get; set; } = 10;

    /// <summary>Parallélisme max pour enrichissement TMDB sur la liste films d’une soirée. Variable : <c>TMDB_LIST_ENRICHMENT_MAX_PARALLEL</c>.</summary>
    public int TmdbListEnrichmentMaxParallelism { get; set; } = 4;

    /// <summary>Active le cache d’affiches (Mongo ou mémoire). Variable : <c>POSTER_CACHE_ENABLED</c> (<c>0</c> / <c>false</c> pour désactiver).</summary>
    public bool PosterCacheEnabled { get; set; } = true;

    /// <summary>Durée de conservation logique des affiches (jours). Variable : <c>POSTER_CACHE_TTL_DAYS</c>.</summary>
    public int PosterCacheTtlDays { get; set; } = 30;

    /// <summary>Taille max d’une image acceptée (octets). Variable : <c>POSTER_CACHE_MAX_BYTES</c>.</summary>
    public int PosterCacheMaxBytes { get; set; } = 524_288;

    /// <summary>
    /// URL canonique du front (HTTPS, sans slash final), pour <c>og:url</c> / partage soirée. Variable : <c>PUBLIC_WEB_BASE_URL</c> (ex. <c>https://web.movie-picker.fr</c>).
    /// </summary>
    public string PublicWebBaseUrl { get; set; } = "https://web.movie-picker.fr";
}
