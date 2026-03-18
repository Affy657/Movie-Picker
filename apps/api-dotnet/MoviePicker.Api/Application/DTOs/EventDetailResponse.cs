using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventDetailResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public object? Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? WinnerMovieId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsHost { get; init; }
    public bool Terminé { get; init; }
    public WinnerMovieResponse? WinnerMovie { get; init; }
}
