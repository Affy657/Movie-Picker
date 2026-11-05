using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class SetMovieRatingRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;

    [Range(MovieRating.MinValue, MovieRating.MaxValue)]
    public int Value { get; init; }
}

public sealed class DeleteMovieRatingRequest
{
    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;
}

public sealed class MovieRatingResponse
{
    public string ParticipantId { get; init; } = string.Empty;
    public int Value { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public static MovieRatingResponse FromDomain(MovieRating rating) => new()
    {
        ParticipantId = rating.ParticipantId,
        Value = rating.Value,
        UpdatedAt = rating.UpdatedAt
    };
}
