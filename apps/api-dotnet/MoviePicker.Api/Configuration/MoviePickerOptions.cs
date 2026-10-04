namespace MoviePicker.Api.Configuration;

public sealed class MoviePickerOptions
{
    public string MongoDbUri { get; set; } = string.Empty;

    public string? TmdbApiKey { get; set; }

    public string? TmdbReadAccessToken { get; set; }

    public bool HasTmdbCredentials =>
        !string.IsNullOrWhiteSpace(TmdbReadAccessToken) || !string.IsNullOrWhiteSpace(TmdbApiKey);

    public string TmdbWatchProvidersRegion { get; set; } = "FR";

    public int TmdbEnrichmentCacheHours { get; set; } = 24;

    public int TmdbHttpTimeoutSeconds { get; set; } = 3;

    public int TmdbFailureCacheMinutes { get; set; } = 5;

    public int MovieShowcaseCacheHours { get; set; } = 6;

    public int MovieShowcaseEnrichedCount { get; set; } = 24;

    public int TmdbSearchMaxWatchProviderLookups { get; set; } = 10;

    public int TmdbListEnrichmentMaxParallelism { get; set; } = 8;

    public int TmdbBatchEnrichmentMaxFetch { get; set; } = 40;

    public bool PosterCacheEnabled { get; set; } = true;

    public int PosterCacheTtlDays { get; set; } = 30;

    public int PosterCacheMaxBytes { get; set; } = 524_288;

    public int PosterCacheMaxEntries { get; set; } = 2_000;

    public string PublicWebBaseUrl { get; set; } = "https://www.movie-picker.fr";

    public string ResolvedWebBaseUrl() =>
        string.IsNullOrWhiteSpace(PublicWebBaseUrl)
            ? "https://www.movie-picker.fr"
            : PublicWebBaseUrl.Trim().TrimEnd('/');

    public string EmailProvider { get; set; } = "log";

    public string EmailFromAddress { get; set; } = "noreply@movie-picker.fr";

    public string EmailFromName { get; set; } = "Movie Picker";

    public string? ResendApiKey { get; set; }

    public string ResendApiBaseUrl { get; set; } = "https://api.resend.com";

    public string? VapidPublicKey { get; set; }

    public string? VapidPrivateKey { get; set; }

    public string VapidSubject { get; set; } = "mailto:noreply@movie-picker.fr";

    public string? KofiWebhookToken { get; set; }

    public string? SchedulerOidcAudience { get; set; }

    public string? SchedulerOidcServiceAccount { get; set; }

    public bool InProcessRemindersEnabled { get; set; }

    public string? GitHubToken { get; set; }

    public string GitHubRepoOwner { get; set; } = "Affy657";

    public string GitHubRepoName { get; set; } = "Movie-Picker";

    public string GitHubApiBaseUrl { get; set; } = "https://api.github.com/";

    public string GitHubAttachmentsBranch { get; set; } = "feedback-attachments";
}
