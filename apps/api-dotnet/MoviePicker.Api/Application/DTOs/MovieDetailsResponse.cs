namespace MoviePicker.Api.Application.DTOs;

/// <summary>Réponse <c>GET /api/v1/movies/tmdb/{tmdbId}/details</c> — synopsis, équipe, casting.</summary>
public sealed class MovieDetailsResponse
{
    public int TmdbId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Overview { get; init; }
    public string? Tagline { get; init; }
    public string? Director { get; init; }
    public IReadOnlyList<string> Cast { get; init; } = Array.Empty<string>();
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<string> Genres { get; init; } = Array.Empty<string>();
    public string? ReleaseDate { get; init; }
}
