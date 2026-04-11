using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class VoteResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string MovieId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public int Value { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
