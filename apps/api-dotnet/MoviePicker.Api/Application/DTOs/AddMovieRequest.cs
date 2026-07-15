using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class AddMovieRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int TmdbId { get; init; }

    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;

    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(10)]
    public string Year { get; init; } = string.Empty;

    public string? PosterPath { get; init; }

    [MaxLength(140)]
    public string? PitchNote { get; init; }

    [Required]
    [StringLength(24, MinimumLength = 24)]
    public string ParticipantId { get; init; } = string.Empty;
}
