using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MovieWithScoreResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("eventId")]
    public string EventId { get; init; } = string.Empty;

    [JsonPropertyName("participantId")]
    public string ParticipantId { get; init; } = string.Empty;

    [JsonPropertyName("tmdbId")]
    public int TmdbId { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("year")]
    public string Year { get; init; } = string.Empty;

    [JsonPropertyName("posterPath")]
    public string? PosterPath { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; init; }

    [JsonPropertyName("proposerPseudo")]
    public string ProposerPseudo { get; init; } = string.Empty;

    [JsonPropertyName("score")]
    public int Score { get; init; }

    [JsonPropertyName("up")]
    public int Up { get; init; }

    [JsonPropertyName("down")]
    public int Down { get; init; }
}
