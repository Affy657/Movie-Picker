namespace MoviePicker.Api.Configuration;

/// <summary>
/// Variables d'environnement : MONGODB_URI (obligatoire dès branchement Mongo), TMDB_API_KEY (optionnel).
/// </summary>
public sealed class MoviePickerOptions
{
    public string MongoDbUri { get; set; } = string.Empty;

    public string? TmdbApiKey { get; set; }
}
