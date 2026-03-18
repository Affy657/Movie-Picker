using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class ParticipantResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
