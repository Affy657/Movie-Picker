using System.Text.Json.Serialization;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class WinnerMovieResponse
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

    public static WinnerMovieResponse FromDomain(Movie m, string? posterPath = null) => new()
    {
        Id = m.Id,
        EventId = m.EventId,
        ParticipantId = m.ParticipantId,
        TmdbId = m.TmdbId,
        Title = m.Title,
        Year = m.Year,
        PosterPath = posterPath ?? m.PosterPath,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt
    };
}
