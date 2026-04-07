using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class AddReactionRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;

    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string ReactionId { get; init; } = string.Empty;
}

public sealed class RemoveReactionRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;
}

public sealed class ReactionResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("eventId")]
    public string EventId { get; init; } = string.Empty;

    [JsonPropertyName("movieId")]
    public string MovieId { get; init; } = string.Empty;

    [JsonPropertyName("participantId")]
    public string ParticipantId { get; init; } = string.Empty;

    [JsonPropertyName("reactionId")]
    public string ReactionId { get; init; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed class MovieReactionAggregateResponse
{
    [JsonPropertyName("reactionId")]
    public string ReactionId { get; init; } = string.Empty;

    /// <summary>Nombre total de participants ayant cette réaction (peut dépasser la longueur de <see cref="Pseudos"/>).</summary>
    [JsonPropertyName("count")]
    public int Count { get; init; }

    /// <summary>Pseudos des participants ayant posé cette réaction (ordre non garanti, taille plafonnée côté API).</summary>
    [JsonPropertyName("pseudos")]
    public IReadOnlyList<string> Pseudos { get; init; } = Array.Empty<string>();
}

public sealed class MovieReactionsResponse
{
    [JsonPropertyName("movieId")]
    public string MovieId { get; init; } = string.Empty;

    [JsonPropertyName("reactions")]
    public IReadOnlyList<MovieReactionAggregateResponse> Reactions { get; init; } = Array.Empty<MovieReactionAggregateResponse>();
}
