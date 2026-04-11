using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MovieWithScoreResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public int TmdbId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public string ProposerPseudo { get; init; } = string.Empty;
    public int Score { get; init; }
    public int Up { get; init; }
    public int Down { get; init; }

    /// <summary>Agrégats de réactions (V1 §6) ; liste vide si aucune.</summary>
    public IReadOnlyList<MovieReactionAggregateResponse> Reactions { get; init; } = Array.Empty<MovieReactionAggregateResponse>();

    /// <summary>Note moyenne TMDB (indicatif, V1 §7).</summary>
    public double? VoteAverage { get; init; }
    public IReadOnlyList<WatchProviderOfferResponse> WatchProviders { get; init; } =
        Array.Empty<WatchProviderOfferResponse>();
    public string? TmdbWatchPageUrl { get; init; }
}
