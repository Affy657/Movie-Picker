namespace MoviePicker.Api.Configuration;

/// <summary>
/// Variables d'environnement : MONGODB_URI (obligatoire dès branchement Mongo), TMDB_API_KEY (optionnel),
/// ALLOWED_ORIGINS (obligatoire hors Development — liste d'origines CORS séparées par des virgules).
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
}
