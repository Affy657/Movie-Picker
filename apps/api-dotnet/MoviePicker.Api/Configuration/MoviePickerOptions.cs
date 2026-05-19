namespace MoviePicker.Api.Configuration;

public sealed class MoviePickerOptions
{
    public string MongoDbUri { get; set; } = string.Empty;

    public string? TmdbApiKey { get; set; }

    public string TmdbWatchProvidersRegion { get; set; } = "FR";

    public int TmdbEnrichmentCacheHours { get; set; } = 24;

    public int TmdbSearchMaxWatchProviderLookups { get; set; } = 10;

    public int TmdbListEnrichmentMaxParallelism { get; set; } = 4;

    public bool PosterCacheEnabled { get; set; } = true;

    public int PosterCacheTtlDays { get; set; } = 30;

    public int PosterCacheMaxBytes { get; set; } = 524_288;

    public string PublicWebBaseUrl { get; set; } = "https://web.movie-picker.fr";

    public string EmailProvider { get; set; } = "log";

    public string EmailFromAddress { get; set; } = "noreply@movie-picker.fr";

    public string EmailFromName { get; set; } = "Movie Picker";

    public string? ResendApiKey { get; set; }

    public string ResendApiBaseUrl { get; set; } = "https://api.resend.com";
}
