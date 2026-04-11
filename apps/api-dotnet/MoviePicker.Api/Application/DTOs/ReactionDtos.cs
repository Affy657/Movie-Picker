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
    public string EventId { get; init; } = string.Empty;
    public string MovieId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public string ReactionId { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed class MovieReactionAggregateResponse
{
    public string ReactionId { get; init; } = string.Empty;

    /// <summary>Nombre total de participants ayant cette réaction (peut dépasser la longueur de <see cref="Pseudos"/>).</summary>
    public int Count { get; init; }

    /// <summary>Pseudos des participants ayant posé cette réaction (ordre non garanti, taille plafonnée côté API).</summary>
    public IReadOnlyList<string> Pseudos { get; init; } = Array.Empty<string>();
}

public sealed class MovieReactionsResponse
{
    public string MovieId { get; init; } = string.Empty;
    public IReadOnlyList<MovieReactionAggregateResponse> Reactions { get; init; } = Array.Empty<MovieReactionAggregateResponse>();
}
