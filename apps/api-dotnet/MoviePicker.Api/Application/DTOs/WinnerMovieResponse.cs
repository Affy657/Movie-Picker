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

    public static WinnerMovieResponse Of(Event evt, Movie m, string? posterPath)
    {
        var shown = evt.HideProposalTime(m);
        return new()
        {
            Id = shown.Id,
            EventId = shown.EventId,
            ParticipantId = evt.HasAnonymousProposals ? string.Empty : shown.ParticipantId,
            TmdbId = shown.TmdbId,
            Title = shown.Title,
            Year = shown.Year,
            PosterPath = posterPath ?? shown.PosterPath,
            CreatedAt = shown.CreatedAt,
            UpdatedAt = shown.UpdatedAt
        };
    }
}
