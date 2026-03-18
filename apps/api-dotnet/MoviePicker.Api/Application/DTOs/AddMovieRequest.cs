using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed class AddMovieRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int TmdbId { get; init; }

    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public string Title { get; init; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Year { get; init; } = string.Empty;

    public string? PosterPath { get; init; }

    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;
}
