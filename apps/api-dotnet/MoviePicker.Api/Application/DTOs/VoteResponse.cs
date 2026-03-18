using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class VoteResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("eventId")]
    public string EventId { get; init; } = string.Empty;

    [JsonPropertyName("movieId")]
    public string MovieId { get; init; } = string.Empty;

    [JsonPropertyName("participantId")]
    public string ParticipantId { get; init; } = string.Empty;

    [JsonPropertyName("value")]
    public int Value { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; init; }
}
